# CAKESTORE_PHASE7_BUSINESS_PAYMENT_ARCHITECTURE.md

## 1. Executive Summary
Phase 7 concludes a comprehensive, read-only architectural audit of CakeStore's financial and payment infrastructure. Currently, CakeStore relies on a monolithic Razorpay integration handling both Customer Orders and Shop Owner Subscriptions. While the system successfully processes transactions and verifies signatures securely, the underlying architecture requires normalization before we can implement complex multi-tenant payouts (Razorpay Route) and platform commissions. This document provides a complete blueprint for Phase 8.

## 2. Current Payment Architecture Audit
- **Customer Checkout:** The frontend initiates `ordersApi.createPaymentOrder`. The backend creates a Razorpay Order and saves the ID to `Order.transaction_id`. A `Payment` entity is also created with status `PENDING`.
- **Linking Hack Identified:** Because `Payment` lacks an `order_id` foreign key, the backend temporarily injects `"ORDER:" + order.getOrderNumber()` into `Payment.failureReason` to link them.
- **Verification:** The frontend callback invokes `/verify-payment`. The backend updates `Order.paymentStatus` to `PAID`, updates `Order.transactionId` to the `razorpay_payment_id`, and updates the `Payment` entity to `COMPLETED`.
- **Webhooks:** The `WebhookController` handles `payment.captured`. However, for customer orders, it only updates the `Order` entity (leaving the `Payment` entity orphaned as `PENDING` if the frontend callback was lost).

## 3. Existing Database/Entity Analysis
- **Payment Table:** Heavily biased towards subscriptions (`shop_id`, `subscription_id`, `plan_id`).
- **Order Table:** Stores its own `total_amount`, `payment_status`, and `transaction_id`.
- **Missing Entities:** No `Refund`, `Payout`, or `Commission` tables exist.

## 4. Current Razorpay Integration
Real Razorpay API is integrated and successfully utilized for generating orders, verifying signatures, and capturing webhook events. The integration is solid but operates as a single-party merchant (CakeStore receives 100% of the funds).

## 5. Customer Money Flow
**Current State:** Customer → CakeStore Razorpay Account (100%).
**Target State:** Customer → Razorpay Route (Split: Shop Gross + CakeStore Commission).

## 6. Subscription Money Flow
**Current State:** Owner → CakeStore Razorpay Account.
This is architecturally correct. Subscription revenue belongs 100% to the platform. No changes required to the money flow, just the database mapping.

## 7. Recommended Commission Model
**Recommendation: Percentage + Fixed Gateway Fee.**
Example: 5% platform commission + 2% Razorpay processing fee.
*Reasoning:* Ensures CakeStore never loses money on processing fees for very small orders, while scaling revenue smoothly with larger bakery orders.

## 8. Recommended Shop Payout Model
**Recommendation: Automated Split Settlement via Razorpay Route.**
*Reasoning:* Manual settlements require CakeStore to act as a financial custodian, triggering strict compliance and Nodal account regulations in India. Razorpay Route automatically splits the customer's payment at the time of transaction, directly routing the bakery's share to their linked account while sending the commission to CakeStore.

## 9. Razorpay Route Evaluation
Razorpay Route is the optimal solution for a SaaS Marketplace. 
- **Requirement:** Owners must complete KYC (Linked Accounts) during onboarding.
- **Implementation:** When calling `razorpayService.createCustomerOrder`, we inject `transfers` containing the `shop.razorpayAccountId` and the calculated shop share.

## 10. Refund Architecture
Refunds must be treated as first-class entities.
- **Customer Cancellation (Pre-Prep):** Automatic full refund via Razorpay API.
- **Owner Cancellation:** Automatic full refund.
- **Partial Refunds:** Handled via Admin intervention if items are missing.
*Note:* Route handles refund reversals automatically from the linked account if properly configured.

## 11. Payment Failure Architecture
Currently, failed payments leave `Order` entities stuck in `PAYMENT_PENDING`. 
**Target State:** Implement an asynchronous job that cancels `PAYMENT_PENDING` orders after 15 minutes, restoring inventory/availability.

## 12. Webhook Architecture
The current `WebhookController` must be refactored to:
1. Ensure both `Order` and `Payment` entities are updated simultaneously for customer transactions.
2. Utilize the `notes` metadata payload securely to route events to the correct Service layer without inline spaghetti logic.

## 13. Idempotency Strategy
Idempotency is partially implemented via `if ("PAID".equalsIgnoreCase(order.getPaymentStatus()))`. 
**Target State:** Enforce database constraints on `provider_payment_id`. Webhooks should rely on unique constraints to swallow duplicate Razorpay dispatches silently.

## 14. Reconciliation Strategy
**Target State:** 
A nightly Scheduled Task (`@Scheduled`) that queries Razorpay for any `Payment` remaining in `PENDING` state older than 24 hours to automatically resolve disparities caused by dropped webhooks or network failures.

## 15. Order/Payment/Subscription State Machines
- **Order:** `NEW` → `PAYMENT_PENDING` → `CONFIRMED` → `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED` (or `CANCELLED`).
- **Payment:** `PENDING` → `COMPLETED` / `FAILED` / `REFUNDED`.
- **Subscription:** `PENDING` → `ACTIVE` → `EXPIRED` / `CANCELLED` / `SUSPENDED`.

## 16. Shop Suspension/Expiration Rules
- **Suspended Shop:** Active orders continue (owners must fulfill obligations). New checkout attempts blocked immediately. Marketplace visibility hidden.
- **Expired Subscription:** Exact same behavior. Owners retain read-only access to historical orders.

## 17. Admin Financial Controls
Admin requires a new `Payouts Dashboard` to monitor:
- Platform Commission Revenue vs Subscription Revenue.
- Linked Account KYC Statuses.
- Failed Route Transfers.

## 18. Customer Transparency
**Target State:** Checkout UI must explicitly separate "Cake Price", "Delivery Fee", and "Platform/Taxes". Hidden markups should be strictly avoided to maintain trust.

## 19. Owner Transparency
**Target State:** Owner Order Details must show: Total Order Value - Platform Commission = Net Payout. A dedicated Payouts Tab will track settlements.

## 20. Proposed Financial Data Model
1. **Modify `Payment`:** Add `order_id` (Nullable, mutually exclusive with `subscription_id`).
2. **New `Refund` Entity:** `id, payment_id, amount, reason, provider_refund_id, status`.
3. **New `ShopPayoutDetails`:** Add KYC and `razorpay_account_id` properly. (Currently a mock field exists in `ShopPayoutController`).

## 21. Failure Scenario Matrix

| Scenario | Expected State | Recovery | Owner Impact | Customer Impact | Admin Action |
|---|---|---|---|---|---|
| Payment failed | `FAILED` | Cancel order after timeout | None | Prompt retry | None |
| Payment success / UI failed | `CONFIRMED` | Webhook recovers state | Notified | Sees success in My Orders | None |
| Duplicate Webhook | `CONFIRMED` | Ignored (Idempotent) | None | None | None |
| Refund failed | `REFUND_FAILED` | Cron job retries via API | Funds retained | Refund delayed | Manual retry |
| Shop Suspended | `SUSPENDED` | Admins must resolve | Cannot receive new orders | Shop hidden | Investigate |

## 22. Business Decisions Required
### REQUIRES USER/BUSINESS DECISION
- Exact Commission Percentage (e.g., 5%, 10%).
- Will Delivery Fees be subjected to the platform commission?

### REQUIRES RAZORPAY CONFIRMATION
- Approval for Razorpay Route onboarding (Nodal account restrictions check).

### REQUIRES ACCOUNTING/LEGAL/TAX ADVICE
- GST Invoicing: Does CakeStore issue the invoice to the customer on behalf of the bakery, or does the bakery issue it directly?

## 23. Recommended Final Architecture
A fully decentralized payout model leveraging Razorpay Route. CakeStore never legally holds the bakery's funds, drastically reducing accounting and compliance overhead. Subscription billing remains a direct CakeStore B2B revenue stream. The Database is normalized to clearly separate Subscriptions from Orders.

## 24. Phase 8 Implementation Roadmap
- **Phase 8A:** Database Normalization (Add `order_id` to `Payment`, create `Refund` table).
- **Phase 8B:** Refactor Webhook & Verification logic to guarantee consistency across all entities.
- **Phase 8C:** Implement Commission Calculation Service.
- **Phase 8D:** Integrate Razorpay Route (Create Linked Accounts for Shops).
- **Phase 8E:** Update Checkout API to issue Split Payments (Transfers) automatically.
- **Phase 8F:** Admin & Owner Financial Transparency UI.

## 25. Explicitly Deferred Items
- Taxation/GST automated calculations (Deferred until Accounting confirmation).
- Loyalty point financial offsets.
- Logistics partner automated payouts.
