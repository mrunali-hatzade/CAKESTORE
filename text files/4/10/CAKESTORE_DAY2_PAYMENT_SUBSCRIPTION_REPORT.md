# Day 2: Payment & Subscription Lifecycle Report

## 1. Payment Architecture
The platform integrates with Razorpay via `RazorpayService.java`. Subscriptions are handled by `SubscriptionService.java` which works alongside `ShopStatusManager` to control the operational and public status of shops. A central, idempotent webhook (`WebhookController`) handles asynchronous events (`payment.captured` and `payment.failed`) from the gateway.

## 2. Subscription Lifecycle
- **Creation**: Handled by `SubscriptionService.processSuccessfulPayment(...)`, triggered securely via webhook or verified direct redirects. A successful payment produces an `ACTIVE` subscription and updates the shop status to `ACTIVE` (unless suspended).
- **Expiration**: `SubscriptionScheduler` scans subscriptions daily. Once expiry is hit, it invokes `expireSubscription(...)`, marking the subscription as `EXPIRED` and updating the shop status to `EXPIRED` (unless another active subscription is found or the shop is `SUSPENDED`).

## 3. Early Renewal Bug
A critical defect was found in `SubscriptionService.expireSubscription()`. When a bakery renewed early, a new `ACTIVE` subscription was created, while the old one remained `ACTIVE` until its natural end date. When the old subscription expired, the scheduler triggered `expireSubscription`, which blindly set the shop status to `EXPIRED`. This locked out bakery owners who proactively renewed their plans.

## 4. Early Renewal Fix
The method `SubscriptionService.expireSubscription()` was updated. Now, before changing the shop status to `EXPIRED`, the system queries for any remaining active subscriptions (`findFirstByShopIdAndStatusOrderByCreatedAtDesc`). If a new active subscription exists, the shop remains `ACTIVE`. This fix preserves the business rule while preventing lockouts on early renewals. A regression test `testEarlyRenewal_PreventsShopExpiration` was added to `BakeryLifecyclePhase1Test` and fully passed.

## 5. Normal Expiry Verification
Tests (`testExpireSubscription_DoesNotDeactivateShop` in `SubscriptionDecouplingTest`) confirm that when the single active subscription reaches its expiry date, the subscription becomes `EXPIRED`, the Shop status updates to `EXPIRED`, and owner operational access is correctly blocked (returning HTTP 403).

## 6. Renewal-after-expiry Verification
Verified through `testSuccessfulRenewal_ActivatesShopAndSubscription`. When a shop is `EXPIRED` and the owner makes a successful payment, `processSuccessfulPayment` creates a new `ACTIVE` subscription and correctly triggers `ShopStatusManager.activateShop()`, reopening dashboard access.

## 7. Admin Suspension Verification
Admin actions are authoritative. Tested via `testSubscriptionRenewal_DoesNotRestoreSuspendedShop` and `testAdminSuspended_BlocksCustomers`. If an admin sets a shop to `SUSPENDED`, subscription renewals do NOT overturn the suspension. Expirations do NOT overwrite `SUSPENDED` to `EXPIRED`.

## 8. Multiple Subscription Verification
The architecture preserves historical subscriptions. A shop can have multiple subscriptions over its lifetime (e.g., historical `EXPIRED` and one current `ACTIVE`). Our fix to early renewals ensures that only the presence of a current `ACTIVE` subscription dictates the shop's operational state.

## 9. Razorpay Payment Verification
The `RazorpayService.java` correctly implements exact payload signature validation using HMAC-SHA256 (`calculateHmacSha256`). Invalid signatures or tampered payloads (e.g., modified amount or IDs) are strictly rejected.

## 10. Razorpay Webhook Analysis
Two webhook controllers exist:
1. `order/controller/WebhookController.java`: **Authoritative**. Performs complete signature verification against raw payload, checks idempotency, processes `payment.captured` for both orders and subscriptions, and securely transitions states.
2. `payment/controller/RazorpayWebhookController.java`: **Redundant Stub**. Exposes `/api/webhooks/razorpay-v2`, currently unauthenticated with a `TODO` comment to verify signatures. **Risk**: This file should be removed in upcoming refactoring as it serves no purpose.

## 11. Idempotency Verification
Verified via `testWebhook_PaymentCaptured_Idempotent` and `testSubscriptionExpiration_Idempotent`. Duplicate webhook requests for already `COMPLETED` payments or `PAID` orders are acknowledged cleanly without duplicating subscriptions or throwing internal server errors.

## 12. Payment Data Preservation
Successful payments are recorded as `Payment` entities linked to a `Subscription`. Failed payments transition to `FAILED` status but are preserved for audit purposes. Renewals generate independent `Subscription` records, ensuring historical subscriptions remain intact for accounting.

## 13. Tests Executed
A full `mvn clean test` run covering the entire backend test suite was executed. 

## 14. Exact Final Test Result
- **Tests run:** 437
- **Failures:** 0
- **Errors:** 0
- **Skipped:** 0
- **BUILD RESULT:** `BUILD SUCCESS`

## 15. Remaining Risks
- The stub `RazorpayWebhookController.java` represents technical debt and should be deleted to prevent accidental integration.

## 16. Recommended Next Action
Proceed to **Day 3** of the Production Launch Sprint.

Final status: **PASS**
