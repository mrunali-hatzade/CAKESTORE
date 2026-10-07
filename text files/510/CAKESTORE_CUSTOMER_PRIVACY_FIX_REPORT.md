# CAKESTORE CUSTOMER PRIVACY FIX REPORT

## 1. Original Vulnerability
Unauthenticated capability-URL exposure in the Customer Storefront API. Any user could view PII (Personal Identifiable Information) and download invoices for any order by simply omitting the `Authorization` header and guessing/knowing an `orderNumber`.

## 2. Root Cause
The `CustomerStorefrontController` implemented a "public fallback" allowing access to the endpoints `GET /api/customer/storefront/orders/{orderNumber}` and `GET /api/customer/storefront/orders/{orderNumber}/invoice` if a JWT was not provided.

## 3. Files Changed
- `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontController.java`
- `backend/src/test/java/com/cakeplatform/api/modules/storefront/CustomerPrivacySecurityTest.java` (added)

## 4. Exact Behavior Before Fix
- **No authentication:** Returns `200 OK` with full order details/invoice.
- **Valid JWT matching customer:** Returns `200 OK`.
- **Valid JWT for another customer:** Returns `403 Forbidden`.

## 5. Exact Behavior After Fix
- **No authentication:** Returns `401 Unauthorized`.
- **Invalid/Expired JWT:** Returns `401 Unauthorized`.
- **Valid JWT for another customer:** Returns `403 Forbidden`.
- **Valid JWT matching customer:** Returns `200 OK`.

## 6. Tests Added
A new test class `CustomerPrivacySecurityTest.java` was introduced with 6 comprehensive test cases:
1. `testUnauthenticatedOrderLookup_Returns401`
2. `testUnauthenticatedInvoiceLookup_Returns401`
3. `testInvalidJwtOrderLookup_Returns401`
4. `testCustomerAAccessingCustomerBOrder_Returns403`
5. `testCustomerAAccessingCustomerBInvoice_Returns403`
6. `testCustomerAAccessingOwnOrder_Returns200`
7. `testCustomerAAccessingOwnInvoice_Returns200`

## 7. Test Results
- `CustomerPrivacySecurityTest`: **PASS**
- Full `mvn test` suite: **PASS** (Confirmed existing business logic remains undisturbed).

## 8. Order-Number Security Assessment
**Current Algorithm:** 
`"ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()`
- **Entropy:** 8 hexadecimal characters = 4,294,967,296 possible combinations (approx 32 bits).
- **Security Implications:** While practically unpredictable without brute force, 32 bits of entropy is relatively low for a cryptographic identifier. Due to the Birthday Paradox, order number collisions (two orders generating the same number) become highly probable at around ~65,000 global orders, which would cause database constraint violations and failed checkouts.
- **Recommendation:** No changes made currently, but for scale, the `substring(0, 8)` should be expanded to `substring(0, 12)` or a robust library like NanoId should be adopted.

## 9. Any Remaining Customer-Authentication Limitations
- Currently, users *must* verify their phone via OTP (`GuestTrackingController`) to receive the JWT necessary to view an order. This forces high friction if they just clicked an email link. In a standard ecommerce flow, clicking a one-time magic link from an email or providing the order email as a secondary secret provides better UX.
- The full OTP authentication flow for creating persistent customer profiles rather than just guest tracking has not yet been implemented.
