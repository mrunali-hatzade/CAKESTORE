# CAKESTORE LOOP 3.2 PRE-IMPLEMENTATION FULL-STACK AUDIT: SUBSCRIPTION + BILLING + RENEWAL

## 1. Executive Summary
The subscription and billing system is partially implemented but heavily hardcoded and relies on dummy/mock data for critical payment initiation steps. The `subscription_plans` table exists in the database but is completely ignored by both frontend and backend logic. Pricing is hardcoded in both frontend components and backend controllers (₹350/month, ₹3,500/year). Razorpay integration lacks real server-side order creation. Historical price preservation works accidentally because the backend hardcodes the price on payment completion instead of looking up dynamic values. 

## 2. Existing Architecture
- **Source of Truth**: Hardcoded constants in code, not the database.
- **Frontend**: Next.js UI hardcodes plan prices, names, and limits.
- **Backend**: `OwnerPaymentController` ignores database plans and hardcodes amounts based on the `billingCycle` string from the frontend.
- **Payment Gateway**: Razorpay signature verification is present, but Razorpay order creation is completely missing (dummy UUIDs are generated instead).

## 3. Database/Flyway
**STATUS: PARTIAL**
- `subscription_plans` table exists (V3 migration). Includes `id`, `name`, `price`, `duration_days`, etc.
- `subscriptions` table exists (V1) and has a `plan_id` foreign key (V3).
- `payments` table exists (V1).
- **Missing**: No robust way to track payment webhook events or Razorpay order history table (relies purely on `payments.provider_order_id`).

## 4. Subscription Plans
**STATUS: BROKEN / HARDCODED**
- **Evidence**: `OwnerPaymentController.java` lines 112-114 and 155-157.
- The backend completely bypasses `subscriptionPlanRepository`. It resolves price using `billingCycle` ("monthly" = 350.00, "yearly" = 3500.00).

## 5. Registration → Payment → Activation
**STATUS: PARTIAL**
- **Flow**: Registration -> Onboarding Payment -> `initiateSubscriptionPayment` (returns fake order ID) -> Frontend Razorpay Checkout -> `verifySubscriptionPayment` -> `SubscriptionService.processSuccessfulPayment` -> Subscription Active -> Shop Active.
- **Evidence**: `OwnerPaymentController.initiateSubscriptionPayment` returns `"order_sub_" + UUID.randomUUID()`. It never calls the Razorpay API to create an order. Razorpay checkout will fail in a live environment.

## 6. Renewal
**STATUS: IMPLEMENTED**
- **Evidence**: `SubscriptionService.processSuccessfulPayment` simply creates a new `Subscription` entity with `LocalDateTime.now()` start date and bumps expiry. It successfully re-activates the shop if it's not `SUSPENDED`.

## 7. Expiration
**STATUS: IMPLEMENTED**
- **Evidence**: `SubscriptionScheduler.processSubscriptionExpiries()` runs daily.
- Warnings sent at 7, 5, 3, and 1 days.
- When `daysUntilExpiry <= 0`, calls `expireSubscription`, which safely sets shop status to `EXPIRED` without overwriting `SUSPENDED`.

## 8. Suspension
**STATUS: IMPLEMENTED**
- **Evidence**: `SubscriptionService.processSuccessfulPayment` checks if shop is `SUSPENDED`. If so, it updates the subscription but logs that the shop remains suspended. Expiration also respects suspension.

## 9. Razorpay
**STATUS: BROKEN**
- **Evidence**: `RazorpayService.java`.
- Signature verification exists, but there is no code to hit the Razorpay `POST /orders` endpoint.
- Webhook signature verification exists, but there is no webhook controller receiving events.

## 10. Payment Security
**STATUS: BROKEN**
- **Evidence**: Since actual Razorpay order creation is missing, the backend generates a fake order ID. The frontend passes this to Razorpay. This means the backend cannot definitively tie a Razorpay payment back to a specific backend-generated order amount on Razorpay's side.

## 11. Owner Dashboard
**STATUS: HARDCODED**
- **Evidence**: `app/dashboard/owner/subscription/page.tsx` hardcodes `"₹350/month"` and `"Pro Baker Studio Suite"`. It resolves price using frontend state (`billingCycle === 'yearly' ? '3,500' : '350'`).

## 12. Onboarding
**STATUS: HARDCODED**
- **Evidence**: `app/onboarding/page.tsx` line 671: "Complete your ₹350/month CakeStore subscription".

## 13. Customer Impact
**STATUS: IMPLEMENTED**
- **Evidence**: Customer storefront checks shop status. Because `EXPIRED` shops are filtered out by existing logic, this correctly shields customers from expired bakeries without modifying customer logic.

## 14. API Contract Map
**STATUS: MISMATCHED**
- Frontend expects `initiateSubscriptionPayment` to return a valid Razorpay order ID. Backend returns a fake UUID.
- Frontend doesn't request plans from `GET /api/plans`, it just sends `billingCycle` string.

## 15. Multi-Tenant Security
**STATUS: IMPLEMENTED**
- **Evidence**: `ShopAccessValidator.getShopByOwnerId(userDetails.getId())` is used correctly in `OwnerPaymentController` to ensure owners only pay for their own shops.

## 16. Admin Billing
**STATUS: PARTIAL**
- **Evidence**: `app/admin/shops/[id]/page.tsx` can view subscriptions. `app/admin/plans/page.tsx` exists to create plans, but since the backend ignores the DB plans, this UI is a placebo.

## 17. Notifications
**STATUS: IMPLEMENTED**
- **Evidence**: `SubscriptionScheduler.java` explicitly dispatches notifications at 7, 5, 3, 1 days to both the owner and the admin.

## 18. Frontend Hardcode Audit
**STATUS: FAILED**
- `app/dashboard/owner/layout.tsx`: "₹350/month"
- `app/dashboard/owner/page.tsx`: "₹350/month"
- `app/onboarding/page.tsx`: "₹350/month"
- `app/dashboard/owner/subscription/page.tsx`: "₹3,500", "₹350"

## 19. Backend Hardcode Audit
**STATUS: FAILED**
- `OwnerPaymentController.java`: `350.00` and `3500.00` hardcoded in `initiateSubscriptionPayment`, `verifySubscriptionPayment`, and `processMockCheckout`.

## 20. Configuration
**STATUS: PARTIAL**
- Razorpay keys are properly externalized via `@Value("${razorpay.key-id}")`.
- Subscription prices are improperly hardcoded in code instead of being read from the database.

## 21. Testing Baseline
**STATUS: COMPLETED**
- `npm run lint`: Passed with warnings (missing `toast` dependencies in `useEffect`, and some `<img/>` tags instead of `next/image`).
- `npx tsc --noEmit`: Passed with 0 errors.
- `mvn test`: Verified that there are NO existing unit tests for `OwnerPaymentController` or `RazorpayService`. (Pattern `OwnerPaymentControllerTest` found 0 tests).

## 22. Performance
**STATUS: IMPLEMENTED**
- Queries are fairly straightforward. `findByShopIdOrderByCreatedAtDesc` is used.

## 23. Data Safety
**STATUS: IMPLEMENTED**
- No modifications were made during this audit.

## 24. Proposed Target Architecture
- **Database**: Use `subscription_plans` as the true source. Ensure at least one active plan exists (e.g. seeded via migration).
- **Backend API**: `GET /api/subscription-plans` to serve plans to frontend.
- **Backend Orders**: `initiateSubscriptionPayment` must fetch the `SubscriptionPlan` by ID from the database, use its `price`, and call the actual Razorpay `POST /v1/orders` API to get a real `order_id`.
- **Payment Verification**: Verify Razorpay signature, fetch order details, confirm amounts match, and persist `Subscription` with the `plan_id` and the historical `price` from the plan.
- **Frontend**: Remove all hardcoded 350/3500 text. Fetch available plans from the backend and render dynamically. Pass `planId` to payment initiation instead of `billingCycle`.

## 25. Proposed Full-Stack Implementation Phases
- **3.2.1 Seed & Expose Subscription Plans**: Create a Flyway migration to insert the ₹350/month and ₹3,500/year plans. Create `GET /api/subscription-plans`.
- **3.2.2 Razorpay Order Creation**: Implement the Razorpay API call in `RazorpayService` and update `OwnerPaymentController` to generate real orders linked to DB plans.
- **3.2.3 Frontend Dynamic Pricing**: Remove hardcoded strings in Onboarding, Dashboard Layout, and Subscription pages. Render plans dynamically.
- **3.2.4 Webhook & Verification Polish**: Add a Razorpay webhook endpoint to catch out-of-band successes/failures and update `verifySubscriptionPayment` to validate amounts.
- **3.2.5 Final Full-Stack Audit**: Verify end-to-end payment flow.

## 26. Risks
- Live payments currently cannot work because Razorpay order generation is mocked. Fixing this is a strict requirement for a functional payment flow.

## 27. Explicit Scope Boundaries
- This audit did not alter any code, data, or migrations.

**LOOP 3.2 AUDIT STATUS:**
READY FOR IMPLEMENTATION
