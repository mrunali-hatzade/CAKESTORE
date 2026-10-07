# Stage E — Production Infrastructure & Security Hardening Implementation Plan

This implementation plan details the architectural enhancements and hardening steps required to complete **Stage E** of the CakeStore platform roadmap, establishing production-grade infrastructure, API abuse protection, asset upload security, and observability while strictly preserving all accepted Stage A, B, C, and D invariants.

---

## User Review Required

> [!IMPORTANT]
> **Zero Database Schema Migrations:**
> A comprehensive inspection of the existing 10 Flyway migrations (`V1` through `V10`) confirms that all database schema requirements are fully satisfied. Stage E introduces no schema modifications and requires **zero new Flyway migrations**.

> [!IMPORTANT]
> **Filesystem Asset Storage Hardening (No External Cloudinary Dependency Introduced):**
> PRD analysis and the codebase audit confirm that CakeStore currently operates on a local/container filesystem storage model (`/uploads/**`) orchestrated by `MediaUploadService`. Rather than introducing unconfigured external Cloudinary credentials that would break local and CI environments, Stage E hardens the existing storage layer with:
> - Strict subdirectory whitelisting (`products`, `covers`, `logos`, `documents`) preventing path traversal.
> - Magic bytes validation inspecting actual file headers (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WEBP `RIFF...WEBP`, PDF `%PDF`).
> - Case-insensitive extension whitelisting (`.jpg, .jpeg, .png, .webp, .pdf`).
> - Empty file rejection and 5MB size enforcement.
> - KYC documents remain strictly access-gated by authenticated owner ID and Admin role.

> [!IMPORTANT]
> **Multi-Tiered Rate Limiting without Customer Browsing Friction:**
> To eliminate the flaw in the current `RateLimitingFilter` (which applies a blanket 20 req/min limit to all storefront requests), Stage E implements distinct Bucket4j tiers:
> 1. **Auth Endpoints** (`/api/auth/**`): 10 req/min per client IP (brute-force defense).
> 2. **Abuse-Sensitive Endpoints** (coupon validation, payment verification, order payment creation, enquiries): 20 req/min per client IP.
> 3. **Storefront Browsing** (`/api/storefront/**` catalog and shop endpoints): 120 req/min per client IP (smooth user experience).
> 4. **Exempt Endpoints**: `/api/webhooks/**` (Razorpay webhooks protected by HMAC-SHA256) and `/api/health`.
> 5. **Standardized Response**: JSON 429 with `Retry-After: 60` header and structured error body.

---

## Proposed Changes

### Component 1: Configuration & Profile Hardening (E1, E7)

#### [MODIFY] [application.yml](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/resources/application.yml)
- Set SQL query logging to environment-controlled: `show-sql: ${SHOW_SQL:false}`.
- Configure production-safe HikariCP connection pool settings:
  ```yaml
  hikari:
    maximum-pool-size: ${DB_POOL_MAX_SIZE:10}
    minimum-idle: ${DB_POOL_MIN_IDLE:2}
    idle-timeout: ${DB_POOL_IDLE_TIMEOUT:30000}
    max-lifetime: ${DB_POOL_MAX_LIFETIME:1800000}
    connection-timeout: ${DB_POOL_CONN_TIMEOUT:20000}
  ```
- Bind CORS allowed origins to property: `app.cors.allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000,http://localhost:3001,http://localhost:3002}`.
- Mask SQL details in default logging levels.

#### [NEW] [application-prod.yml](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/resources/application-prod.yml)
- Define dedicated production profile:
  - `show-sql: false`
  - `format_sql: false`
  - Strict logging levels (`root: INFO`, `org.hibernate.SQL: WARN`, `com.cakeplatform.api: INFO`).

---

### Component 2: CORS & HTTP Security Headers (E2)

#### [MODIFY] [SecurityConfig.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/security/SecurityConfig.java)
- Inject `app.cors.allowed-origins` property.
- Configure `CorsConfigurationSource` with:
  - Allowed origins from property (comma-separated list).
  - Explicit allowed headers: `Authorization`, `Content-Type`, `Accept`, `Origin`, `X-Requested-With`, `Access-Control-Request-Method`, `Access-Control-Request-Headers`.
  - Exposed headers: `Retry-After`, `Content-Disposition`.
  - `allowCredentials(true)` safe with specific non-wildcard origins.
- Configure HTTP security headers:
  - `X-Content-Type-Options: nosniff` via `headers.contentTypeOptions(...)`.
  - `X-Frame-Options: SAMEORIGIN` via `headers.frameOptions(f -> f.sameOrigin())`.
  - `Referrer-Policy: strict-origin-when-cross-origin` via `headers.referrerPolicy(...)`.
- Permit unauthenticated access to `/api/health`.
- Preserve `/api/webhooks/**` permitAll without browser CORS interference.

#### [MODIFY] [WebMvcConfig.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/config/WebMvcConfig.java)
- Align or delegate `addCorsMappings` with the same injected allowed origins and explicit headers, eliminating duplicate conflicting wildcards.

---

### Component 3: API Rate Limiting & Abuse Protection (E4)

#### [MODIFY] [RateLimitingFilter.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/security/RateLimitingFilter.java)
- Add client IP resolution supporting `X-Forwarded-For` proxy headers.
- Separate Bucket4j caches by tier:
  - `authBuckets`: 10 req/min.
  - `sensitiveBuckets`: 20 req/min (coupons, payments, enquiry, uploads).
  - `storefrontBuckets`: 120 req/min (catalog browsing).
- Bypass webhooks (`/api/webhooks/**`) and health check (`/api/health`).
- Return JSON HTTP 429 response:
  - Header: `Retry-After: 60`
  - Header: `Content-Type: application/json`
  - Body: `{"error":"Too Many Requests","message":"Rate limit exceeded. Please try again later.","retryAfter":60}`

---

### Component 4: Upload Validation & KYC Storage Security (E3, E5)

#### [MODIFY] [MediaController.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/media/MediaController.java)
- Check for empty files (`file.isEmpty() || file.getSize() == 0`).
- Validate `type` / `subDirectory` against strict whitelist: `products`, `covers`, `logos`, `documents`. Reject path traversal (`..`, `/`, `\`).
- Validate file extension against whitelist: `.jpg, .jpeg, .png, .webp, .pdf`.
- Validate file magic bytes by reading initial byte header:
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47`
  - WEBP: `RIFF....WEBP`
  - PDF: `%PDF`
- Return clear HTTP 400 for corrupt or spoofed files.

#### [MODIFY] [MediaUploadService.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/media/MediaUploadService.java)
- Sanitize subdirectory input and ensure safe path resolution against base upload directory.

---

### Component 5: Observability & Global Exception Handling (E6)

#### [NEW] [HealthController.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/common/HealthController.java)
- Minimal unauthenticated `GET /api/health` returning:
  `{"status":"UP","service":"cake-platform-api","timestamp":"2026-09-09T..."}`.
- Zero secrets or system environment variables exposed.

#### [MODIFY] [GlobalExceptionHandler.java](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/config/GlobalExceptionHandler.java)
- Add handler for `MaxUploadSizeExceededException.class` returning HTTP 413 Payload Too Large (`{"error": "File size exceeds maximum allowed limit (5MB)"}`).
- Add handler for generic `Exception.class` returning HTTP 500 (`{"error": "An unexpected error occurred. Please contact support."}`) while logging the internal cause via SLF4J, completely preventing SQL query or stack trace exposure to clients.

---

### Component 6: Deployment & Environment Safety (E8)

#### [MODIFY] [backend/Dockerfile](file:///d:/PROJECTS/CAKE%20SAAs1/backend/Dockerfile)
- Create non-root system group and user (`spring:spring`).
- Change directory ownership to `spring:spring` and set `USER spring:spring` before runtime execution.

#### [MODIFY] [docker-compose.yml](file:///d:/PROJECTS/CAKE%20SAAs1/docker-compose.yml)
- Replace hardcoded `JWT_SECRET` with environment-variable fallback syntax: `${JWT_SECRET:-404E6352...}`.

#### [NEW] [.env.example](file:///d:/PROJECTS/CAKE%20SAAs1/.env.example), [backend/.env.example](file:///d:/PROJECTS/CAKE%20SAAs1/backend/.env.example), [frontend_v2/.env.example](file:///d:/PROJECTS/CAKE%20SAAs1/frontend_v2/.env.example)
- Provide clear, sanitized environment templates documenting all production variables with placeholder values only (no real credentials).

---

## Verification Plan

### Automated Tests
Create `backend/src/test/java/com/cakeplatform/api/modules/security/StageEProductionHardeningTest.java` with tests covering:
1. **CORS Hardening**:
   - Authorized origin in `app.cors.allowed-origins` is accepted with appropriate CORS headers.
   - Unauthorized origin does not receive allow-origin header.
   - Wildcard `*` is not used in combination with credentials.
2. **Security Headers**:
   - Responses include `X-Content-Type-Options: nosniff`.
   - Responses include `X-Frame-Options: SAMEORIGIN`.
   - Responses include `Referrer-Policy: strict-origin-when-cross-origin`.
3. **Multi-Tier Rate Limiting**:
   - Rapid auth requests exceed 10/min and return HTTP 429 with `Retry-After: 60` and JSON body.
   - Storefront browsing requests within threshold succeed.
   - Health check `/api/health` and webhooks `/api/webhooks/**` are not blocked by rate limiting.
4. **Upload Validation & Magic Bytes**:
   - Valid PNG/JPEG with legitimate headers accepted.
   - Spoofed file (text file renamed to `.jpg`) rejected with HTTP 400.
   - Empty file rejected with HTTP 400.
   - Invalid / path-traversing subdirectory rejected with HTTP 400.
5. **Observability & Error Masking**:
   - `GET /api/health` returns HTTP 200 with status "UP" and no secrets.
   - Oversized upload triggers HTTP 413 rather than uncaught 500.
   - Unexpected exceptions return safe client message without stack traces or SQL.
6. **Multi-Tenant & Role Isolation**:
   - Owner A cannot access Owner B's business documents.
   - Non-admin cannot access admin endpoints.
   - Customer cannot access owner endpoints.
7. **Regression Suite**:
   - Execute full Maven test suite: `mvn test` in `backend/` (all 139 existing tests + Stage E tests = **155+ tests** passing).

### Frontend Verification
- Run `npm run build` in `frontend_v2/` to ensure:
  - 0 TypeScript errors
  - 0 ESLint errors
  - All 28 existing routes compile and optimize cleanly.
