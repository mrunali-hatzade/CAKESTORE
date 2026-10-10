# CakeStore — Subscription Enforcement Audit Report

## 1. Executive Summary
A critical business-logic vulnerability has been confirmed in the subscription enforcement architecture. Shop owners whose subscriptions expire are immediately and strictly locked out of their Owner Dashboard. However, due to a bypassed security check in `CustomerStorefrontService`, their public-facing storefront remains fully operational. Customers can still visit their direct shop URL, browse products, and successfully place new orders indefinitely (until a background cron job manually alters the shop's global status, which is not guaranteed for all edge cases).

**Severity:** **High / Critical (Revenue Risk)** - Expired shops continue utilizing platform resources and processing orders without paying for active subscriptions.

---

## 2. Findings and Vulnerability Confirmation

**The Suspected Bypass is Confirmed:**
- **File:** `CustomerStorefrontService.java`
- **Method:** `getActiveShop(Long shopId)`
- **Finding:** Lines 146-155 evaluate whether a shop has an active subscription (`hasActiveSubscription = subscriptionRepository.findFirstByShopId...`). However, the result of this check is entirely ignored. The code meant to throw a `RuntimeException` blocking access is commented out with the explanation: _"Wait, let's just not throw if we don't have it for now, since it breaks all backward tests."_
- **Impact:** Any order-creation or storefront-viewing method that relies on `getActiveShop()` (e.g., `getShopDetails`, `placeGuestOrder`) fundamentally ignores subscription status and allows public traffic based purely on the shop being `ShopStatus.ACTIVE`. 

**Inconsistent Search Filtering:**
- **Method:** `searchShops()`
- **Finding:** Unlike direct storefront links, the `searchShops` method explicitly filters out shops lacking an active subscription using the `subscriptionRepository`. This creates a fragmented state where an expired shop vanishes from search results but continues accepting orders via its direct URL.

**Strict Owner Gating:**
- **File:** `ShopAccessValidator.java`
- **Finding:** The owner's operational dashboard strictly enforces subscription validity by checking `SubscriptionStatus` and verifying that `expiryDate` is not in the past. Thus, an expired owner is locked out of their dashboard, unable to see the new orders that the public storefront is simultaneously allowing customers to place.

---

## 3. Explanation of Test Accommodations

The vulnerability was introduced directly to accommodate two specific tests:
1. **`StorefrontUpgradeCoreTest.java`**: During the test setup (`setUp()`), a mock `subscriptionRepository` is injected. However, the mock is never stubbed to return an active subscription for the test shop. If `getActiveShop` enforced the check, all storefront methods in this test would throw an exception, breaking the test suite.
2. **`SubscriptionDecouplingTest.java`**: This test utilizes a backward-compatible constructor for `CustomerStorefrontService` that passes `null` for the `subscriptionRepository`. It then asserts that `CustomerStorefrontService.getShopDetails()` throws an exception based purely on the `ShopStatus` changing to `EXPIRED`.

Instead of updating the test fixtures to inject and mock valid subscriptions, a developer commented out the enforcement in production.

---

## 4. Enforcement Matrix

| Feature | State if Subscription is Expired (but ShopStatus is ACTIVE) | Evidence |
| :--- | :--- | :--- |
| **Public Storefront Browsing** | **Allowed (Vulnerable)** | `getActiveShop()` bypasses the subscription check. |
| **Creating New Orders** | **Allowed (Vulnerable)** | `placeGuestOrder()` relies on `getActiveShop()`. |
| **Storefront Search Listing** | **Blocked** | `searchShops()` explicitly filters via `subscriptionRepository`. |
| **Order Tracking / Invoices** | **Allowed (Intentional)** | `getGuestOrder()` does not check shop status (safe by design). |
| **Owner Dashboard Access** | **Blocked (Secure)** | `ShopAccessValidator` strictly enforces `expiryDate` and status. |

---

## 5. Minimum Safe Remediation Plan

To resolve this vulnerability without triggering massive refactors or breaking tenant isolation, the following minimum safe fix is recommended:

1. **Re-enable Enforcement in `getActiveShop()`:**
   Uncomment and implement the exception in `CustomerStorefrontService.getActiveShop()`:
   ```java
   if (subscriptionRepository != null) {
       boolean hasActive = subscriptionRepository.findFirstByShopIdAndStatusOrderByCreatedAtDesc(shopId, SubscriptionStatus.ACTIVE).isPresent();
       if (!hasActive) {
           throw new RuntimeException("Storefront is currently unavailable due to an inactive subscription");
       }
   }
   ```
2. **Fix `StorefrontUpgradeCoreTest`:**
   Instead of bypassing production security, update the `setUp()` method in the test to properly stub the `subscriptionRepository` so it returns an active subscription mock.
3. **Fix `SubscriptionDecouplingTest`:**
   Inject a mocked `subscriptionRepository` instead of `null` and configure the mock to match the required test states.
4. **Preserve Tracking Access:**
   Leave `getGuestOrder()` untouched, ensuring customers can always access receipts for past orders regardless of the shop's current subscription status.

**Required Regression Tests:**
- A new test verifying that a shop with `ShopStatus.ACTIVE` but an expired subscription successfully blocks `getShopDetails` and `placeGuestOrder` with an HTTP 403 or 400.
- A new test verifying that customers can still download invoices for expired shops.
