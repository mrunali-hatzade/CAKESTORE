# CAKESTORE LOOP 3 — PRE-IMPLEMENTATION ACCOUNT RECOVERY AUDIT

## 1. Executive Summary

This pre-implementation audit documents the actual state of the authentication and account recovery infrastructure for the CakeStore platform. The platform currently supports fundamental JWT-based authentication for Login and Registration flows. However, account recovery (Forgot Password, Forgot Login ID) is entirely missing from both the frontend and backend. 

The audit confirms that the existing Loop 1 identity constraints (email uniqueness, phone uniqueness from V17) remain structurally sound. Loop 3 is ready for implementation, pending approval of the proposed minimal architecture for password reset tokens and email dispatch.

**LOOP 3 AUDIT STATUS:** READY FOR IMPLEMENTATION

## 2. Current Authentication Architecture

**STATUS: PARTIAL**

**Backend implementation details:**
- **Spring Security Configuration:** Implements stateless session management with a custom `JwtAuthenticationFilter`.
- **JWT Generation & Validation:** Uses `io.jsonwebtoken` library. Access tokens are generated, but there is no refresh token mechanism.
- **UserDetails:** Custom implementation bridging `User` entity to Spring Security's `UserDetails`.
- **Endpoints:** `AuthController` handles `POST /api/auth/register` and `POST /api/auth/login`.
- **Password Encoding:** Utilizes BCrypt for hashing stored passwords.
- **Roles:** `ROLE_SUPER_ADMIN`, `ROLE_BAKERY_OWNER`, `ROLE_CUSTOMER` are present and enforced via `@PreAuthorize`.

**Frontend implementation details:**
- **Token Storage:** JWTs are stored in cookies/localStorage, handled by `AuthContext`.
- **Protected Routes:** `AuthGuard` successfully intercepts unauthorized access to `/admin` and `/dashboard/owner`.
- **API Interceptors:** Axios is configured to attach the bearer token to outgoing requests.

## 3. Forgot Password — Actual Status

**STATUS: MISSING**

**Backend:**
- Forgot Password API: **MISSING** (No endpoint in `AuthController`)
- Reset Password API: **MISSING**
- Secure Token Generation: **MISSING**
- Token Storage: **MISSING** (No entity/table for reset tokens)

**Frontend:**
- Forgot Password UI: **MISSING** (`/login` contains a "Forgot password?" link, but it points to a static `/contact` page).
- Reset Password UI: **MISSING**

## 4. Forgot Login ID — Actual Status

**STATUS: MISSING**

- **Current Login Identifier:** Email address (`LoginRequest` explicitly validates and demands an email).
- **Alternative Identifiers:** Mobile number exists in the `users` table, but is not configured for login or recovery.
- **Existing Recovery Mechanisms:** None.
- **Recommendation:** No new identity model should be invented. The primary login remains Email. "Forgot Login ID" can be handled simply via a UI prompt directing users to check their standard email inboxes, or by allowing a lookup via registered mobile number, but standard practice favors relying solely on "Forgot Password" for email-based platforms. 

## 5. Email / Mobile Identity Compatibility

**STATUS: IMPLEMENTED (from Loop 1)**

- **Identity Rules:** `email` is `UNIQUE NOT NULL` in the database.
- **V17 Uniqueness:** `V17__owner_identity_and_phone_uniqueness.sql` successfully normalized and deduplicated mobile numbers, enforcing uniqueness constraints for active owners.
- **Compatibility:** The database constraints safely support an email-based password recovery mechanism without risking race conditions or identity collisions.

## 6. Email Infrastructure

**STATUS: MISSING**

- **Resend Integration:** Not present. The `pom.xml` does not contain `resend-java` or `spring-boot-starter-mail` dependencies.
- **Email Service:** No existing email templates or dispatch services exist in the backend. 
- **Assessment:** A new, lightweight email service layer must be introduced to securely dispatch the password reset tokens without overcomplicating the existing architecture.

## 7. Database Assessment

**STATUS: PREPARED FOR UPGRADE**

- **V1-V19 Status:** All 19 migrations are successfully applied and locked.
- **Password Reset Tables:** **MISSING**. 

### Proposed Migration (DESIGN ONLY)
**V20__password_reset_tokens.sql**
```sql
CREATE TABLE password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_prt_token ON password_reset_tokens(token_hash);
CREATE INDEX idx_prt_user ON password_reset_tokens(user_id);
```

## 8. Frontend Assessment

**STATUS: PARTIAL**

- **Login / Registration:** Robust implementations exist (`app/login/page.tsx`, `app/onboarding/page.tsx`).
- **Missing Pages:** `app/forgot-password/page.tsx` and `app/reset-password/page.tsx` need to be built.
- **Design System:** Existing UI components (`Button`, `ErrorState`, inputs) can be natively reused to build the recovery forms seamlessly.

## 9. Security Findings

- **Token Leakage:** Because reset tokens don't exist yet, there are no leaks. 
- **Account Enumeration:** The new Forgot Password API must return a generic 200 OK regardless of whether the email exists in the database to prevent malicious enumeration.
- **Brute Force:** The new endpoints will need to be protected by the existing `RateLimitingFilter` (120 req/min).
- **Token Storage:** The proposed design uses `token_hash` in the database rather than storing raw tokens, mitigating database exposure risks.

## 10. Dependencies

- Requires adding an email dispatch dependency (e.g., Spring Boot Mail or a direct Resend REST client).
- Requires V20 database migration.

## 11. Proposed Minimal Architecture

1. **`POST /api/auth/forgot-password`**: Accepts `{ email }`. If email exists, generates a cryptographic 64-char hex token, hashes it, stores the hash in `password_reset_tokens` (valid for 15 mins), and dispatches an email containing the raw token in a frontend link (`/reset-password?token=...`).
2. **`POST /api/auth/reset-password`**: Accepts `{ token, newPassword }`. Hashes the provided token, looks it up. If valid and `used=false` and unexpired, updates the `users` table password hash, marks the token as used, and returns success.
3. **Frontend Views**: Two new simple pages built with existing Tailwind components.

## 12. Implementation Order

1. Apply V20 Database Migration (Password Reset Tokens).
2. Add backend Email Infrastructure dependencies & service.
3. Implement `AuthRecoveryService` and extend `AuthController`.
4. Build Frontend `/forgot-password` route.
5. Build Frontend `/reset-password` route.
6. Wire UI to API and test end-to-end.

## 13. Risks

- **Email Deliverability:** Without proper domain verification (DKIM/SPF) in development, emails may go to spam. We will need a development override or sandbox mode.
- **Security:** Failure to invalidate previous tokens upon generating a new one, or failure to hash tokens in the DB.

## 14. Test Requirements

- **Backend tests:** 359/359 passing (clean baseline).
- **Frontend lint:** 0 errors (clean baseline). Next.js compiled cleanly.
- Need new integration tests for token generation, expiration limits, and successful password update.

## 15. Explicit Scope Boundaries

- We will **NOT** implement SMS/OTP password recovery.
- We will **NOT** implement refresh tokens in this phase.
- We will **NOT** modify the JWT structure or login API responses.
- We will strictly implement Email-based single-use token password recovery.
