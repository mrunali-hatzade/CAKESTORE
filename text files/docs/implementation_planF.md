# Stage F — Final Launch Certification & GO / NO-GO Audit Implementation Plan

This implementation plan establishes the testing, auditing, and certification protocol for **Stage F**, the final stage of the CakeStore SaaS platform completion roadmap. In accordance with Section 4 (*"GOLDEN RULE — NO SCOPE CREEP"*), this phase introduces **no UI redesigns, no framework replacements, and no speculative features**. Its sole purpose is to rigorously certify production readiness across all functional, security, and infrastructure dimensions, fix only genuine launch blockers, and produce a definitive, evidence-based **GO / NO-GO launch verdict**.

---

## User Review Required

> [!IMPORTANT]
> **Strict Non-Destructive Certification Scope:**
> Stage F will perform zero arbitrary refactoring or speculative feature additions. Stages A, B, C, D, and E represent the accepted production baseline. Code modifications will only occur if an issue meets the strict criteria of a **🔴 BLOCKER** (e.g. authentication bypass, cross-tenant data leak, broken checkout flow, or compilation failure).

> [!IMPORTANT]
> **Reverse Proxy Header Security (`X-Forwarded-For`):**
> In Stage E, `RateLimitingFilter` was enhanced to extract client IP from `X-Forwarded-For`. In accordance with Section 19 of the Stage F specification, we classify this behavior:
> - **Production Requirement**: When deployed behind a standard cloud reverse proxy (Cloudflare, AWS ALB, Nginx, GCP Cloud Load Balancer), the upstream proxy is authoritative and strips or overwrites untrusted client headers, ensuring IP safety.
> - **Direct Internet Exposure Risk**: If the application is ever run directly on the public internet without an upstream proxy, arbitrary client-supplied `X-Forwarded-For` headers could be spoofed.
> - **Resolution**: This will be certified and documented with a clear **🟠 WARNING** in the final deployment checklist, specifying that trusted proxy configuration (or setting Tomcat's `RemoteIpValve` / `server.forward-headers-strategy: framework`) is an operational deployment prerequisite.

> [!IMPORTANT]
> **Live vs. Integration Payment Verification Policy:**
> In accordance with Section 35 (*"IMPORTANT HONESTY REQUIREMENT"*):
> - Real Razorpay checkout on live Indian banking rails requires live business credentials (`rzp_live_...`) and KYC approval from Razorpay.
> - Because live production credentials cannot and must not be committed to the repository, Razorpay integration, HMAC-SHA256 signature verification, server-side authoritative pricing, and raw-body webhook idempotency are certified via automated cryptographic and integration tests, and classified honestly as **`VERIFIED (INTEGRATION / CRYPTO) / ENVIRONMENT-DEPENDENT (LIVE BANKING)`**.
> - Cash on Delivery (COD) is tested end-to-end and certified as **`VERIFIED`**.

> [!NOTE]
> **Zero Database Schema Migrations:**
> All 9 Flyway migrations (`V1` through `V9`) are intact, deterministic, and complete. Stage F requires **zero new database migrations** (`Migration required: NO`).

---

## Proposed Certification Methodology & Areas

### Area F1: Build & Static Verification
- Execute `mvn clean test` in `backend/` ensuring all 156+ tests pass with 0 failures and 0 errors.
- Execute `mvn package -DskipTests` in `backend/` ensuring `api-0.0.1-SNAPSHOT.jar` builds cleanly.
- Execute `npm run build` in `frontend_v2/` ensuring 0 TypeScript errors, 0 ESLint errors, and all 28 routes compile.

---

### Area F2: Environment & Secret Audit
- Perform a whole-repository scan for committed credentials, API keys, and database passwords.
- Verify that `docker-compose.yml` uses strict `JWT_SECRET: ${JWT_SECRET}` with no fallback value.
- Verify `.env.example`, `backend/.env.example`, and `frontend_v2/.env.example` contain only placeholder tokens.
- Verify that sensitive secrets (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `JWT_SECRET`, database password) are never transmitted to the browser.

---

### Area F3: Authentication Certification
- Verify Customer, Shop Owner, and Admin registration and login lifecycles.
- Verify role resolution: Customer receives `ROLE_CUSTOMER`, Owner receives `ROLE_SHOP_OWNER`, and Admin receives `ADMIN` / `ROLE_ADMIN`.
- Verify JWT verification: valid tokens accepted, expired/tampered/malformed tokens rejected with HTTP 401.
- Verify password security: BCrypt hashing, passwords never returned in DTOs or logs.

---

### Area F4: Authorization & Role Matrix
- Verify access enforcement across the role matrix:
  - Customer cannot access `/api/owner/**` or `/api/admin/**`.
  - Owner cannot access `/api/admin/**`.
  - Non-authenticated requests cannot access protected owner or admin endpoints.
  - Public endpoints (`/api/storefront/**`, `/api/health`, `/uploads/**`) are accessible without tokens.

---

### Area F5: Multi-Tenant / IDOR Certification
- Test cross-tenant isolation between two distinct shops (Shop A vs Shop B):
  - Owner A cannot read, modify, or delete Shop B's products, orders, payments, coupons, or documents.
  - Cross-tenant requests to `/api/owner/orders/{foreignId}` return 404 or 403.
  - Cross-tenant invoice downloads are strictly blocked.

---

### Area F6: Shop Owner Complete Flow
- Trace end-to-end owner lifecycle: registration → onboarding → shop creation → KYC submission → product catalog setup → delivery slots → coupon management → kitchen order processing → invoice & payment history.

---

### Area F7: Customer Marketplace Flow
- Trace end-to-end customer journey: marketplace discovery → location filtering → storefront visit → product inspection → cart addition → coupon discount validation → delivery slot selection → checkout → order tracking.

---

### Area F8: Cash on Delivery (COD) Checkout Certification
- Verify guest COD checkout operates independently without Razorpay dependencies.
- Confirm correct order total calculation, order creation, owner order receipt, and customer tracking.

---

### Area F9: Razorpay Payment & Webhook Certification
- Verify server-side authoritative pricing (tampered client amounts ignored).
- Verify constant-time HMAC-SHA256 signature verification for checkout returns and raw webhook payloads.
- Verify webhook idempotency (duplicate `payment.captured` deliveries return HTTP 200 without double-crediting).
- Verify failed payments do not mark orders as confirmed.

---

### Area F10: Coupon & Discount Engine Certification
- Verify percentage and fixed discounts, max discount caps, expiry dates, and usage limits.
- Verify case-insensitive coupon matching.
- Verify atomic usage decrement and discount invariance (`discount >= 0`, `finalTotal >= 0`).

---

### Area F11: Order State Machine
- Audit valid order states (`NEW`, `CONFIRMED`, `PREPARING`, `READY`, `DELIVERED`, `CANCELLED`).
- Verify customers cannot arbitrarily mutate owner-controlled statuses.
- Verify terminal states cannot be erroneously reopened.

---

### Area F12: Subscription Lifecycle & Administrative Precedence
- Verify active subscription, expired subscription, and renewal.
- Verify strict Stage A invariant: **Administrative shop suspension (`SUSPENDED`) takes absolute precedence over subscription renewal/reactivation**.

---

### Area F13: Admin Operations Certification
- Verify Admin dashboard statistics, shop list, shop details, and KYC processing.
- Verify that shop suspension requires a reason and attributes the actor ID.

---

### Area F14: File & Asset Security
- Verify binary magic byte inspection (JPEG, PNG, WEBP, PDF) rejects disguised executables and scripts.
- Verify 5MB size limit and path traversal defenses in `MediaUploadService`.
- Verify KYC documents remain restricted to shop owners and Admins.

---

### Area F15: Rate Limiting Certification
- Verify 3-tier Bucket4j limits: Auth (10/min), Sensitive actions (20/min), Storefront browsing (120/min).
- Verify exemptions for `/api/webhooks/**` and `/api/health`.
- Verify HTTP 429 response formatting with `Retry-After: 60`.

---

### Area F16: CORS & HTTP Security Headers
- Verify allowed origin restrictions from `app.cors.allowed-origins`.
- Verify absence of wildcard `*` headers with credentials.
- Verify presence of `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`.

---

### Area F17: Error Masking & Information Disclosure
- Verify global exception handling masks database errors and internal stack traces.
- Verify `MaxUploadSizeExceededException` returns HTTP 413.

---

### Area F18: Database & Migration Certification
- Verify all 9 Flyway migrations apply cleanly with zero checksum mismatches.
- Explicitly confirm `Migration required: NO`.

---

### Area F19: Docker & Container Runtime
- Verify `backend/Dockerfile` runs as unprivileged user `spring:spring`.
- Verify `docker-compose.yml` does not contain hardcoded credentials or fallback secrets.

---

### Area F20: Health & Operability
- Verify `GET /api/health` returns HTTP 200 with status "UP" and no sensitive keys.

---

### Area F21: Frontend UX Sanity Check
- Verify navigation, responsive layouts, routes, and critical user flows without introducing UI redesigns.

---

### Area F22: Financial Data Consistency
- Verify mathematical consistency: `Subtotal - Discount + Delivery = Final Total`.
- Ensure currency is consistently INR (₹) across checkout, orders, invoices, and analytics.

---

### Area F23: Concurrency & Duplication Risks
- Review concurrency guards for coupon redemptions, payment webhooks, and subscription activations.

---

### Area F24: Production Configuration Matrix
- Compile complete configuration audit table comparing Development vs Production settings.

---

### Area F25: Launch Blocker Classification & Decision
- Classify all findings strictly as 🔴 BLOCKER, 🟠 WARNING, 🟢 PASS, or 🔵 POST-LAUNCH.
- Generate the authoritative final certification artifact: `STAGE_F_FINAL_LAUNCH_CERTIFICATION.md`.

---

## Verification Plan

### Automated Test Execution
```bash
# Backend test execution
cd backend
mvn clean test

# Backend production packaging
mvn package -DskipTests

# Frontend production build
cd ../frontend_v2
npm run build
```

### Manual & Smoke Verification
- End-to-end review of all 28 frontend routes and API endpoints mapped in the smoke matrix.
- Verification of repository secret sanitization.
