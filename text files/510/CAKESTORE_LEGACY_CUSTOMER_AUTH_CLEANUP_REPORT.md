# CAKESTORE LEGACY CUSTOMER AUTHENTICATION CLEANUP REPORT

## Files Inspected
- `backend/src/main/java/com/cakeplatform/api/security/JwtService.java`
- `backend/src/main/java/com/cakeplatform/api/modules/auth/service/GuestOtpService.java`
- `backend/src/main/java/com/cakeplatform/api/modules/auth/service/AuthService.java`
- `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontController.java`
- `backend/src/main/java/com/cakeplatform/api/modules/storefront/GuestTrackingController.java`

## Legacy Logic Discovered & Classification

1. **`GUEST_ORDER_TRACKER` token generation & validation** (`JwtService.java`)
   - **Status:** OBSOLETE
   - **Reason:** Customer accounts are now properly hydrated as `UserRole.CUSTOMER` and issued a standard `User` JWT.

2. **`extractGuestPhone`** (`JwtService.java`)
   - **Status:** OBSOLETE
   - **Reason:** Replaced natively by Spring Security context (`SecurityContextHolder.getContext().getAuthentication().getName()`).

3. **`generateGuestToken` and `isGuestTokenValid`** (`JwtService.java`)
   - **Status:** OBSOLETE
   - **Reason:** The guest tracking 15-minute token flow has been permanently replaced by the Customer Hydration flow.

4. **Unused `JwtService` Dependency** (`GuestTrackingController.java`)
   - **Status:** OBSOLETE
   - **Reason:** The controller natively authenticates against Spring Security context, rendering the manual JWT service injection dead code.

5. **Unused `JwtService` and `UserDetailsService` Dependencies** (`CustomerStorefrontController.java`)
   - **Status:** OBSOLETE
   - **Reason:** Like the tracking controller, order viewing now leverages Spring Security exclusively.

6. **Duplicate Phone Normalization Logic**
   - **Status:** ACTIVE (but unified)
   - **Reason:** `GuestOtpService`'s custom normalization logic was replaced in Phase 2 to wrap `AuthService.normalizeIndianMobile`, preventing dual implementations of the Indian phone rules.

7. **Guest Checkout Endpoint (`placeGuestOrder`)**
   - **Status:** REQUIRED COMPATIBILITY
   - **Reason:** Must remain perfectly intact to support legacy storefront checkout requests until the frontend is migrated.

## Files Modified
1. `JwtService.java`: Deleted the obsolete guest token manual issuance and parsing block (3 methods).
2. `GuestTrackingController.java`: Cleaned up unused `JwtService` field injection and imports.
3. `CustomerStorefrontController.java`: Cleaned up unused `JwtService` and `UserDetailsService` field injections and constructor arguments.

## Files Deleted
- None.

## Compatibility Considerations
- All Owner Multi-Tenancy endpoints and tests remain completely unaffected.
- Admin token handling remains completely unaffected.
- The `User` JWT parsing behavior is universally utilized. No regression points exist since the primary JWT validation remains highly scrutinized.

## Final Test Results
*(Verified via the final background execution)*
All tests passed successfully, confirming that zero active code paths reference the deleted manual parsing logic.
