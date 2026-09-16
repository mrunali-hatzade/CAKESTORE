# CAKESTORE LOOP 3.2.4: RAZORPAY WEBHOOKS PRE-IMPLEMENTATION AUDIT

This document provides a complete audit of the current Razorpay webhook and payment architecture for both customer orders and owner subscriptions. It identifies critical vulnerabilities, race conditions, and integrity gaps, followed by a concrete implementation plan to address them without breaking existing Checkout flows.

## 1. Current Webhook Architecture
- **Endpoint:** `POST /api/webhooks/razorpay` in `WebhookController.java`.
- **Flow:**
  1. Checks for `X-Razorpay-Signature`.
  2. Verifies HMAC-SHA256 signature using the raw payload and `webhookSecret`.
  3. Parses JSON to identify the `event` and payload contents.
  4. If `payment.captured`:
     - Checks if it's a customer order by looking for `internal_order_number` or `order_number` in `notes`.
     - Otherwise, checks if it's a subscription by looking for `subscription_shop_id` or `shop_id` in `notes`.
  5. If `payment.failed`:
     - Logs the failure for customer orders. Does nothing for subscriptions.

## 2. Current Payment Architecture (Checkout Flow)
- **Controller:** `OwnerPaymentController.java`
- **Initiation (`/initiate-subscription`):**
  1. Validates plan.
  2. Creates a local `Payment` record in `PENDING` state.
  3. Creates a Razorpay order.
  4. Updates the local `Payment` with the `providerOrderId`.
- **Verification (`/verify-subscription`):**
  1. Validates Razorpay signature (or allows mock signature if unconfigured).
  2. Double-checks order details directly with Razorpay API (amount, currency).
  3. Fetches the `Payment` by `providerOrderId`.
  4. Checks if the payment is already `COMPLETED`.
  5. Verifies plan mismatch and amount mismatch.
  6. Calls `SubscriptionService.processSuccessfulPayment(...)` to transition state and create the `Subscription`.

## 3. Current Database Schema
- **`payments` table:** Tracks all payment attempts.
  - Columns: `id`, `shop_id`, `subscription_id`, `plan_id`, `amount`, `currency`, `provider`, `provider_order_id`, `provider_payment_id`, `status`.
  - **Critical Gap:** No unique constraints exist on `provider_order_id` or `provider_payment_id`.
- **`subscriptions` table:** Tracks shop active/expired subscriptions.
  - Multiple subscriptions can exist per shop (history).

## 4. Current Webhook Events Supported
- `payment.captured`: Supported. Captures both customer orders and shop subscriptions.
- `payment.failed`: Partially supported. Logs failure for customer orders, completely ignores subscription failures.
- **Missing:** `order.paid`. Currently relying on `payment.captured`. This is acceptable but less robust for order-level state.
- **Recommendation:** Keep relying on `payment.captured` for simplicity, but strictly enhance its validation. Add subscription failure handling for `payment.failed`.

## 5. Signature Verification Audit
- **Method:** `RazorpayService.verifyWebhookSignature` hashes `rawPayload` with `webhookSecret`.
- **Vulnerability:** If `webhookSecret` is not overridden in production (defaults to `webhook_secret_placeholder`), an attacker could easily hash their own forged payloads with the public placeholder secret and bypass verification.
- **Requirement:** The controller MUST reject webhook processing if `razorpayService.webhookSecret` contains the word `placeholder`.

## 6. Idempotency Audit
- **Mechanism:** The webhook checks `paymentRepository.findByProviderPaymentId(transactionId).isPresent()`.
- **Vulnerability:** This is a read-then-write mechanism without database-level uniqueness guarantees or transactional locks. Concurrent webhooks (or duplicated events from Razorpay) could bypass this check and process multiple times.
- **Requirement:** A dedicated `webhook_events` tracking table or a unique constraint on `provider_payment_id` is required to guarantee strict database-level idempotency.

## 7. Checkout / Webhook Race Condition Analysis
- **Scenario:** The frontend sends `/verify-subscription` while Razorpay simultaneously fires the `payment.captured` webhook.
- **Result:**
  1. Both flows query the database. The Checkout flow finds the `PENDING` payment. The webhook flow either finds it or creates a new one.
  2. Both flows enter `SubscriptionService.processSuccessfulPayment` concurrently.
  3. Because `processSuccessfulPayment` lacks state checks and locking, it creates **two separate `Subscription` records** for the same payment and marks the payment `COMPLETED` twice.
- **Requirement:** `SubscriptionService.processSuccessfulPayment` must check `if ("COMPLETED".equals(payment.getStatus())) return payment;` within a locked transaction or rely on a unique `provider_payment_id` constraint to fail the second thread safely.

## 8. Payment / Plan / Shop Integrity Analysis
- **Checkout Integrity:** Validates amount, currency, and plan mismatch securely.
- **Webhook Integrity (Critical Gap):** The webhook flow does **NOT** validate the captured amount, currency, or plan ID against the local database. It blindly trusts the `notes` payload, and if `plan_id` is missing, it arbitrarily grabs the "first active plan" from the DB.
- **Requirement:** The webhook must fetch the `PENDING` payment by `provider_order_id`, verify that the `transaction.amount` matches `payment.amount`, verify currency, and ensure the plan matches before proceeding.

## 9. Lifecycle Analysis
- `ShopStatusManager` currently handles `activateShop`.
- Administrative `SUSPENDED` shops are explicitly protected in `SubscriptionService`:
  ```java
  if (shop.getStatus() == ShopStatus.SUSPENDED) {
      log.info("Shop is SUSPENDED by admin. Subscription renewed but shop remains SUSPENDED.");
  }
  ```
- **Conclusion:** Existing lifecycle rules are solid and must be preserved exactly as they are.

## 10. Security Analysis summary
1. Webhooks endpoints correctly omit JWT requirements.
2. Webhook endpoints incorrectly allow placeholder secrets.
3. Webhook endpoints trust `notes` payload without validating amounts.
4. Webhook logs currently do not expose secrets (good).

## 11. Required Database Changes (Flyway Migration V23)
To ensure strict idempotency and prevent the race conditions outlined above, a new migration is required:

**`V23__add_webhook_idempotency.sql`**
```sql
CREATE TABLE webhook_events (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
```

*(Note: Adding a unique constraint to `payments.provider_payment_id` directly could fail if historical duplicated test data exists. A `webhook_events` table tracking the `x-razorpay-event-id` header is the safest standard pattern).*

## 12. Required Backend Changes
1. **`WebhookController`:**
   - Extract `X-Razorpay-Event-Id` header.
   - Insert into `webhook_events`. Catch unique constraint violations to safely ignore duplicates.
   - Reject request if `webhookSecret` is `webhook_secret_placeholder`.
   - Validate Razorpay captured `amount` against the local `Payment.amount`.
   - Validate `currency`.
   - Validate `plan_id`.
   - Ensure `paymentToUpdate` is retrieved by `provider_order_id`, failing if not found (do not create arbitrary new payments on the fly).
2. **`SubscriptionService`:**
   - In `processSuccessfulPayment`, add an immediate check: `if ("COMPLETED".equals(payment.getStatus())) return payment;` to mitigate any remaining race conditions.
   - Update `payment.failed` to mark the local `Payment` record as `FAILED`.

## 13. Required Frontend Changes
None. The frontend should continue to poll/call `/verify-subscription`. The backend changes make this safe regardless of race conditions.

## 14. Testing Plan
- [ ] **Test 1:** Valid webhook accepted, subscription created.
- [ ] **Test 2:** Invalid signature rejected (400 Bad Request).
- [ ] **Test 3:** Missing signature rejected (400 Bad Request).
- [ ] **Test 4:** Duplicate webhook ignored safely (Idempotency table hit).
- [ ] **Test 5:** Checkout verification and Webhook race condition safely handled (only 1 subscription created).
- [ ] **Test 6:** Webhook with mismatched amount rejected.
- [ ] **Test 7:** Webhook with mismatched plan rejected.
- [ ] **Test 8:** Webhook processing skips if `Payment` is already `COMPLETED`.
- [ ] **Test 9:** `payment.failed` correctly updates local payment status to `FAILED`.
- [ ] **Test 10:** SUSPENDED shop remains SUSPENDED after successful webhook payment.
- [ ] **Test 11:** Production bypass fails (if webhookSecret is placeholder, endpoint returns 500 or 400).

## 15. Risks
- **Data Migration Risk:** Minimal. The new `webhook_events` table does not alter historical data.
- **Transaction Deadlocks:** Using a separate idempotency table handles the duplicate checks gracefully.

## 16. Exact Implementation Phases
1. **Phase 1: Database Migration:** Add `webhook_events` table.
2. **Phase 2: Security & Integrity:** Update `WebhookController` validation logic (placeholder check, amount/currency validation).
3. **Phase 3: Race Condition Prevention:** Update `SubscriptionService` state checks and implement idempotency table logic in the controller.
4. **Phase 4: Testing:** Implement the testing plan via integration tests.

## 17. Readiness Recommendation
**YES, implementation is ready to begin.** The audit is complete, all architectural gaps have been identified, and a clear, non-breaking path forward is defined. You may proceed to authorize code modifications.
