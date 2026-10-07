# CAKESTORE CUSTOMER AUTHENTICATION & OTP AUDIT

## 1. Current Authentication Architecture
The system currently uses a fragmented model. Shop Owners and Admins use standard Spring Security login (Email + Password) via the `User` entity. Customers interact exclusively via a "Guest" checkout process. There is no persistent customer account creation happening during checkout or order tracking.

## 2. Existing OTP Implementation
- **Implementation:** `GuestOtpService`, `GuestTrackingController`, and `OtpVerification` entity.
- **Generation:** Uses `SecureRandom` to generate a 6-digit OTP.
- **Storage:** Stored in the `otp_verifications` table.
- **Security:** Hashed using `passwordEncoder.encode()` (bcrypt).
- **Expiration:** Hardcoded to 10 minutes (`OTP_EXPIRY_MINUTES = 10`).
- **Delivery:** Sends OTP via `SmsService` (Twilio implementation).

## 3. GuestTracking Implementation
**Current Flow:**
1. Phone Number submitted to `POST /api/customer/storefront/tracking/request-otp`
2. `GuestOtpService.requestOtp()` normalizes the phone, checks for a 60-second cooldown, generates a 6-digit OTP, hashes it, stores it, and dispatches a Twilio SMS.
3. User submits OTP to `POST /api/customer/storefront/tracking/verify-otp`
4. `GuestOtpService.verifyOtp()` retrieves the hash, verifies attempt limits (max 3), compares the hash using bcrypt, invalidates the OTP on success, and issues a JWT.
5. Customer uses the JWT to call `GET /api/customer/storefront/tracking/orders`.

## 4. JWT Architecture
- **Token Issued:** A short-lived (15 minutes) JWT.
- **Subject:** The normalized phone number.
- **Claims:** `{ "token_type": "GUEST_ORDER_TRACKER", "purpose": "ORDER_HISTORY" }`.
- **Roles:** None. It does NOT issue a `CUSTOMER` role.
- **Security:** It is strictly a temporary capability token. It cannot be used to access persistent user profile endpoints. 

## 5. Customer Database Model
- The `User` table exists and supports a `CUSTOMER` role, but it requires an `email` and `password_hash`.
- The current Guest Order flow creates an `Order` with `customerName`, `customerEmail`, and `customerPhone`, but **does not** create or map to a `User` entity.
- **Current Model:** Guest users only. Persistent accounts are completely unutilized for customers.

## 6. OTP Security
| Finding | Status | Severity |
|---------|--------|----------|
| Brute Force per phone | **PREVENTED** (Max 3 attempts, throws exception) | - |
| Predictable OTP | **PREVENTED** (`SecureRandom`) | - |
| Plaintext Storage | **PREVENTED** (bcrypt hashed) | - |
| Replay Attacks | **PREVENTED** (OTP invalidated on success) | - |
| Missing Expiration | **PREVENTED** (10 minute expiry enforced) | - |
| Phone / SMS Enumeration | **VULNERABLE** (No IP rate limiting on `/request-otp`) | P1 |

*Note on P1 Vulnerability: `RateLimitingFilter.java` explicitly targets `/api/auth/` and `/api/storefront/`, but misses `/api/customer/storefront/tracking/request-otp`. An attacker can mass-request OTPs for arbitrary numbers, causing Twilio SMS Toll Fraud.*

## 7. Third-Party Messaging Integrations
- **Twilio SMS:** **USED** (Configured via `SmsService.java`).
- **Resend (Email):** **USED** (Configured via `EmailService.java` for transactional emails).
- **WhatsApp:** **NOT IMPLEMENTED** (Only exists as a `whatsapp_number` text column in the DB, no API integration).
- **Fast2SMS:** **NOT IMPLEMENTED** (No references in codebase).

## 8. Current vs Missing Capabilities
**Current Capabilities:**
- View own order history via OTP.
- View order details / invoices.
- Track orders.

**Missing Capabilities:**
- WhatsApp delivery.
- SMS fallback (since it's only SMS right now).
- Persistent customer session.
- Customer profile management (address book, favorites).

## 9. UX / Business Decision & Recommendation
**Recommendation: B. Convert GuestTracking into the primary customer authentication system.**

*Why?* The current e-commerce landscape heavily favors passwordless, phone-based authentication (e.g., Swiggy, Zomato). By upgrading the existing `GuestOtpService` to issue standard `User` JWTs (with a `CUSTOMER` role) rather than temporary tracking tokens, we gain several benefits:
1. It unifies the architecture so Shop Owners, Admins, and Customers all use the `User` entity.
2. It allows us to seamlessly create a "shadow account" during checkout that the customer can claim via OTP later.
3. We avoid the friction of forcing customers to create passwords.

## 10. Exact Implementation Roadmap
1. **Fix P1 Vulnerability:** Add `/api/customer/storefront/tracking/request-otp` to the strict `authBuckets` rate limiter in `RateLimitingFilter.java`.
2. **Account Hydration:** Modify `GuestOtpService.verifyOtp()` to look up (or create) a `User` entity with `UserRole.CUSTOMER` based on the phone number.
3. **Upgrade JWT:** Modify the JWT generation in `verifyOtp` to return a standard Authentication JWT rather than a 15-minute guest tracking token.
4. **Order Mapping:** Update `OrderService` so that when a guest places an order, the system silently ties it to the phone number's `User` ID.
5. **WhatsApp Integration:** Implement a `WhatsAppService` using Twilio's WhatsApp API, and update `GuestOtpService` to attempt WhatsApp first, falling back to SMS if it fails.
