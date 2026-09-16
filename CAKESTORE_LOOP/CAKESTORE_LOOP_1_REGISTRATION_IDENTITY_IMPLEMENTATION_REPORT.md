# CAKESTORE LOOP 1: REGISTRATION & IDENTITY INTEGRITY IMPLEMENTATION REPORT

**Loop Status:** PASS  
**Execution Mode:** Controlled Implementation Loop (Strict Scope Boundary)  
**Date:** 2026-09-15  
**Version:** CakeStore V1 — Engineering Loop 1  

---

## 1. OBJECTIVE
The primary objective of Loop 1 was to establish authoritative identity integrity across the PostgreSQL database, Spring Boot backend, and Next.js `frontend_v2`. This ensures that:
- One owner account owns exactly one digital bakery store.
- Global identity rules guarantee one email address per account and one phone number per account.
- Phone numbers are canonically normalized prior to validation, storage, and uniqueness checks.
- Concurrent registration attempts (race conditions) are safely handled without unhandled 500 errors.
- The onboarding wizard enforces password strength, visibility toggling, confirmation checks, and field-specific error handling.
- Development demo shortcuts are eliminated from the production login screen while preserving all Phase 0 and Phase 1 operational lifecycles.

---

## 2. BUSINESS RULES IMPLEMENTED
1. **One Owner $\to$ One Shop**:
   - Enforced at DB level (`uk_shops_owner_id` UNIQUE constraint on `shops(owner_id)`).
   - Enforced at backend level (`shopRepository.existsByOwnerId(user.getId())`).
   - `ShopAccessValidator` detects and rejects unexpected multi-shop ownership rather than arbitrarily defaulting via `shops.get(0)`.
2. **Global Email Uniqueness**:
   - Preserved at DB level (`users.email UNIQUE`).
   - Normalization applied: `trim().toLowerCase()`.
   - Enforced across all roles (Super Admin, Bakery Owner, Customer).
3. **Canonical Phone Uniqueness**:
   - Canonical 10-digit Indian phone normalization applied before uniqueness checks and persistence (`+91 9876543210`, `+919876543210`, `09876543210`, and `9876543210` resolve to `9876543210`).
   - Enforced at DB level (`idx_users_mobile_unique` on `users(mobile)` where `mobile IS NOT NULL AND mobile <> ''`).
4. **Field-Specific Error Transparency**:
   - Duplicate email returns: *"This email is already registered. Please login or use another email."*
   - Duplicate phone returns: *"This phone number is already registered. Please use another number."*
   - Both duplicates return structured error responses allowing frontend to identify and render field-level errors simultaneously.
5. **Phase 1 Lifecycle Preservation**:
   - Registration creates `shop.status = PENDING` and `verificationStatus = PROCESSING` with subscription status `NONE`.
   - Admin verification remains decoupled from shop activation.
   - Payment success remains the authoritative trigger for `shop.status = ACTIVE`.

---

## 3. FILES CHANGED

### Database Layer
- **[NEW]** `backend/src/main/resources/db/migration/V17__owner_identity_and_phone_uniqueness.sql`

### Backend Layer
- **[MODIFY]** `backend/src/main/java/com/cakeplatform/api/security/AdminUserInitializer.java`
- **[MODIFY]** `backend/src/main/java/com/cakeplatform/api/modules/user/UserRepository.java`
- **[MODIFY]** `backend/src/main/java/com/cakeplatform/api/modules/shop/ShopRepository.java`
- **[MODIFY]** `backend/src/main/java/com/cakeplatform/api/exception/DuplicateResourceException.java`
- **[MODIFY]** `backend/src/main/java/com/cakeplatform/api/config/GlobalExceptionHandler.java`
- **[MODIFY]** `backend/src/main/java/com/cakeplatform/api/modules/auth/service/AuthService.java`
- **[MODIFY]** `backend/src/main/java/com/cakeplatform/api/modules/security/ShopAccessValidator.java`
- **[NEW]** `backend/src/test/java/com/cakeplatform/api/modules/auth/RegistrationIdentityIntegrityTest.java`

### Frontend Layer (`frontend_v2`)
- **[MODIFY]** `frontend_v2/app/onboarding/page.tsx`
- **[MODIFY]** `frontend_v2/app/login/page.tsx`

---

## 4. DATABASE MIGRATION DETAILS
Flyway migration `V17__owner_identity_and_phone_uniqueness.sql` was created with non-destructive, idempotent DDL:
```sql
-- 1. Ensure phone/mobile uniqueness for users where mobile is present.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mobile_unique 
    ON users (mobile) 
    WHERE mobile IS NOT NULL AND mobile <> '';

-- 2. Enforce One Owner -> One Digital Bakery Store at the database level.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_shops_owner_id'
    ) THEN
        ALTER TABLE shops ADD CONSTRAINT uk_shops_owner_id UNIQUE (owner_id);
    END IF;
END $$;
```

---

## 5. EXISTING-DATA ANALYSIS
- **Inspection of Existing Shops**: Migration V16 left only 3 shops (Shop 17, Shop 5, Shop 4), each belonging to distinct owners (`owner@sweetdelight.com`, `mrunalithatzade20@gmail.com`, and John's Premium Cakes). Zero multiple-shop ownership conflicts exist in the database.
- **Bootstrap Data Conflict Avoidance**: `AdminUserInitializer.java` previously assigned `"9876543210"` to both `demoOwner` and `newUser`. Verified that both records were programmatic bootstrap fixtures, not real customer records. Adjusted `newUser`'s bootstrap mobile to `"9876543211"`, completely avoiding constraint violations during application bootstrap. No customer or real bakery data was modified or deleted.

---

## 6. BACKEND CHANGES
1. **Canonical Normalization**:
   - `AuthService.normalizeEmail`: Trims leading/trailing whitespace and converts to lower case.
   - `AuthService.normalizeIndianMobile`: Strips non-digits, strips leading international dial code `91` (if 12 digits) or leading `0` (if 11 digits), yielding the canonical 10-digit number.
2. **Authoritative Duplicate Checks**:
   - Uses `userRepository.findByEmail` / `existsByEmailIgnoreCase` and `userRepository.findByMobile` / `existsByMobile`.
   - Collects errors in `fieldErrors` map.
   - Throws `DuplicateResourceException(errorMessage, fieldErrors)`.
3. **One Owner $\to$ One Shop Protection**:
   - `shopRepository.existsByOwnerId(savedUser.getId())` checked prior to shop creation.
   - `ShopAccessValidator.getShopByOwnerId`: Throws `IllegalStateException` with clear diagnostic logs if multiple shops are found for a single owner, refusing to mask data integrity issues.
4. **Race Condition Handling**:
   - Added `@ExceptionHandler(DataIntegrityViolationException.class)` in `GlobalExceptionHandler`.
   - Inspects SQL error cause for constraint names (`idx_users_mobile_unique`, `users_email_key`, `uk_shops_owner_id`).
   - Translates database race-condition collisions into user-friendly HTTP 409 responses with exact field keys.

---

## 7. FRONTEND CHANGES
1. **Onboarding Wizard (`frontend_v2/app/onboarding/page.tsx`)**:
   - **Step 1 Validation**:
     - RFC email format validation.
     - Indian 10-digit mobile validation (`^[6-9]\d{9}$`).
     - Minimum 8 character password length.
     - Confirm password field with real-time mismatch feedback ("Passwords do not match.").
     - `confirmPassword` is frontend-only and never transmitted to the API.
   - **Password Visibility**: Eye/EyeOff toggle buttons added to both Password and Confirm Password inputs.
   - **Password Strength Meter**: Dynamic evaluation scoring length and character variety into Weak (Red), Medium (Amber), or Strong (Green) indicators with a segmented progress bar.
   - **Field-Specific Error States**:
     - Displays `phoneError` and `emailError` directly beneath inputs.
     - When email is duplicate, displays a prominent "Login instead?" redirect link.
     - On submit failure (Step 3), the wizard automatically navigates back to Step 1 (`setStep(1)`), highlights the conflicting field, and preserves all other entered bakery details.
   - **Copy Realignment**: Replaced free-trial copy with *"Create Your Bakery Store • ₹350/mo"*.
2. **Login Page (`frontend_v2/app/login/page.tsx`)**:
   - Removed Quick Test Autofill demo buttons (`Owner Demo`, `Admin Demo`) and unused helper methods.
   - Updated registration copy from *"Register Your Bakery (Free 14-Day Trial)"* to *"Register Your Bakery"*.

---

## 8. API BEHAVIOR
- `POST /api/auth/register` (Multipart / Form-Data):
  - Normalized email and canonical 10-digit mobile persisted.
  - Returns `200 OK` with `AuthResponse` (`shopStatus: "PENDING"`, `subscriptionStatus: "NONE"`).
  - Returns `409 CONFLICT` when email exists, mobile exists, or owner already has a shop.
- `POST /api/auth/login` (JSON):
  - Normalizes email case-insensitively before credentials check.
  - Returns `200 OK` with JWT containing `sub`, `role`, and `shopId`.

---

## 9. ERROR HANDLING
Sample response for duplicate email:
```json
{
  "error": "This email is already registered. Please login or use another email.",
  "email": "This email is already registered. Please login or use another email.",
  "fieldErrors": {
    "email": "This email is already registered. Please login or use another email."
  }
}
```
Sample response for concurrent duplicate mobile race condition:
```json
{
  "error": "This phone number is already registered. Please use another number.",
  "mobile": "This phone number is already registered. Please use another number.",
  "fieldErrors": {
    "mobile": "This phone number is already registered. Please use another number."
  }
}
```

---

## 10. SECURITY CONSIDERATIONS
- **Data Protection**: Passwords continue to be salted and hashed via Spring Security's `PasswordEncoder` (BCrypt). `confirmPassword` is strictly ephemeral and never passed to the network or logged.
- **Tenant Isolation**: `ShopAccessValidator` strictly gates owner data access, preventing IDOR and ensuring each authenticated owner accesses only their single registered bakery.
- **Credential Integrity**: Case-insensitive email handling prevents account spoofing through casing tricks (`User@domain.com` vs `user@domain.com`).
- **Sanitized Outputs**: No database stack traces or SQL exception internals are exposed to clients.

---

## 11. TESTS ADDED / UPDATED
Added comprehensive automated test suite `RegistrationIdentityIntegrityTest.java` with 12 targeted test cases:
1. `testNewOwnerRegistration_Succeeds_WithPendingAndProcessing`: Proves new owner gets `PENDING` shop, `PROCESSING` verification, and `NONE` subscription.
2. `testCanonicalPhoneNormalization`: Proves canonicalization across `+91 9876543210`, `+919876543210`, `09876543210`, and `9876543210`.
3. `testDuplicateEmail_Rejected_FieldSpecificError`: Verifies field error on duplicate email.
4. `testDuplicatePhone_Rejected_FieldSpecificError`: Verifies field error on duplicate phone across formatted inputs.
5. `testDuplicateEmailAndPhone_StructuredErrorsForBothFields`: Verifies multi-field error payload when both collide.
6. `testOneOwnerToOneShop_SecondShopRejected`: Verifies owner cannot create a second shop.
7. `testShopAccessValidator_RejectsMultipleShops`: Verifies detection of multi-shop data integrity violation.
8. `testGlobalExceptionHandler_DuplicateResource`: Verifies HTTP 409 response structure with field errors.
9. `testGlobalExceptionHandler_MobileRaceCondition`: Verifies handling of database mobile constraint collision.
10. `testGlobalExceptionHandler_EmailRaceCondition`: Verifies handling of database email constraint collision.
11. `testGlobalExceptionHandler_OwnerRaceCondition`: Verifies handling of database owner constraint collision.
12. `testLogin_EmailNormalization`: Verifies case-insensitive email login authentication.

Updated `PhaseGCommunicationTest.java` to seamlessly integrate with dual-method duplicate checking without stubbing discrepancies.

---

## 12. COMPLETE TEST RESULTS
- **Spring Boot Backend Test Suite**:
  ```
  [INFO] Results:
  [INFO] Tests run: 321, Failures: 0, Errors: 0, Skipped: 0
  [INFO] ------------------------------------------------------------------------
  [INFO] BUILD SUCCESS
  [INFO] Total time:  16.967 s
  ```
- **Registration & Identity Integrity Test Suite**:
  ```
  [INFO] Running com.cakeplatform.api.modules.auth.RegistrationIdentityIntegrityTest
  [INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0
  [INFO] BUILD SUCCESS
  ```

---

## 13. BUILD RESULTS
- **TypeScript Static Verification**:
  ```
  npx tsc --noEmit
  Exit Code: 0 (Zero type errors)
  ```
- **ESLint Code Quality**:
  ```
  npm run lint
  Exit Code: 0 (Zero lint errors)
  ```
- **Next.js Production Build**:
  ```
  npm run build
  Exit Code: 0
  Compiled successfully, 32/32 static & dynamic pages generated.
  ```

---

## 14. REGRESSION VERIFICATION
Verified that all Phase 0 and Phase 1 subsystems remain fully functional:
- **Payment Activation**: `OwnerPaymentService` and `WebhookController` HMAC verification and activation remain intact.
- **Admin Review**: Admin verification updates `verificationStatus = VERIFIED` without mutating `shop.status`.
- **Subscription Expiry**: Operational APIs remain blocked on expired subscriptions, while public customer storefront browsing is preserved.
- **Shop Suspension**: Suspended shops remain blocked from operational and storefront actions.
- **Multi-Tenant Security**: Tenant isolation maintained across all owner controllers via `ShopAccessValidator`.

---

## 15. REMAINING GAPS (INTENTIONALLY DEFERRED TO LATER LOOPS)
- Dynamic subscription plan lookup in payment initiation (Loop 2).
- Reverse-geocoding / Real GPS geolocation hook and dynamic location cascading (Loop 2).
- Public shop slugs (`/shop/[slug]`) and SEO routing (Loop 3).
- Password recovery / Forgot password workflow.

---

## 16. EXPLICIT CONFIRMATION OF BOUNDARIES
The following features were **STRICTLY UNTOUCHED** as required by Loop 1 boundaries:
- ❌ NO location master data or Google Maps/Mapbox integration
- ❌ NO GPS nearby search or radius queries
- ❌ NO subscription-plan pricing redesign or versioning
- ❌ NO storefront slugs or custom domains
- ❌ NO forgot password or forgot ID backend workflows
- ❌ NO marketplace redesign

---

## FINAL STATUS
**PASS** — All Loop 1 requirements, business rules, database migrations, backend validations, frontend enhancements, and regression tests are verified and passing.
