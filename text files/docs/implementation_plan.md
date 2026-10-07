# Stage C — Live Payment & Subscription Gateway Implementation Plan

This implementation plan details the architectural and code changes required to complete **Stage C** of the CakeStore platform roadmap, establishing a live-ready payment infrastructure for both customer orders and owner subscriptions while maintaining Stage A and Stage B invariants.

---

## User Review Required

> [!IMPORTANT]
> **Grace Period & Automatic Downgrade PRD Analysis:**
> A thorough search across `Cake_Platform_PRD_Final.md`, `CakeStore_Frontend_PRD_v2.md`, and `cakestore_master_project_audit.md` reveals that **no exact grace period duration (e.g. 3 days vs 7 days) or automatic downgrade tier is specified in the PRD**.
> In accordance with Section 22 and Section 25 of the user instructions (*"Do not invent arbitrary business rules... Report the gap before choosing a business value"*):
> - We preserve the strict Stage A security invariant: when a subscription reaches expiry, it transitions to `EXPIRED`, the shop becomes `INACTIVE`, and operational access is blocked while preserving billing and renewal paths.
> - When renewing, the owner's active subscription is extended by the selected plan's duration (30 days for monthly or 365 days for yearly).
> - If an exact grace period duration (e.g. 5 days of continued access after expiry before becoming inactive) is desired in the future, it can be configured without changing the underlying architecture.

> [!IMPORTANT]
> **Administrative Suspension Precedence:**
> When an owner successfully renews or pays for a subscription:
> - If `shop.status == ShopStatus.SUSPENDED`, **the shop remains SUSPENDED**. Administrative suspension strictly takes precedence over payment renewal.
> - If `shop.status == ShopStatus.INACTIVE` (due to expired subscription) AND `shop.verificationStatus == VerificationStatus.VERIFIED`, the shop status is safely restored to `ShopStatus.ACTIVE`.
> - If `shop.verificationStatus != VerificationStatus.VERIFIED`, the shop remains inactive/unverified until admin KYC approval.

> [!IMPORTANT]
> **Cash on Delivery (COD) Coexistence:**
> COD is an existing, fully functioning customer checkout path. It will remain completely untouched and independent from the Razorpay flow. Customers can choose between Cash on Delivery and Online Payment via Razorpay at checkout.

> [!NOTE]
> **Zero Database Schema Migrations:**
> The existing PostgreSQL database schema (`payments`, `subscriptions`, `orders`, `activity_logs`, and `subscription_plans`) already contains all necessary columns (`provider_order_id`, `provider_payment_id`, `status`, `paid_at`, `failure_reason`, etc.). No Flyway migration is required.

---

## Proposed Changes

### Component 1: Razorpay Payment Security & HMAC Verification

#### [NEW] [RazorpayService.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/payment/RazorpayService.java)
- Located in `com.cakeplatform.api.modules.payment`.
- Injects `keyId`, `keySecret`, and `webhookSecret` from Spring `@Value` properties (`razorpay.key-id`, `razorpay.key-secret`, `razorpay.webhook-secret`).
- `verifyPaymentSignature(String orderId, String paymentId, String signature)`:
  - Generates `HMAC-SHA256(orderId + "|" + paymentId, keySecret)` as a hex string.
  - Compares with `signature` using constant-time comparison `MessageDigest.isEqual` to prevent timing side-channel attacks.
- `verifyWebhookSignature(String rawPayload, String signatureHeader)`:
  - Generates `HMAC-SHA256(rawPayload, webhookSecret)` using the exact unmodified raw payload byte stream.
  - Compares with `signatureHeader` using constant-time comparison `MessageDigest.isEqual`.
- `isConfigured()`: returns `true` if valid non-placeholder credentials are provided.

#### [MODIFY] [application.yml](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/resources/application.yml)
- Add environment-bound Razorpay properties with safe placeholder defaults for testing:
  ```yaml
  razorpay:
    key-id: ${RAZORPAY_KEY_ID:rzp_test_placeholder}
    key-secret: ${RAZORPAY_KEY_SECRET:secret_placeholder}
    webhook-secret: ${RAZORPAY_WEBHOOK_SECRET:webhook_secret_placeholder}
  ```

---

### Component 2: Customer Storefront Payment Integration

#### [NEW] [CustomerPaymentController.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/payment/controller/CustomerPaymentController.java)
- `@RestController`, `@RequestMapping("/api/storefront/orders")`.
- `POST /{orderNumber}/create-payment-order`:
  - Retrieves order via `orderRepository.findByOrderNumber(orderNumber)`.
  - Amount is authoritative from server-side `order.getTotalAmount()` (multiplied by 100 to paise).
  - Returns `{ orderNumber, razorpayOrderId, amountPaise, currency: "INR", keyId }`.
- `POST /{orderNumber}/verify-payment`:
  - Validates payload: `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`.
  - Verifies signature with `RazorpayService`.
  - Validates order state: must not be `CANCELLED` or already `PAID`.
  - Updates `order.setPaymentStatus("PAID")`, `order.setTransactionId(razorpayPaymentId)`, `order.setPaidAt(LocalDateTime.now())`.
  - If `order.orderStatus == "NEW"`, transitions to `"CONFIRMED"`.
  - Records `Payment` entity with `status = "COMPLETED"`, `paidAt`, `amount = order.totalAmount`.
  - Emits in-app notification to the shop owner.

#### [MODIFY] [OrderRepository.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/order/OrderRepository.java)
- Add `Optional<Order> findByOrderNumber(String orderNumber);` replacing in-memory table scans with an indexed query.

---

### Component 3: Secure Webhook Processing

#### [MODIFY] [WebhookController.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/order/controller/WebhookController.java)
- `@PostMapping("/razorpay")`:
  - Receives `@RequestHeader(value = "X-Razorpay-Signature", required = false) String signature` and `@RequestBody String rawPayload`.
  - Validates signature presence; returns HTTP 400 (`Missing signature`) if absent.
  - Verifies raw payload using `razorpayService.verifyWebhookSignature(rawPayload, signature)`. Returns HTTP 400 (`Invalid signature`) on failure.
  - Parses JSON payload with `ObjectMapper`.
  - Handles `payment.captured`:
    - Case A: Customer Order (`notes.internal_order_number`):
      - **Idempotency**: checks if `order.paymentStatus == "PAID"`. If so, returns HTTP 200 without duplicate action.
      - Updates order payment status to `PAID`, order status to `CONFIRMED`, creates `Payment` record, logs activity, and notifies owner.
    - Case B: Owner Subscription (`notes.shop_id` or `notes.subscription_id`):
      - **Idempotency**: checks if payment ID is already recorded with `status = "COMPLETED"`.
      - Invokes `subscriptionService.processSuccessfulPayment` with suspension precedence check.
  - Handles `payment.failed`:
    - Records failure details in `payments` without corrupting order status.
  - Returns HTTP 200 `{"status": "processed"}`.

---

### Component 4: Owner Payment History & Subscription Lifecycle

#### [NEW] [OwnerPaymentResponse.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/payment/dto/OwnerPaymentResponse.java)
- DTO exposing:
  `id`, `amount`, `currency`, `provider`, `providerOrderId`, `providerPaymentId`, `status`, `failureReason`, `paidAt`, `createdAt`, `subscriptionPlanName`, `invoiceAvailable`.
- Sanitized to avoid exposing internal credentials.

#### [MODIFY] [PaymentRepository.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/payment/PaymentRepository.java)
- Add query methods:
  - `List<Payment> findByShopIdOrderByCreatedAtDesc(Long shopId);`
  - `Optional<Payment> findByProviderPaymentId(String providerPaymentId);`
  - `Optional<Payment> findByIdAndShopId(Long id, Long shopId);`

#### [MODIFY] [OwnerPaymentController.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/payment/controller/OwnerPaymentController.java)
- Add `GET /api/owner/payments`:
  - Extracts authenticated owner ID from `@AuthenticationPrincipal CustomUserDetails`.
  - Resolves shop via `shopAccessValidator.getShopByOwnerId(userId)`.
  - Returns list of `OwnerPaymentResponse` filtered strictly to the owner's shop (database-level tenant isolation).
- Add `GET /api/owner/payments/{paymentId}/invoice`:
  - Verifies payment belongs to authenticated owner's shop (`paymentRepository.findByIdAndShopId`).
  - Generates subscription receipt PDF via `invoiceService.generateSubscriptionInvoice(payment)`.
  - Returns `application/pdf` attachment.
- Add `POST /initiate-subscription`:
  - Authoritatively calculates plan price server-side (₹350 monthly / ₹3500 yearly).
  - Returns payment order details.
- Add `POST /verify-subscription`:
  - Verifies Razorpay signature using `RazorpayService`.
  - Invokes `subscriptionService.processSuccessfulPayment(...)`.
- Harden existing `POST /mock-checkout` to enforce identical suspension precedence and verification rules.

#### [MODIFY] [SubscriptionService.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/subscription/SubscriptionService.java)
- In `processSuccessfulPayment`:
  - Check shop status:
    - If `shop.getStatus() == ShopStatus.SUSPENDED`: **DO NOT REACTIVATE**. Admin suspension is strictly preserved.
    - If `shop.getStatus() == ShopStatus.INACTIVE` AND `shop.getVerificationStatus() == VerificationStatus.VERIFIED`: call `shopStatusManager.activateShop(shop.getId(), userId)`.
    - If `shop.getVerificationStatus() != VerificationStatus.VERIFIED`: shop remains inactive awaiting admin KYC.
  - Create/update `Subscription` with active state and extended expiry date (now + 30 days or 365 days).
  - Create `Payment` record with `COMPLETED` status.
  - Log audit activity and dispatch owner notification.

#### [MODIFY] [InvoiceService.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/order/InvoiceService.java)
- Add `generateSubscriptionInvoice(Payment payment)`:
  - Generates official PDF receipt using existing OpenPDF library:
    - Title: "TAX INVOICE — PLATFORM SUBSCRIPTION"
    - Invoice Number: `INV-SUB-${payment.getId()}`
    - Shop & Owner Details
    - Platform Details
    - Subscription Plan Details & Duration
    - Total Amount Paid (₹)
    - Payment Reference (`providerPaymentId`)
    - Payment Timestamp

---

### Component 5: Frontend UI & API Layer

#### [MODIFY] [frontend_v2/types/owner.ts](file:///d:/PROJECTS/CAKE%20SAAs1/frontend_v2/types/owner.ts)
- Add `OwnerPaymentRecord` interface.

#### [MODIFY] [frontend_v2/lib/api/owner.ts](file:///d:/PROJECTS/CAKE%20SAAs1/frontend_v2/lib/api/owner.ts)
- Add:
  - `getPayments: () => Promise<OwnerPaymentRecord[]>`
  - `downloadPaymentInvoice: (paymentId: number) => Promise<void>`
  - `initiateSubscriptionPayment: (billingCycle: string) => Promise<any>`
  - `verifySubscriptionPayment: (payload: any) => Promise<any>`

#### [MODIFY] [frontend_v2/app/dashboard/owner/subscription/page.tsx](file:///d:/PROJECTS/CAKE%20SAAs1/frontend_v2/app/dashboard/owner/subscription/page.tsx)
- Add "Payment History & Invoices" section:
  - Table displaying Date, Transaction Reference, Plan Description, Amount, Status Badge (`COMPLETED`, `PENDING`, `FAILED`), and Download Invoice action.
  - Includes loading and empty states in Design 2 styling.

#### [MODIFY] [frontend_v2/lib/services/payments.ts](file:///d:/PROJECTS/CAKE%20SAAs1/frontend_v2/lib/services/payments.ts)
- Integrate server-side order creation and signature verification into Razorpay checkout lifecycle.

#### [MODIFY] [frontend_v2/app/checkout/page.tsx](file:///d:/PROJECTS/CAKE%20SAAs1/frontend_v2/app/checkout/page.tsx)
- Provide customer choice: Cash on Delivery (COD) vs Online Payment (Razorpay).
- If COD: places order immediately (preserved unchanged).
- If Online Payment: initiates server-side payment order, triggers checkout modal, verifies signature upon success.

---

## Verification Plan

### Automated Tests
Create `backend/src/test/java/com/cakeplatform/api/modules/payment/StageCPaymentAndSubscriptionTest.java` with 20+ tests covering:
1. **Razorpay Security**:
   - Valid signature accepted (`verifyPaymentSignature`).
   - Invalid signature rejected.
   - Missing or blank signature rejected.
   - Wrong secret rejected.
   - Authoritative amount validation (tampered client amounts rejected).
2. **Webhook Verification**:
   - Raw-body HMAC-SHA256 signature verified against `X-Razorpay-Signature`.
   - Missing signature returns HTTP 400.
   - Invalid signature returns HTTP 400.
   - Valid `payment.captured` marks order as `PAID` and `CONFIRMED`.
   - Duplicate `payment.captured` webhook is idempotent (no duplicate status transitions or payments).
   - Unknown order number / reference handled gracefully without mutating unrelated data.
3. **Owner Payment History & Invoices**:
   - Owner can retrieve own payment history via `GET /api/owner/payments`.
   - Tenant isolation: Owner A cannot see Owner B's payments.
   - Non-owner users (customers) receive HTTP 403.
   - Owner can download subscription invoice PDF.
   - Cross-tenant invoice download rejected with HTTP 403 / 404.
4. **Subscription Lifecycle & Invariants**:
   - Successful payment activates subscription and extends expiry.
   - Renewal of `INACTIVE` verified shop restores `ACTIVE`.
   - Renewal of `SUSPENDED` shop does **NOT** restore `ACTIVE` (suspension precedence).
   - Renewal of `UNVERIFIED` shop does **NOT** restore `ACTIVE`.
   - Subscription history preserved.
5. **COD Regression**:
   - Guest order with COD checkout succeeds and remains unaffected by Razorpay logic.
6. **Regression Suite**:
   - Run `mvn test` in `backend/` to confirm all 95 existing tests + Stage C tests pass (**115+ total tests**).

### Frontend Compilation
- Run `npm run build` in `frontend_v2/` to ensure:
  - 0 TypeScript errors
  - 0 ESLint errors
  - All 28 routes compile and optimize cleanly.
