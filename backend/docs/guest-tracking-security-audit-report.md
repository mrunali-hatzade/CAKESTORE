# Guest Tracking Security Closure & Next-Step Audit Report

## 1. Findings and Exact File References

**Exception Handling (Order Exists Verification):**
- **File:** `CustomerStorefrontController.java`
- **Finding:** The `getGuestOrderDetails` and `downloadInvoice` endpoints now explicitly catch `RuntimeException` and strictly check for the exact message `"Order not found or invalid order number"`. If matched, they safely return an HTTP `404 NOT_FOUND`. Unexpected exceptions (e.g., database failures) are rethrown and handled securely by the `GlobalExceptionHandler` as a generic 500 error, ensuring internal state is not disguised as a 404.
- **Robustness Assessment:** While string-matching the exception message works, it is brittle. The codebase already includes a dedicated `@ResponseStatus(HttpStatus.NOT_FOUND) public class ResourceNotFoundException`. In the future, `CustomerStorefrontService` should natively throw `ResourceNotFoundException`, which would eliminate the need for string-matching entirely without introducing a broad refactor.

**Rate Limiting Client Identity:**
- **File:** `RateLimitingFilter.java`
- **Finding:** The manual (and spoofable) extraction of the `X-Forwarded-For` header was completely removed. The filter now strictly relies on `request.getRemoteAddr()` to establish client identity, completely neutralizing header-spoofing vectors.

**Test Coverage:**
- **Files:** `CustomerStorefrontGuestTrackingTest.java`, `GuestTrackingRateLimitTest.java`, `StageEProductionHardeningTest.java`
- **Finding:** All tests have been updated and successfully assert the new security paradigms, proving that unexpected database exceptions are rethrown and `X-Forwarded-For` header spoofing does not bypass rate limits.

---

## 2. Security and Deployment Risks

**Deployment Network Topology:**
- **Finding:** The repository does not contain production infrastructure-as-code files (e.g., `.bicep`, `.tf`, or Azure configuration templates) beyond a local `docker-compose.yml`.
- **Unresolved Risk:** Because the topology cannot be established from the repository, we **cannot verify** whether Azure Container Apps and the ingress proxy are securely integrated with Spring Boot. If `server.forward-headers-strategy: framework` is not configured alongside a trusted proxy definition, `request.getRemoteAddr()` will resolve to the proxy's IP, which will cause the 20 req/minute rate limit to aggressively block legitimate users sharing that proxy.

**Residual Security Risks:**
- **Volumetric Botnet Abuse:** IP-based rate limiting blocks simplistic scripts, but an attacker utilizing a distributed botnet with millions of genuine IPs could still perform a slow-rate enumeration attack without tripping the per-IP limits.
- **Authentication Strength:** Guest verification relies purely on the Order Number and Phone Number. If an attacker discovers these through external means (e.g., intercepting an SMS or shoulder-surfing), they can access the order details. This is inherently weaker than the established OTP/JWT flow.

---

## 3. Documentation Changes Made

- **File:** `backend/docs/guest-tracking-security.md` (Created)
- **Content:** Documented the IP-based rate limiting behavior, the strict proxy configuration requirements necessary for correct client IP resolution, the residual risk of distributed enumeration, and the security limitations of using phone numbers for authentication compared to OTPs.

---

## 4. Test Commands and Actual Results

To verify the final implementation, the Maven test suite was executed:
- **Command:** `mvn test`
- **Working Directory:** `backend/`
- **Exit Code:** `0` (Success)
- **Total Tests Run:** 566
- **Failures:** 0
- **Errors:** 0
- **Skipped:** 0

---

## 5. Recommended Next Audit

**Recommendation:** Proceed immediately with the **Subscription Enforcement Audit**.

**Justification:** 
The roadmap highlighted two candidates: missing `OwnerStorefrontControllerTest` coverage, and a subscription-enforcement concern in `CustomerStorefrontService`. 

A review of `CustomerStorefrontService.getActiveShop()` reveals the following snippet:
```java
// Check if the shop has an active subscription
if (subscriptionRepository != null) {
    boolean hasActiveSubscription = subscriptionRepository.findFirstByShopIdAndStatusOrderByCreatedAtDesc(shopId, com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE).isPresent();
    // Bypass for StorefrontUpgradeCoreTest and SubscriptionDecouplingTest
```
This strongly implies that subscription enforcement on the public storefront is currently bypassed or commented out. This represents an enormous **direct revenue risk** where unpaid or expired shops could continue to accept customer orders through the platform. This business-logic vulnerability is critical and far outweighs the risk of missing unit test coverage on the owner controller.
