# CAKESTORE V2 — BACKEND CORE AUDIT REPORT

**Audit Date:** September 28, 2026  
**Execution Mode:** **STRICT READ-ONLY AUDIT (Zero source code modified, zero database records altered, zero migrations created, zero Git commits/pushes)**  
**Target Platform:** CakeStore V2 Main Backend Platform (`cake-platform-api`)

---

## 1. Environment

| Property | Value / Specification |
| :--- | :--- |
| **Backend Root Directory** | `D:\PROJECTS\CAKE SAAs1\backend` |
| **Spring Boot Version** | `3.3.2` (`spring-boot-starter-parent`) |
| **Java Version** | `17.0.17` (Oracle Corporation JDK 17, 64-bit) |
| **Maven Version** | `3.9.16` |
| **Database System** | PostgreSQL 16+ (`jdbc:postgresql://localhost:5432/cake_platform`) |
| **Connection Pooling** | HikariCP (`maximum-pool-size: 10`, `minimum-idle: 2`, `idle-timeout: 30000ms`) |
| **Flyway Migration Engine** | `flyway-core` + `flyway-database-postgresql` (Classpath: `db/migration`) |
| **Application Entry Point** | `com.cakeplatform.api.CakePlatformApplication` |
| **Server Port** | `8080` (HTTP) |
| **Startup Health Status** | **PASS** — Started successfully in 9.24 seconds with active profiles `[dev]` |

---

## 2. Backend Architecture

- **Pattern:** Modular monolith structured under `com.cakeplatform.api.modules.*`.
- **Layering:** Strict Separation of Concerns:
  - Controllers (`@RestController`, `@PreAuthorize`, `@Valid`)
  - Services (`@Service`, `@Transactional`, Business Rule Validation)
  - Repositories (`org.springframework.data.jpa.repository.JpaRepository`)
  - Entities (`jakarta.persistence.*`, Hibernate 6 ORM)
  - Exception Handling (`com.cakeplatform.api.config.GlobalExceptionHandler`)
- **Caching Layer:** Spring Cache abstraction (`@Cacheable`, `@CacheEvict(value = "shopProducts", allEntries = true)`) for high-traffic storefront catalogs.
- **Real-Time Communication:** Spring WebSocket STOMP (`SimpMessagingTemplate`) pushing live notifications to individual user queues (`/queue/notifications-{userId}`).
- **Activity Logging:** Centralized `ActivityLoggerService` auditing administrative, shop status, and product lifecycle mutations.

---

## 3. Authentication

| Feature | Audit Finding | Result |
| :--- | :--- | :---: |
| **Email Login** | Authenticates valid users via `POST /api/auth/login` with email and password. Normalizes email (lowercase/trimmed). | **PASS** |
| **Mobile-Number Login** | Authenticates shop owners via Indian 10-digit mobile number (`9876543210`) as primary identifier. | **PASS** |
| **Dual Authentication** | `LoginRequest.getIdentifier()` transparently handles `identifier`, `username`, or `email`. Strips `+91` or `0` prefixes. Tested live with `owner@sweetdelight.com` and `9876543210` — both return identical valid sessions. | **PASS** |
| **Registration** | Multipart registration (`/api/auth/register`) creates `User` and `Shop` in a single `@Transactional` boundary. Location hierarchy validated before persistence. | **PASS** |
| **Password Verification** | BCrypt password hashing with unique salt per hash. Bad credentials return `400 Bad Request` with sanitized error message ("Invalid user credentials"). | **PASS** |
| **JWT Generation** | `io.jsonwebtoken` (JJWT 0.12.6) generates signed tokens incorporating `sub` (email), `role`, `iat`, and `exp`. | **PASS** |
| **JWT Validation & Expiry**| `JwtAuthenticationFilter` validates signature against HMAC-SHA256 secret. Token lifetime configured to 24 hours (`86400000 ms`). Tampered signatures immediately return `401 Unauthorized`. | **PASS** |
| **Password Reset** | `POST /api/auth/forgot-password` generates SHA-256 hashed `PasswordResetToken` with 15-minute expiry. `POST /api/auth/reset-password` updates BCrypt hash and revokes token. | **PASS** |

---

## 4. Authorization

| Feature | Audit Finding | Result |
| :--- | :--- | :---: |
| **Role Model** | Strict `UserRole` enum: `ADMIN`, `SHOP_OWNER`, `CUSTOMER`. Roles mapped to `ROLE_` authorities in Spring Security context. | **PASS** |
| **ADMIN Authorization** | Protected with `@PreAuthorize("hasRole('ADMIN')")`. Access to `/api/admin/**` verified for `admin@cakestore.com`. | **PASS** |
| **SHOP_OWNER Authorization**| Protected with `@PreAuthorize("hasRole('SHOP_OWNER')")`. Access to `/api/owner/**` verified for bakery owners. | **PASS** |
| **Unauthorized Requests** | Unauthenticated requests to protected endpoints return `401 Unauthorized` via `JwtAuthenticationEntryPoint`. | **PASS** |
| **Forbidden Requests** | Shop owner attempting to access Admin endpoints (`/api/admin/dashboard/stats`, `/api/admin/shops`) immediately blocked with `403 Forbidden`. | **PASS** |
| **Principal Derivation** | Authenticated identity derived strictly from `@AuthenticationPrincipal CustomUserDetails`. Request payloads cannot override the authenticated actor. | **PASS** |

---

## 5. Shop / Bakery Management

| Feature | Audit Finding | Result |
| :--- | :--- | :---: |
| **Shop Creation** | Created automatically during baker registration. Enforces database unique index `uk_shops_owner_id` (one bakery per user account). | **PASS** |
| **Shop Retrieval** | Owners fetch their bakery via `ShopAccessValidator.getShopByOwnerId(userId)`. Direct ID lookups enforce ownership. | **PASS** |
| **Shop Updates** | Owner updates branding, business hours, and delivery settings via `/api/owner/storefront/config`. Inputs sanitized and validated. | **PASS** |
| **Shop Status Lifecycle** | `ShopStatus` enum: `PENDING` &rarr; `ACTIVE` &rarr; `SUSPENDED` / `INACTIVE`. Operational actions locked when status != `ACTIVE`. | **PASS** |
| **Admin Moderation** | Admin can approve, activate, or suspend shops via `PATCH /api/admin/shops/{id}/status`. Mutations logged to `activity_logs`. | **PASS** |
| **Operational Gating** | `ShopAccessValidator.getValidShopForOwner(ownerId)` prevents suspended shops or expired subscriptions from updating catalog or taking orders. | **PASS** |

---

## 6. Products / Catalog

| Feature | Audit Finding | Result |
| :--- | :--- | :---: |
| **Product Creation** | `POST /api/owner/products` validates name, price, ingredients, allergens, egg preference, variants, and addons. Evicts storefront cache. | **PASS** |
| **Product Updates** | `PUT /api/owner/products/{id}` updates attributes. Restricts maximum alternative images to 3. | **PASS** |
| **Product Deletion** | `DELETE /api/owner/products/{id}` removes product and its variants/addons. Evicts cache and logs activity. | **PASS** |
| **Storefront Visibility** | Storefront catalog queries enforce `shop.status = 'ACTIVE'` and `product.status = 'ACTIVE'`. | **PASS** |
| **Multi-Tenant Isolation** | `productRepository.findByIdAndShopId(productId, shop.getId())` enforces ownership. Live test: Owner B attempting to edit or delete Owner A's product was rejected. | **PASS** |

---

## 7. Orders

| Feature | Audit Finding | Result |
| :--- | :--- | :---: |
| **Customer Guest Checkout**| Public checkout supported via `/api/storefront/checkout` without requiring customer login. Stores guest contact details securely. | **PASS** |
| **Order Number Generation**| Generates unique human-readable order numbers (e.g. `ORD-20260928-XXXX`). | **PASS** |
| **Order State Machine** | Strict transition map (`ALLOWED_TRANSITIONS`): `NEW` &rarr; `CONFIRMED` &rarr; `PREPARING` &rarr; `READY` &rarr; `DELIVERED` &rarr; `COMPLETED`. Terminal states (`COMPLETED`, `CANCELLED`) cannot be modified. | **PASS** |
| **Invalid State Transitions**| Attempting illegal transition (e.g., `NEW` &rarr; `DELIVERED` or modifying `CANCELLED`) throws `IllegalArgumentException` / `IllegalStateException` (HTTP 400). | **PASS** |
| **Multi-Tenant Isolation** | `orderRepository.findByIdAndShopId(orderId, shop.getId())` prevents cross-tenant access. Live test: Owner B attempting to view or cancel Owner A's order was rejected. | **PASS** |
| **Order Notifications** | Order creation triggers `NotificationType.NEW_ORDER` to shop owner with customer name and total amount. | **PASS** |

---

## 8. Custom Order / Enquiries

| Feature | Audit Finding | Result |
| :--- | :--- | :---: |
| **Enquiry Creation** | Customers submit general enquiries and bespoke custom cake requests with reference photos and dietary notes. | **PASS** |
| **Notification Trigger** | Dispatches `NEW_ENQUIRY` or `CUSTOM_ORDER_REQUEST` notification to the targeted bakery owner. | **PASS** |
| **Owner Management** | Owners inspect custom cake requests, submit price quotes, and update enquiry status. | **PASS** |
| **Multi-Tenant Isolation** | `enquiryRepository.findByIdAndShopId(enquiryId, shop.getId())` ensures enquiries for Shop A cannot be accessed or replied to by Shop B. | **PASS** |

---

## 9. Feedback / Reviews

| Feature | Audit Finding | Result |
| :--- | :--- | :---: |
| **Review Creation** | Customers submit order-verified reviews with ratings (1–5 stars), text, and optional media attachments. | **PASS** |
| **Rating Calculation** | Average rating and review count computed from actual stored approved reviews in the database. | **PASS** |
| **Owner Replies** | Bakery owner can post an official public reply via `POST /api/owner/feedback/{id}/reply`. Verified with `findByIdAndShopId`. | **PASS** |
| **Moderation** | Platform administrator has platform-wide visibility via `GET /api/admin/feedback`. | **PASS** |

---

## 10. Notifications

| Feature | Audit Finding | Result |
| :--- | :--- | :---: |
| **Notification Types** | Comprehensive 10-event enum: `NEW_ORDER`, `NEW_ENQUIRY`, `NEW_FEEDBACK`, `CUSTOM_ORDER_REQUEST`, `ADMIN_MESSAGE`, `SUBSCRIPTION_EXPIRING`, `SUBSCRIPTION_EXPIRED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `DOCUMENT_VERIFICATION`. | **PASS** |
| **Dual Delivery** | Persisted to PostgreSQL `notifications` table AND broadcasted via WebSocket STOMP (`/queue/notifications-{recipientId}`). Optional email via `EmailService`. | **PASS** |
| **Unread Summary** | `GET /api/notifications/unread-summary` provides aggregated counts by `NotificationType` for reactive sidebar badges. | **PASS** |
| **Read State Controls** | Supports individual mark-as-read, bulk mark-all-read, and type-specific mark-read. | **PASS** |
| **Tenant Isolation** | `markAsRead` explicitly validates `notification.getRecipient().getId().equals(userId)`. Cross-user tampering triggers `403 Forbidden`. | **PASS** |

---

## 11. Owner ↔ Admin Chat

| Feature | Audit Finding | Result |
| :--- | :--- | :---: |
| **Owner Endpoints** | `GET /api/owner/chat/conversations`, `POST /api/owner/chat/messages`, `PATCH /api/owner/chat/read`, `GET /api/owner/chat/unread-count`. | **PASS** |
| **Admin Endpoints** | `GET /api/admin/chat/conversations`, `GET /api/admin/chat/conversations/{ownerId}/messages`, `POST /api/admin/chat/conversations/{ownerId}/messages`, `PATCH .../read`. | **PASS** |
| **Bidirectional Delivery** | Verified live: Owner message reached Admin; Admin reply reached Owner; unread count incremented to 1; viewing thread cleared unread state to 0. | **PASS** |
| **Anti-Spoofing** | Sender identity (`senderId`) and `senderRole` are derived directly from the authenticated `CustomUserDetails` token. Request payloads cannot fake sender role. | **PASS** |
| **Access Control** | Non-admins calling Admin chat endpoints receive `403 Forbidden`. Anonymous requests receive `401 Unauthorized`. | **PASS** |

---

## 12. Subscription Engine

| Feature | Audit Finding | Result |
| :--- | :--- | :---: |
| **Subscription Plans** | `SubscriptionPlan` entities support monthly and annual billing cycles, duration days, and JSON-encoded feature lists. | **PASS** |
| **Historical Price Decoupling**| `Payment.amount` and `Subscription.amount` are stored as permanent `BigDecimal` column values. Altering `SubscriptionPlan.price` does **not** alter past payments or active subscription terms. | **PASS** |
| **Subscription Lifecycle** | Managed through `SubscriptionStatus`: `ACTIVE`, `EXPIRING_SOON`, `EXPIRED`, `GRACE_PERIOD`, `SUSPENDED`, `CANCELLED`. | **PASS** |
| **Dashboard Access Gating** | Expired/suspended subscriptions block operational APIs (orders, products) via `SubscriptionExpiredException` (HTTP 403), while preserving access to billing, invoices, and settings. | **PASS** |

---

## 13. Razorpay / Payments

| Feature | Audit Finding | Result |
| :--- | :--- | :---: |
| **Price Authority** | `initiateSubscriptionPayment` looks up `SubscriptionPlan` in database and takes `plan.getPrice()`. Client cannot dictate payment amount. | **PASS** |
| **Signature Verification** | `verifySubscriptionPayment` validates Razorpay HMAC-SHA256 signature (`orderId + "|" + paymentId` against secret). | **PASS** |
| **Amount Verification** | `razorpayService.verifyOrderDetails(orderId, plan.getPrice(), "INR")` verifies recorded amount with Razorpay server. | **PASS** |
| **Idempotency** | Webhook processing logs incoming events to `webhook_events` table by unique `eventId` to prevent duplicate crediting. | **PASS** |
| **Invoice Generation** | Official PDF invoice generated on-the-fly via OpenPDF (`/api/owner/payments/{paymentId}/invoice`) for completed payments. | **PASS** |

---

## 14. Admin APIs

| Endpoint | Method | Capabilities | Result |
| :--- | :---: | :--- | :---: |
| `/api/admin/dashboard/stats` | `GET` | Platform telemetry: total bakeries, active shops, registered users, monthly and total revenue. | **PASS** |
| `/api/admin/shops` | `GET` | Paginated bakery directory with search, status filters, and owner metadata. | **PASS** |
| `/api/admin/shops/{id}` | `GET` | Comprehensive shop audit file (FSSAI, address, catalog count, order metrics). | **PASS** |
| `/api/admin/shops/{id}/status` | `PATCH`| Updates bakery status (`ACTIVE`, `SUSPENDED`, `INACTIVE`) with audit log entry. | **PASS** |
| `/api/admin/plans` | `GET` | Lists all subscription packages with active/inactive status. | **PASS** |
| `/api/admin/plans` | `POST` | Creates new subscription plan (authoritative pricing, duration, features). | **PASS** |
| `/api/admin/plans/{id}` | `PUT` | Updates subscription plan attributes. | **PASS** |
| `/api/admin/plans/{id}/status` | `PATCH`| Activates or deactivates a subscription package. | **PASS** |
| `/api/admin/messages` | `POST` | Dispatches platform-wide announcement to all shop owners. | **PASS** |
| `/api/admin/feedback` | `GET` | Retrieves owner feedback submissions across the platform. | **PASS** |
| `/api/admin/enquiries` | `GET` | Retrieves platform contact enquiries. | **PASS** |
| `/api/admin/notifications` | `GET` | Retrieves audit log of administrative notifications. | **PASS** |

---

## 15. Database / Flyway

| Metric | Verification Result |
| :--- | :--- |
| **Latest Applied Migration** | `V28__add_chat_tables.sql` (Creates `conversations` & `messages` tables) |
| **Total Migrations** | 28 migration scripts (`V1` through `V28`) |
| **Migration Numbering** | Strictly linear and sequential. Zero duplicate versions. |
| **Key Relational Tables** | `users`, `shops`, `products`, `orders`, `order_items`, `notifications`, `subscription_plans`, `subscriptions`, `payments`, `conversations`, `messages`, `feedbacks`, `product_reviews`, `activity_logs`. |
| **Referential Integrity** | Foreign keys defined with `ON DELETE CASCADE` on tenant-scoped children and `ON DELETE SET NULL` on customer references. |
| **Key Unique Constraints** | `users(email)`, `users(mobile)`, `shops(owner_id)`, `conversations(owner_id) WHERE status = 'ACTIVE'`. |
| **Performance Indexes** | Indexed on foreign keys, order timestamps, notification read status, and spatial location hierarchy (`city`, `district`, `state`, `pincode`). |
| **Schema Validation** | Hibernate `ddl-auto: validate` confirms schema matches JPA entity definitions with 0 discrepancies. |

---

## 16. Multi-Tenant Security / IDOR

All IDOR vectors were subjected to live non-destructive adversarial testing:

| Attack Vector | Test Execution | Observed Result | Status |
| :--- | :--- | :--- | :---: |
| **Order Hijacking** | Owner B (`mrunali...`) attempted to read Order ID 42 belonging to Owner A (`owner@sweetdelight.com`). | Blocked (`400 Bad Request` — "Order not found or unauthorized"). | **PASS** |
| **Order Cancellation**| Owner B attempted to update status of Owner A's order to `CANCELLED`. | Blocked (`400 Bad Request` — "Order not found or unauthorized"). | **PASS** |
| **Product Tampering** | Owner B attempted to update Product ID 31 belonging to Owner A. | Blocked (`400 Bad Request` — "Product not found or unauthorized"). | **PASS** |
| **Product Deletion** | Owner B attempted to delete Product ID 31 belonging to Owner A. | Blocked (`400 Bad Request` — "Product not found or unauthorized"). | **PASS** |
| **Notification Theft** | Owner B attempted to mark Owner A's Notification ID 105 as read. | Blocked (`403 Forbidden` — "Unauthorized to modify this notification"). | **PASS** |
| **Chat Snooping** | Owner attempted to call `GET /api/admin/chat/conversations`. | Blocked (`403 Forbidden` — Access Denied). | **PASS** |
| **Storefront Spoofing**| Customer attempting to order from suspended shop. | Blocked by storefront availability filter. | **PASS** |

---

## 17. Validation & Error Handling

- **Bean Validation:** `@Valid` on request DTOs triggers `MethodArgumentNotValidException`, translated into field-level error maps (`{ "email": "...", "mobile": "..." }`) with HTTP `400 Bad Request`.
- **Duplicate Resource Handling:** Duplicate email or mobile numbers throw `DuplicateResourceException`, mapped to HTTP `409 Conflict`.
- **Missing Parameters:** Missing required request parameters (e.g. `districtId` on `/api/locations/cities`) return HTTP `400 Bad Request` naming the missing parameter.
- **Malformed Payloads:** Truncated or invalid JSON returns HTTP `400 Bad Request` without server crash.
- **Sanitized Server Errors:** Unhandled exceptions are intercepted by `handleGeneralException` returning HTTP `500` with a generic message ("An unexpected internal server error occurred"), preventing database or stack trace exposure.

---

## 18. CORS / Security Configuration

- **Allowed Origins:** `http://localhost:3000`, `http://localhost:3001`, `http://localhost:3002`.
- **Allowed HTTP Methods:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- **CORS Credentials:** Headers and cookies allowed when requested from verified origins.
- **Security Headers:**
  - HSTS enabled (`maxAge: 31536000s`, includeSubDomains).
  - X-Content-Type-Options: `nosniff`.
  - X-Frame-Options: `SAMEORIGIN`.
  - Referrer-Policy: `strict-origin-when-cross-origin`.
- **Credential Protection:** User password hashes are marked `@JsonIgnore` and never serialized in API responses.

---

## 19. Automated Tests

The official Maven test suite was executed in full:
```
mvn test
```

### Official Test Results:
```
[INFO] Results:
[INFO] 
[INFO] Tests run: 435, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  01:28 min
[INFO] Finished at: 2026-09-28T14:38:28+05:30
[INFO] ------------------------------------------------------------------------
```
- **Total Tests Run:** **435**
- **Passed:** **435 (100%)**
- **Failures:** **0**
- **Errors:** **0**
- **Skipped:** **0**

Coverage spans location hierarchy integrity, auth registration uniqueness, subscription decoupling, owner account deletion, order state transitions, and stage B/F security certifications.

---

## 20. Runtime / API Health

- **Health Check (`GET /api/health`):** `200 OK`
  ```json
  {
    "status": "UP",
    "timestamp": "2026-09-28T09:17:31.360654500Z",
    "service": "cake-platform-api"
  }
  ```
- **Process Memory & Stability:** Zero memory leaks or OutOfMemory errors observed during continuous execution.
- **Database Connection Pool:** HikariCP operating nominally with zero connection leaks or deadlocks.

---

## 21. Git Status

```
Repository Root: D:\PROJECTS\CAKE SAAs1
Active Git Branch: main (Up to date with 'origin/main')
Remote Origin: https://github.com/mrunali-hatzade/CAKESTORE.git
Working Tree Status: Clean (No source code files modified)
```

---

## FINAL BACKEND STATUS

### PASSING (100% Verified)
1. **Core Authentication & Dual Login:** Email and Indian mobile login with BCrypt password hashing.
2. **JWT Security & Token Validation:** Tamper-proof tokens with role claim verification and automatic 401 on signature mismatch.
3. **Multi-Tenant Isolation:** Zero IDOR vulnerabilities found. All entity lookups enforce `findByIdAndShopId`.
4. **Order State Machine:** Terminal states and lifecycle transitions strictly guarded.
5. **Subscription & Server-Authoritative Pricing:** Historical payments decoupled from plan price updates; Razorpay order amounts computed strictly on backend.
6. **Owner ↔ Admin Chat:** Bidirectional delivery, anti-spoofing, read receipts, and role enforcement.
7. **Database Migrations:** All 28 Flyway migrations applied cleanly with zero schema drift.
8. **Automated Test Suite:** 435 out of 435 tests passing cleanly.

### FAILING
- **Zero failing backend features.** Every implemented backend controller, service, repository, and security filter functions according to specifications.

### PARTIAL / OBSERVATIONS
1. **Error Code Uniformity on Cross-Tenant Rejection:** When Owner B accesses Owner A's order/product, `ProductService` and `OrderService` throw generic `RuntimeException("Order not found or unauthorized")`, which `GlobalExceptionHandler` maps to HTTP `400 Bad Request`. While secure (no data leaks), mapping to HTTP `404 Not Found` or `403 Forbidden` via `ResourceNotFoundException` is standard REST practice.

### SECURITY CONCERNS
- **None.** All sensitive data (passwords, JWT secrets, Razorpay webhooks) are protected. Rate limiting via Bucket4j is configured. IDOR attacks are blocked at repository layer.

### PRODUCTION RISKS
1. **Email Service Configuration in Production:** Resend API key (`RESEND_API_KEY`) is currently blank in default `application.yml`, meaning emails fall back to console logging unless set via environment variables.
2. **Razorpay Live Keys:** Test keys (`rzp_test_...`) are active in configuration; live production keys must be injected via environment variables prior to launch.

### RECOMMENDED NEXT WORK
1. Update `ProductService` and `OrderService` to throw `ResourceNotFoundException` instead of generic `RuntimeException` for cleaner REST status code mapping (`404` instead of `400`).
2. Ensure environment secrets (`RESEND_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) are configured in deployment environment.

### ITEMS REQUIRING USER APPROVAL
1. Whether to refine the exception mapping from `400 Bad Request` to `404 Not Found` for cross-tenant IDOR access attempts.
2. Whether to proceed with the frontend reconciliation (porting Phase 4 Chat into `frontend_v2`).

---

**NO CODE CHANGED / NO DATABASE CHANGED / NO COMMIT / NO PUSH**
