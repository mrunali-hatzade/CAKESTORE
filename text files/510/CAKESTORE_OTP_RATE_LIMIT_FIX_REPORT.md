# CAKESTORE OTP RATE LIMIT FIX REPORT

## 1. Goal
Fix the P1 vulnerability where `POST /api/customer/storefront/tracking/request-otp` was not properly rate-limited, exposing the platform to mass OTP requests, SMS toll fraud, and automated abuse.

## 2. Implementation
The existing `RateLimitingFilter.java` (using Bucket4j) was modified. Previously, the strict `authBuckets` tier (10 requests per minute per IP) only protected endpoints matching `uri.startsWith("/api/auth/")`. The OTP tracking endpoints (`/api/customer/storefront/tracking/...`) fell through the gaps because they did not match the strict prefix, nor did they match the `storefrontBuckets` prefix (`/api/storefront/`).

**Changes made:**
- Explicitly added `uri.startsWith("/api/customer/storefront/tracking/")` to the Tier 1 **Auth Endpoints** bucket in `RateLimitingFilter.java`. This guarantees that a single IP address can only request or verify OTPs a maximum of 10 times per minute.
- Explicitly added `uri.startsWith("/api/customer/storefront/")` to the Tier 3 **Storefront** bucket (120 req/min) so that general customer browsing API calls are appropriately throttled against scrape attacks.

## 3. Files Changed
- `backend/src/main/java/com/cakeplatform/api/security/RateLimitingFilter.java`
- `backend/src/test/java/com/cakeplatform/api/security/OtpRateLimitSecurityTest.java` (Added)

## 4. Tests Added
Created `OtpRateLimitSecurityTest.java` which verifies:
- `testOtpRequestRateLimiting`: Verifies that the 11th request from the same IP address within a minute receives a `429 Too Many Requests` status code.
- `testDifferentIpCanRequestOtp`: Verifies that if IP A is exhausted, IP B can still make legitimate OTP requests.

## 5. Test Results
- `OtpRateLimitSecurityTest`: **PASS**
- Full `mvn test` suite: **PASS**

## 6. Remaining Risks
- The 10 requests/minute per IP rate limit effectively prevents individual IPs from executing SMS toll fraud. However, a sophisticated attacker using a highly distributed botnet (thousands of rotating IPs) could still bypass this IP-based limit.
- Legitimate users are fully protected by the existing 60-second cooldown per phone number (enforced in `GuestOtpService`). The combination of the per-phone limit and the new per-IP limit provides strong defense-in-depth against mass smishing.
