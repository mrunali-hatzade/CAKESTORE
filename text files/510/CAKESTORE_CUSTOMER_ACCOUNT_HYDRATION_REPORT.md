# CAKESTORE CUSTOMER ACCOUNT HYDRATION REPORT

## 1. Current User Architecture & CUSTOMER Role Behavior
Previously, the `User` table required `email` and `password_hash`. The `UserRole.CUSTOMER` existed but was entirely unused by the guest checkout flow. Guests were issued a temporary `GUEST_ORDER_TRACKER` JWT that was manually validated by storefront controllers, completely bypassing Spring Security and the `User` entity.

## 2. Database Changes & Safe Schema Migration
To support true passwordless authentication without creating fake passwords or placeholder emails:
- A new Flyway migration (`V41__allow_passwordless_customers.sql`) was created.
- This migration executes `ALTER TABLE users ALTER COLUMN email DROP NOT NULL` and `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`.
- The `User` JPA entity was updated to match these constraints. 
- *Note:* This does not break existing Shop Owner or Admin accounts, as the application layer (`AuthService.java`) still rigorously enforces email and password requirements during standard registration and login.
- `mobile` uniqueness is already enforced for all non-null values by `idx_users_mobile_unique` (from `V17`), preventing duplicate accounts for the same phone number.

## 3. Customer Account Creation Logic (Hydration)
`GuestOtpService.verifyOtp()` was refactored:
1. Validates OTP and increments attempts as before.
2. Looks up the `User` via `userRepository.findByMobile(normalizedPhone)`.
3. If no `User` exists, it instantiates and saves a new `User` with `role = CUSTOMER` and `mobile = normalizedPhone` (leaving email and password `null`).
4. Generates a standard `User` JWT rather than a 15-minute tracking token.

## 4. Phone Normalization
Reused the existing robust normalization logic directly within `GuestOtpService` (which defaults to `+91` if no country code is provided, matching the checkout flow assumptions).

## 5. JWT & Authorization Changes
- Modified `GuestOtpService` to append a custom claim `granted_role = CUSTOMER` to the generated JWT.
- Modified `JwtAuthenticationFilter` to inspect incoming tokens for this claim. If present, the filter explicitly overrides and downgrades the Spring Security `Authorities` list to `ROLE_CUSTOMER`.
- **Why this is critical:** If a Shop Owner or Admin uses their phone number to checkout, the backend will issue an OTP token. By explicitly forcing the `ROLE_CUSTOMER` authority at the filter layer for OTP tokens, we guarantee that no one can bypass password authentication to gain `ADMIN` or `SHOP_OWNER` privileges, even if their underlying DB role has high privileges.

## 6. Controller Migrations
- Refactored `CustomerStorefrontController` and `GuestTrackingController` to remove the manual `jwtService.extractGuestPhone` logic.
- They now cleanly rely on `SecurityContextHolder.getContext().getAuthentication()` and enforce `ROLE_CUSTOMER`, unifying them with standard Spring Security practices.

## 7. Files Changed
- `backend/src/main/resources/db/migration/V41__allow_passwordless_customers.sql` (New)
- `backend/src/main/java/com/cakeplatform/api/modules/user/User.java`
- `backend/src/main/java/com/cakeplatform/api/modules/auth/service/GuestOtpService.java`
- `backend/src/main/java/com/cakeplatform/api/security/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontController.java`
- `backend/src/main/java/com/cakeplatform/api/modules/storefront/GuestTrackingController.java`
- `backend/src/test/java/com/cakeplatform/api/modules/auth/service/CustomerAccountHydrationTest.java` (New)
- `backend/src/test/java/com/cakeplatform/api/modules/storefront/CustomerPrivacySecurityTest.java` (Updated)

## 8. Test Results
- Added explicit Account Hydration unit tests validating that new phones create accounts and existing phones reuse accounts without duplicating.
- Updated Customer Privacy tests to use standard `SecurityContext` mocks.
- The full test suite confirms that existing Owner Multi-Tenancy and OTP security remains perfectly intact.
