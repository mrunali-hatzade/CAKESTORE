# CAKESTORE MASTER PROJECT AUDIT
**Authoritative Platform & Repository Audit Baseline**  
**Date:** September 9, 2026  
**Status:** Completed & Certified Read-Only Audit  
**Authoritative References:**  
1. `Cake_Platform_PRD_Final.md` (Version 2.0, 23 August 2026, 2,019 lines)  
2. `PHASE 6D FINAL PRODUCTION AUDIT` (`phase6d_final_production_audit.md`)  
3. Active Repositories: `backend/` (Spring Boot 3.2.3, Java 21) & `frontend_v2/` (Next.js 14 App Router, TypeScript, Tailwind CSS)

---

## 1. Executive Summary

A comprehensive, strictly read-only audit of the CakeStore SaaS platform was performed across all code repositories, configuration files, database migrations, security policies, API endpoints, and user interfaces.

The primary objective of this audit is to establish an uncompromising, evidence-based baseline of what has been implemented, what is partially complete, what differs from the original Product Requirements Document (`Cake_Platform_PRD_Final.md`), and what work remains before the 3-role platform can be deployed to production as a commercial multi-tenant SaaS.

### Core Verdict
The CakeStore platform is **SUBSTANTIALLY COMPLETE (~82% Overall Product Completion)**. 

- **Shop Owner / Baker Role (~92% Complete):** The operational core of CakeStore is mature and functional. Real PostgreSQL-backed analytics with canonical realized revenue, delivery slot capacity management, independent category synchronization, product catalog management, order fulfillment, customer invoice downloads, in-app notification center, and customer reviews/enquiries are fully operational and verified under strict multi-tenant isolation.
- **Customer Role (~85% Complete):** The customer journey is complete for Cash on Delivery (COD). Multi-level geographic marketplace exploration (State $\to$ District $\to$ City $\to$ Area), isolated storefront pages, variant pricing, eggless filters, custom cake messaging, delivery slot selection, guest order placement, and live order tracking are production-ready. Card/UPI payments currently operate in simulated/staged pilot mode pending live Razorpay credential integration and HMAC webhook verification.
- **Admin Role (~68% Complete):** Platform administration is operational for core tasks (high-level dashboard statistics, shop search/listing, shop detail inspection, subscription plan CRUD, and broadcast messaging). However, several PRD requirements remain partial: the dashboard stats API lacks granular daily/monthly metrics (`inactiveShops`, `todayRegistrations`, `activeSubscriptions`, `todayPayments`), the admin shop status transition lacks an interactive suspension reason dialog, activity logging logs `null` actor IDs, and there is no admin interface to approve/reject uploaded KYC compliance documents.
- **Security & Business Logic (~82% Complete):** Multi-tenant isolation is enforced at the repository layer through `shopAccessValidator.getValidShopForOwner(ownerId)`. However, two critical business rules require hardening: (1) access gating checks in `ShopAccessValidator.java` are commented out for local development, allowing unverified or unsubscribed shops full dashboard access, and (2) `SubscriptionScheduler.java` sets subscription status to `EXPIRED` upon cron execution but fails to call `shopStatusManager.markShopInactive`, leaving the shop in an `ACTIVE` state.

---

## 2. Current Project Architecture

### 2.1 Repository Structure
```
d:\PROJECTS\CAKE SAAs1\
├── backend/                             # Primary Spring Boot 3.2.3 (Java 21) backend
│   ├── src/main/java/com/cakeplatform/  # 70 REST Endpoints, 20 JPA Entities, Security, Services
│   ├── src/main/resources/
│   │   ├── application.yml              # DB, Flyway, JWT, multipart, timezone configuration
│   │   └── db/migration/                # 9 Flyway migrations (V1__init_schema.sql to V9)
│   └── src/test/java/                   # 8 Test classes, 69 tests passing (BUILD SUCCESS)
├── frontend_v2/                         # Production-Target UI (Design 2, Next.js 14 App Router)
│   ├── app/                             # 28 Production pages (Admin, Owner, Customer, Public)
│   ├── components/                      # Common, UI, Dashboard, Layout, Storefront, Checkout
│   ├── lib/api/                         # Typed API client services
│   ├── types/                           # TypeScript domain definitions
│   └── package.json                     # Next.js 14.1.0, React 18, Lucide, Tailwind CSS
├── frontend/                            # Legacy Reference UI (Functional reference ONLY)
├── api-tests/                           # 17 VS Code REST Client (.http) API test files
└── docker-compose.yml                   # Containerized PostgreSQL service (Port 5432)
```

### 2.2 Technology Stack Comparison: PRD vs Actual Implementation

| Architectural Layer | PRD Specification | Actual Implementation | Status | Deviation Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Framework** | Spring Boot, Java, Maven | Spring Boot 3.2.3, Java 21, Maven 3.9 | **IDENTICAL** | Fully aligned. |
| **Frontend Framework** | Next.js, React, TypeScript, Tailwind | Next.js 14.1.0 (App Router), React 18, TS 5 | **IDENTICAL** | `frontend_v2` is production candidate. |
| **Database** | Supabase PostgreSQL | Local / Containerized PostgreSQL 18/16 | **IMPLEMENTED_DIFFERENTLY** | Local PostgreSQL used with Flyway V1-V9. Schema is 100% portable to Supabase. |
| **Schema Migration** | Flyway | Flyway (9 Versioned Migrations: V1–V9) | **IDENTICAL** | Fully aligned with strict versioning. |
| **Image Storage** | Cloudinary | Local Multipart Storage (`/uploads/**`) | **IMPLEMENTED_DIFFERENTLY** | Local file storage served via Spring Boot. Cloudinary adapter needed for cloud deploy. |
| **Payment Gateway** | Razorpay (Backend Verified) | Hybrid: Staged Razorpay SDK + Pilot COD + Mock Webhook | **PARTIAL** | COD fully functional; online gateway has simulated test checkout + placeholder webhook secret. |
| **API Testing** | VS Code REST Client (`.http`) | 17 `.http` files in `api-tests/` | **IDENTICAL** | Fully maintained across all modules. |
| **Timezone Architecture** | Operational Shop Timezone | Configurable `app.business.default-timezone` (`Asia/Kolkata`) | **COMPLETE** | Phase 6A abstracted timezone to `ZoneId.of(defaultTimezone)`. |

---

## 3. Three-Role Status

### 3.1 Role 1: ADMIN (Platform Administrator)
- **Primary Goal:** Monitor platform health, manage bakery approvals, enforce compliance, control subscription tiers, and broadcast operational updates.
- **Current Completion:** **68%**
- **Available Capabilities:**
  - Authenticate with `ROLE_ADMIN` via `/api/auth/login`.
  - View aggregate dashboard statistics (`/api/admin/dashboard/stats`): Total Shops, Active Shops, Suspended Shops, Pending KYC, Total Users, Total Platform Revenue.
  - Search, filter, and inspect registered shops (`/api/admin/shops`).
  - View comprehensive bakery dossier (`/api/admin/shops/{id}`): Owner details, KYC data, business bio, address, phone, email, subscription status, lifetime orders, menu product count, and activity audit trail.
  - Update shop status (`PATCH /api/admin/shops/{id}/status`): Transition between `ACTIVE`, `SUSPENDED`, and `PENDING`.
  - Subscription Plans Management (`/api/admin/plans`): Create, edit, toggle active status, and list pricing tiers.
  - Broadcast Messaging (`/api/admin/messages`): Send system-wide announcements to all owners.
- **Identified Deficiencies & Missing Requirements:**
  - Dashboard stats API omits: `inactiveShops`, `todayRegistrations`, `activeSubscriptions`, `expiredSubscriptions`, `todayPayments`, and `monthlyRevenue`.
  - Shop suspension UI does not prompt for a required suspension reason modal.
  - Shop status changes executed by admin record `actorUserId = null` in `activity_logs`.
  - KYC document verification is passive: admin can see document metadata but cannot trigger individual document `APPROVE` or `REJECT` actions with rejection feedback.

### 3.2 Role 2: SHOP_OWNER / BAKER (Bakery Operator)
- **Primary Goal:** Onboard bakery, curate menu, organize delivery logistics, fulfill customer orders, monitor revenue analytics, and respond to customer interactions.
- **Current Completion:** **92%**
- **Available Capabilities:**
  - Multi-step onboarding wizard (`/onboarding`): Business info, address, operating hours, FSSAI, logo, cover image, and KYC document upload.
  - Tenant-isolated dashboard (`/dashboard/owner`): Dynamic operational greeting, live daily KPI summary (pending orders, today's revenue, active deliveries), and quick links.
  - Real SQL Analytics (`/dashboard/owner/analytics`): Realized revenue (delivered orders only), total orders, average order value, 7-day sales velocity trend, and top 5 best-selling cakes.
  - Product & Category Management (`/dashboard/owner/products`): Full CRUD, image upload tab + presets, eggless flag, weight variants, and empty-category deletion safety.
  - Kitchen Order Fulfillment (`/dashboard/owner/orders`): Order detail modal, status workflow (`PENDING` $\to$ `CONFIRMED` $\to$ `PREPARING` $\to$ `READY_FOR_PICKUP` / `OUT_FOR_DELIVERY` $\to$ `DELIVERED` / `CANCELLED`), printable PDF invoice download, and customer custom message display.
  - Delivery Slot Management (`/dashboard/owner/delivery-slots`): Create slots, edit capacities, toggle active status, and real-time overbooking protection.
  - In-App Notification Center: Bell icon in header, unread badge counter, notification popover with real-time mark as read and mark all as read.
  - Customer Interactions: Customer reviews with owner reply (`/dashboard/owner/reviews`), enquiries with owner reply (`/dashboard/owner/enquiries`), and custom cake quotation requests (`/dashboard/owner/enquiries`).
  - Storefront Customization (`/dashboard/owner/website` & `/settings`): Profile bio, contact, operating hours, delivery radius, and minimum order values.
- **Identified Deficiencies & Missing Requirements:**
  - Access gating in `ShopAccessValidator.java` has verification & active subscription checks commented out for local development.
  - Suspended shop status (`shop.status == SUSPENDED`) is not checked in `ShopAccessValidator.java`.
  - `GET /api/owner/payments` (historical payments list for owners) is missing from the backend; owners only have `/api/owner/subscriptions/current`.
  - Coupon management UI exists (`/dashboard/owner/coupons`) and backend coupon entity exists, but checkout does not yet validate coupon codes during checkout calculation.

### 3.3 Role 3: CUSTOMER (Buyer / Dessert Lover)
- **Primary Goal:** Discover local bakeries, customize cakes, select delivery slots, place orders, and track order fulfillment.
- **Current Completion:** **85%**
- **Available Capabilities:**
  - Marketplace Discovery (`/explore`): Multi-tier location filtering (State $\to$ District $\to$ City $\to$ Area), keyword search, category pill filtering, active bakery count, and bakery cards showing rating and address.
  - Isolated Storefront (`/shop/[id]`): Custom bakery cover, logo, contact, FSSAI badge, operating hours, dynamic categories, product grid, and eggless filter.
  - Product Customization: Weight variant selection, custom cake message ("Happy Birthday Priya"), reference photo uploader for custom orders.
  - Delivery Logistics: Advance date picker and delivery slot capacity selection.
  - Guest Checkout (`/checkout`): Streamlined checkout without mandatory account creation; collects customer name, phone, email, and address.
  - Cash on Delivery (COD): Instant order placement with automated order number generation (e.g., `ORD-ABC12345`).
  - Order Confirmation & Tracking (`/orders/[orderNumber]`): Live status timeline, customer details, itemized breakdown, delivery slot info, and downloadable tax invoice.
  - Customer Feedback & Enquiries: Submit reviews with 1-5 star ratings, submit general enquiries, and request custom cake quotations.
- **Identified Deficiencies & Missing Requirements:**
  - Online Card/UPI payments operate via simulated pilot checkout modal; live Razorpay script execution requires production keys and live merchant account onboarding.
  - Customer accounts/profiles: PRD Section 5.3 mentions optional customer login for viewing past orders; currently customer tracking relies entirely on order number tracking (`/orders/[orderNumber]`).
  - Multi-item cart: Cart in `frontend_v2` is currently product-direct checkout (`/checkout?shopId=X&productId=Y`); a persistent multi-item local storage cart drawer exists in components but direct single-product checkout is the primary path.

---

## 4. Complete Requirements Matrix

The following matrix audits all functional and non-functional requirements from Sections 1 through 60 of `Cake_Platform_PRD_Final.md` against the repository implementation.

| PRD Section | Requirement Description | Implementation in Codebase | Status | Code Evidence | Remaining Work |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **§ 5.1 / § 24** | Admin Dashboard Statistics | `AdminDashboardController.java`, `AdminDashboardService.java` | **PARTIAL** | `AdminDashboardService.java:38-50` returns total, active, suspended, pending, totalUsers, revenue. | Add `inactiveShops`, `todayRegistrations`, `activeSubscriptions`, `todayPayments`, `monthlyRevenue`. |
| **§ 5.1 / § 25** | Admin Shop Listing & Filter | `admin/shops/page.tsx`, `AdminDashboardController.java` | **COMPLETE** | `AdminDashboardController.java:29` (`GET /api/admin/shops`) | None. Working with search and status filtering. |
| **§ 5.1 / § 26** | Admin Shop Details Dossier | `admin/shops/[id]/page.tsx`, `AdminShopDetailsResponse.java` | **COMPLETE** | `AdminDashboardService.java:70-83` loads shop, subscriptions, payments, logs, counts. | None. Fully displayed with metrics and audit logs. |
| **§ 5.1 / § 28** | Admin Shop Suspension & Reactivation | `AdminDashboardService.java`, `ShopStatusManager.java` | **PARTIAL** | `AdminDashboardService.java:85-96` updates status to `ACTIVE`, `SUSPENDED`, `INACTIVE`. | Add suspension reason modal in frontend; pass actor admin user ID instead of `null`. |
| **§ 5.1 / § 28** | Admin Verification of KYC Documents | `VerificationController.java`, `BusinessDocument.java` | **PARTIAL** | Documents uploaded via `/api/verification/documents`; displayed in admin dossier. | Add admin endpoint `PATCH /api/admin/documents/{id}/verify` to approve/reject documents. |
| **§ 5.1 / § 4.2** | Subscription Plans CRUD | `AdminSubscriptionPlanController.java`, `SubscriptionPlan.java` | **COMPLETE** | `AdminSubscriptionPlanController.java:18-47` (GET, POST, PUT, PATCH status). | None. Managed in `/admin/plans`. |
| **§ 5.1 / § 27** | Activity Audit Trail Logging | `ActivityLoggerService.java`, `ActivityLog.java` | **COMPLETE** | `ActivityLoggerService.java:18-35` logs to `activity_logs` table. | Ensure all admin actions record admin ID as actor. |
| **§ 5.2 / § 7-8** | Owner Registration & Onboarding | `AuthController.java`, `app/onboarding/page.tsx` | **COMPLETE** | `AuthController.java:30` creates `User` (`ROLE_SHOP_OWNER`) and `Shop` (`PENDING`). | None. Step 1-4 wizard with validation and KYC upload. |
| **§ 5.2 / § 11-13**| Authentication & JWT Protection | `SecurityConfig.java`, `JwtUtils.java`, `CustomUserDetails` | **COMPLETE** | `SecurityConfig.java:45-70` secures `/api/owner/**` with `hasRole('SHOP_OWNER')`. | None. Bearer token extraction and verification fully functional. |
| **§ 5.2 / § 14** | Multi-Tenant Shop Data Isolation | `ShopAccessValidator.java`, Owner Services | **COMPLETE** | Owner controllers fetch shop exclusively via `shopAccessValidator.getValidShopForOwner(userId)`. | Re-enable subscription & verification gating checks in production. |
| **§ 5.2 / § 19** | Owner Dashboard Command Center | `dashboard/owner/page.tsx`, `OwnerDashboardService.java` | **COMPLETE** | Phase 6B implementation verified in Phase 6D. Live KPIs, greeting, and links. | None. Production-certified in Phase 6D. |
| **§ 5.2 / § 20** | Subscription Warning Banner | `dashboard/owner/page.tsx`, `SubscriptionScheduler.java` | **COMPLETE** | Banner displays when subscription expires or days remaining $\le 7$. | None. Working with visual warning indicators. |
| **§ 5.2 / § 21** | Product Catalog Management (CRUD) | `OwnerProductController.java`, `ProductService.java` | **COMPLETE** | `OwnerProductController.java:25-59` (GET, POST, PUT, DELETE) with ownership check. | None. Includes file upload tab and preset chips. |
| **§ 5.2 / § 21** | Dynamic Category Management | `OwnerCategoryController.java`, `CategoryService.java` | **COMPLETE** | Full CRUD, empty-category protection, scoped to `shop_id`. | None. Verified in Phase 6D. |
| **§ 5.2 / § 23** | Kitchen Order Fulfillment & Invoicing | `OwnerOrderController.java`, `OrderService.java` | **COMPLETE** | `OwnerOrderController.java:32-65` status workflow + printable HTML/PDF invoice. | None. Verified in Phase 6D. |
| **§ 5.2 / § 38** | Delivery Slot & Capacity Management | `OwnerDeliverySlotController.java`, `ShopDeliverySlot.java` | **COMPLETE** | Day-of-week slots, capacity limit, active toggle, date-specific capacity checking. | None. Verified in Phase 6D. |
| **§ 5.2 / § 40** | Realized Revenue Analytics | `OwnerAnalyticsController.java`, `AnalyticsService.java` | **COMPLETE** | Phase 6A implementation: canonical realized revenue rule, 7-day velocity, top 5 products. | None. Verified in Phase 6D. |
| **§ 5.2 / § 40** | In-App Notification Center | `NotificationController.java`, `NotificationService.java` | **COMPLETE** | Phase 6C implementation: header bell, badge count, popover, 4 real event triggers. | None. Verified in Phase 6D. |
| **§ 5.2 / § 17-18**| Owner Subscription & Billing | `OwnerSubscriptionController.java`, `OwnerPaymentController`| **PARTIAL** | `GET /api/owner/subscriptions/current` and `/mock-checkout` exist. | Add `GET /api/owner/payments` for owner payment history table. |
| **§ 5.3 / § 22** | Customer Marketplace Discovery | `explore/page.tsx`, `CustomerStorefrontController.java` | **COMPLETE** | State $\to$ District $\to$ City $\to$ Area hierarchy, search, category pills. | None. Returns active shops with location indexing. |
| **§ 5.3 / § 22** | Public Bakery Storefront | `shop/[id]/page.tsx`, `CustomerStorefrontController.java` | **COMPLETE** | Isolated branding, custom banner, logo, operating hours, categories, products. | None. Verified in Phase 6D. |
| **§ 5.3 / § 22** | Product Details & Custom Message | `ProductDetailModal.tsx`, `shop/[id]/page.tsx` | **COMPLETE** | Cake variants, weight pricing, eggless badge, custom cake message input. | None. Verified in Phase 6D. |
| **§ 5.3 / § 23** | Delivery Slot Picker at Checkout | `DeliverySlotPicker.tsx`, `checkout/page.tsx` | **COMPLETE** | Advance date picker, capacity check, booked status display. | None. Overbooking prevention verified in Phase 6D. |
| **§ 5.3 / § 23** | Guest Checkout Flow | `CustomerStorefrontController.java`, `checkout/page.tsx` | **COMPLETE** | `/api/storefront/shops/{shopId}/orders` creates guest order with unique number. | None. Verified in Phase 6D. |
| **§ 5.3 / § 23** | Customer Order Tracking | `orders/[orderNumber]/page.tsx` | **COMPLETE** | Timeline progress, customer card, items list, slot info, invoice download. | None. Verified in Phase 6D. |
| **§ 5.3 / § 16** | Cash on Delivery (COD) Payment | `CustomerStorefrontController.java`, `checkout/page.tsx` | **COMPLETE** | Order created with `paymentMethod=COD`, `paymentStatus=PENDING`. | None. 100% operational. |
| **§ 5.3 / § 16** | Razorpay Online Payment Gateway | `paymentsService.ts`, `WebhookController.java` | **PARTIAL** | Client SDK staging + fallback test modal; backend webhook endpoint exists. | Replace mock webhook secret with production HMAC signature verification. |
| **§ 6 / § 43-45** | Shop Lifecycle State Machine | `ShopStatus.java`, `ShopStatusManager.java`, `SubscriptionScheduler.java` | **PARTIAL** | `PENDING`, `ACTIVE`, `INACTIVE`, `SUSPENDED` defined. `activateShop`, `suspendShop` exist. | Fix `SubscriptionScheduler` to call `markShopInactive` on expiration. |
| **§ 10 / § 47** | Password Security & BCrypt | `SecurityConfig.java`, `AuthService.java` | **COMPLETE** | `BCryptPasswordEncoder` used for all password hashes. | None. Strong hashing active. |
| **§ 12 / § 39** | JWT Authentication & Expiration | `JwtUtils.java`, `JwtAuthenticationFilter.java` | **COMPLETE** | 24-hour expiration (`86400000ms`), HMAC-SHA256 signing. | None. Fully functional. |
| **§ 30-37** | PostgreSQL Database Schema | Flyway Migrations V1 through V9 | **COMPLETE** | 9 Flyway migrations, 20 JPA entities, foreign keys, timestamps. | None. Clean compile and migration execution. |
| **§ 46 / § 47** | Login Rate Limiting & Throttling | `AuthController.java` | **MISSING** | No rate limiting filter or IP throttling on `/api/auth/login`. | Implement Bucket4j or Redis token bucket filter on auth endpoints. |
| **§ 48** | Password Reset Flow | PRD Section 48 | **MISSING** | No forgot password endpoint or email token generator. | Add `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`. |
| **§ 49** | Email Verification Flow | PRD Section 49 | **MISSING** | No email verification token or SMTP mail dispatch service. | Add email verification token table and JavaMailSender integration. |
| **§ 50** | Cloud Image Storage (Cloudinary) | `MediaController.java` | **IMPLEMENTED_DIFFERENTLY**| Local disk storage in `uploads/` served via Spring static resource handler. | Create Cloudinary storage service adapter for cloud production deployment. |

---

## 5. Admin Audit

### 5.1 Admin Authentication & Authorization
- **Endpoint:** `POST /api/auth/login` returning JWT with `ROLE_ADMIN`.
- **Security Rule:** All `/api/admin/**` endpoints are guarded by `@PreAuthorize("hasRole('ADMIN')")` in `AdminDashboardController.java`, `AdminSubscriptionPlanController.java`, and `AdminMessageController.java`.
- **Unauthorized Access Verification:** Verified in Phase 6D that non-admin tokens (e.g., Shop Owner JWT) calling `/api/admin/dashboard/stats` receive HTTP `403 Forbidden`. Unauthenticated requests receive HTTP `401 Unauthorized`.

### 5.2 Admin Dashboard Metrics
The current backend endpoint `GET /api/admin/dashboard/stats` in `AdminDashboardService.java` returns:
```json
{
  "totalShops": 15,
  "activeShops": 10,
  "suspendedShops": 0,
  "pendingShops": 5,
  "totalUsers": 18,
  "totalRevenue": 24500.00
}
```
**PRD Discrepancies (Section 4.1):**
1. `inactiveShops` is not computed (should count shops with `status == ShopStatus.INACTIVE`).
2. `todayRegistrations` is missing (should count users/shops created since today's start).
3. `activeSubscriptions` & `expiredSubscriptions` are missing (currently only reports active shops).
4. `todayPayments` & `monthlyRevenue` are missing (only lifetime `totalRevenue` is returned).

### 5.3 Shop Management & Lifecycle
- **Listing & Filtering:** `GET /api/admin/shops` returns summary DTOs including `shopId`, `businessName`, `shopStatus`, `registeredAt`, `ownerName`, and `ownerEmail`. Frontend at `/admin/shops` supports searching by business name and filtering by status tab.
- **Shop Details:** `GET /api/admin/shops/{id}` returns the complete shop entity, subscription history, payment history, activity logs, product count, and order count.
- **State Transition Execution:** `PATCH /api/admin/shops/{id}/status` supports `ACTIVE`, `SUSPENDED`, and `INACTIVE`.
- **Deficiency 1 — Missing Suspension Reason Prompt:** In `admin/shops/[id]/page.tsx`, clicking "Suspend Storefront" immediately executes `updateShopStatus(shopId, 'SUSPENDED')` without displaying a modal prompting for the suspension reason, violating PRD Section 4.3.
- **Deficiency 2 — Null Actor Audit Logging:** In `AdminDashboardService.java`:
  ```java
  public Shop updateShopStatus(Long shopId, String status) {
      if ("SUSPENDED".equals(status)) {
          shopStatusManager.suspendShop(shopId, null); // <--- actorUserId is hardcoded null!
      } else if ("ACTIVE".equals(status)) {
          shopStatusManager.activateShop(shopId, null); // <--- actorUserId is hardcoded null!
      }
  ...
  ```
  The admin's user ID is not extracted from `@AuthenticationPrincipal` and passed to `ShopStatusManager`, resulting in un-attributed activity log entries.
- **Deficiency 3 — KYC Document Approval Workflow:** `BusinessDocument` records uploaded by owners are listed in the admin shop detail page, but there are no admin endpoints or UI actions to individually `APPROVE` or `REJECT` documents with reviewer notes.

---

## 6. Shop Owner Audit

### 6.1 Onboarding & Authentication
- **Registration Flow:** Wizard at `/onboarding` collects owner name, email, password, bakery name, phone, address, operating hours, and KYC files. Calls `POST /api/auth/register`, which creates `User` (`ROLE_SHOP_OWNER`) and a `Shop` initialized to `ShopStatus.PENDING` and `VerificationStatus.PENDING`.
- **JWT & Password Security:** Passwords hashed with BCrypt. JWT token issued with 24-hour expiration. Protected owner endpoints reject missing or expired tokens.

### 6.2 Status-Aware Access Gating (Critical Finding)
In `ShopAccessValidator.java`:
```java
// TEMPORARILY DISABLED FOR LOCAL TESTING:
// // Check 1: Must be VERIFIED
// if (shop.getVerificationStatus() != VerificationStatus.VERIFIED) { ... }
// // Check 2: Active Subscription
// ...
```
**Audit Analysis:**
1. Access gating was commented out for development convenience. In production, unverified owners or owners whose subscription has expired must be restricted from modifying catalog or processing orders.
2. In addition, `ShopAccessValidator.java` does not check `shop.getStatus() == ShopStatus.SUSPENDED`. A suspended bakery can still issue calls to owner endpoints because `getValidShopForOwner` does not inspect `shop.getStatus()`.
3. **Resolution Needed:** Before production launch, restore verification and active subscription checks, and add a check:
   ```java
   if (shop.getStatus() == ShopStatus.SUSPENDED) {
       throw new AccessDeniedException("This bakery has been suspended by administration.");
   }
   ```

### 6.3 Product & Category Management
- **Catalog CRUD:** `GET /api/owner/products`, `POST /api/owner/products`, `PUT /api/owner/products/{id}`, `DELETE /api/owner/products/{id}`. All verified with multi-tenant isolation.
- **Image Handling:** Product creation supports both direct image file upload (via `POST /api/owner/media/upload`) and curated Unsplash presets.
- **Category Synchronization:** Independent owner categories (`POST /api/owner/categories`) sync with customer storefront tabs. Deletion is blocked if products are assigned.

### 6.4 Orders & Logistics Fulfillment
- **Order Management:** List filtered by status tabs (All, Pending, Confirmed, Preparing, Ready, Delivered, Cancelled). Order details modal shows customer contact, delivery address, custom cake message, and delivery slot.
- **Invoice Generation:** `GET /api/owner/orders/{id}/invoice` returns a styled, printable HTML invoice.
- **Delivery Slots:** Day-of-week slots with max order capacity. `CustomerStorefrontService` enforces slot capacity on checkout, preventing overbooking.

### 6.5 Analytics & Notifications
- **Analytics:** Implemented in Phase 6A. Realized revenue computed only from `DELIVERED`/`COMPLETED` orders. 7-day velocity chart and top 5 products calculated via PostgreSQL aggregations. Timezone-aware date boundaries.
- **Notifications:** Implemented in Phase 6C. Real-time bell, badge count, popover, mark read/unread. Triggered automatically on new orders, enquiries, custom cake requests, and reviews.

---

## 7. Customer Audit

### 7.1 Marketplace Discovery (`/explore`)
- **Location Hierarchy:** State $\to$ District $\to$ City $\to$ Area multi-level selector.
- **Search & Filtering:** Search by bakery name or specialty; filter by category chips (All, Birthday Cakes, Artisan, Eggless).
- **Bakery Cards:** Displays bakery name, location badges, average rating, and active products count. Clicking routes dynamically to `/shop/[id]`.

### 7.2 Storefront (`/shop/[id]`)
- **Branding:** Displays custom bakery cover banner, logo, bio, address, phone, FSSAI license badge, and operating hours.
- **Catalog Navigation:** Dynamic category tabs filter products in real time. Dedicated "Eggless Only" toggle switch.
- **Product Details:** Modal shows product description, weight/flavor variants, price adjustments, and custom message input field.

### 7.3 Checkout & Ordering (`/checkout`)
- **Guest Checkout:** Customers can place orders without creating an account by providing name, phone, email, and delivery address.
- **Delivery Logistics:** Interactive delivery slot picker shows slots with real-time remaining capacity indicators.
- **Payment Method:** Cash on Delivery (COD) is fully functional and creates orders with `paymentMethod=COD`, `paymentStatus=PENDING`. Online payment gateway operates in pilot staged mode.

### 7.4 Order Confirmation & Tracking (`/orders/[orderNumber]`)
- **Live Tracking:** Dynamic timeline showing order progress (`Order Placed` $\to$ `Confirmed` $\to$ `In the Oven` $\to$ `Out for Delivery` $\to$ `Delivered`).
- **Invoice Download:** Direct customer link to `/api/storefront/shops/orders/{orderNumber}/invoice`.

---

## 8. Authentication & Security Audit

| Security Domain | Implementation | Assessment | Finding / Classification |
| :--- | :--- | :--- | :--- |
| **Password Storage** | `BCryptPasswordEncoder` (Spring Security) | **COMPLIANT** | Strong salted hash; plaintext passwords never persisted. |
| **Token Mechanism** | JWT (HMAC-SHA256, 24h expiration) | **COMPLIANT** | Secret read from `JWT_SECRET` environment variable. |
| **Role Authorization** | `@PreAuthorize("hasRole('ADMIN')")`, etc. | **COMPLIANT** | Strictly enforced on all controller mappings. |
| **CORS Policy** | `WebConfig.java` allows ports 3000, 3001 | **COMPLIANT** | Restricted to known frontend origins; requires prod domain config. |
| **Login Rate Limiting**| Not implemented on `/api/auth/login` | **GAP (P1)** | Susceptible to brute force credential attacks; requires rate limiting. |
| **Account Enumeration**| `AuthService.java` returns generic errors | **COMPLIANT** | Returns "Invalid email or password" on failed login. |
| **Make-Admin Endpoint**| `POST /api/auth/make-admin` is public | **GAP (P0)** | Anyone can escalate any email to `ROLE_ADMIN`! Must be removed/secured before launch. |
| **SQL Injection** | Spring Data JPA + Parameterized Queries | **COMPLIANT** | No raw string concatenation in SQL queries. |
| **CSRF Defense** | Disabled in `SecurityConfig` (stateless JWT) | **COMPLIANT** | Standard pattern for stateless Bearer token APIs. |

---

## 9. Multi-Tenant Security Audit

### 9.1 Tenant Isolation Architecture
In CakeStore, multi-tenancy is enforced at the software architecture level via **Shop Ownership Scoping**:
1. Every authenticated owner request carries a JWT containing the user's `id`.
2. All owner service methods invoke `shopAccessValidator.getValidShopForOwner(userId)`.
3. Database queries filter by `shop.getId() == authenticatedShopId`.

### 9.2 Cross-Tenant IDOR Matrix Verification

| Resource | Access Route | Ownership Check Mechanism | IDOR Protection Status |
| :--- | :--- | :--- | :--- |
| **Products** | `PUT/DELETE /api/owner/products/{id}` | Verifies `product.getShop().getId().equals(shop.getId())` | **PROTECTED (HTTP 403 / Exception)** |
| **Categories** | `PUT/DELETE /api/owner/categories/{id}` | Verifies `category.getShop().getId().equals(shop.getId())` | **PROTECTED (HTTP 403 / Exception)** |
| **Orders** | `GET/PATCH /api/owner/orders/{id}` | Verifies `order.getShop().getId().equals(shop.getId())` | **PROTECTED (HTTP 403 / Exception)** |
| **Invoices** | `GET /api/owner/orders/{id}/invoice` | Scoped via owner's shop orders | **PROTECTED (HTTP 403 / Exception)** |
| **Analytics** | `GET /api/owner/analytics/dashboard` | Queries exclusively `shopId` derived from JWT | **PROTECTED (Automatic scoping)** |
| **Delivery Slots**| `PUT/DELETE /api/owner/delivery-slots/{id}` | Scoped to owner's `shopId` | **PROTECTED (HTTP 403 / Exception)** |
| **Notifications** | `PATCH /api/notifications/{id}/read` | Checks `notification.getUser().getId().equals(userId)` | **PROTECTED (HTTP 403 / Exception)** |
| **Coupons** | `POST /api/owner/coupons` | Associates coupon with owner's `shopId` | **PROTECTED (Automatic scoping)** |
| **Feedback Reply**| `POST /api/owner/feedback/{id}/reply` | Verifies `feedback.getShop().getId().equals(shop.getId())` | **PROTECTED (HTTP 403 / Exception)** |

---

## 10. Database Audit

### 10.1 Migrations Inventory (Flyway)
1. `V1__init_schema.sql`: Core tables (`users`, `shops`, `products`, `orders`, `order_items`, `subscriptions`, `payments`, `activity_logs`).
2. `V2__add_verification_and_location.sql`: Adds KYC verification fields, FSSAI, location columns (state, district, city, area).
3. `V3__add_subscriptions_and_payouts.sql`: Subscription plans table and shop payout details.
4. `V4__add_notifications.sql`: In-app notification center table.
5. `V5__orders_and_customers.sql`: Additional order fulfillment fields and customer contact columns.
6. `V6__feedback_and_enquiries.sql`: Customer feedback, enquiries, and custom cake design requests.
7. `V7__cake_variants_and_slots.sql`: Cake weight variants, addons, and delivery slot capacity table.
8. `V8__coupons_and_discounts.sql`: Promotional coupons and discount rules.
9. `V9__product_categories.sql`: Dynamic shop category table with foreign key to shops.

### 10.2 Entity Model & PRD Compliance
All 20 JPA `@Entity` classes map cleanly to the underlying PostgreSQL schema with `hibernate.ddl-auto: validate` passing without schema discrepancies.
- Relationships: Proper `@ManyToOne` and `@OneToMany` relationships with cascade and fetch rules.
- Timestamps: `createdAt` and `updatedAt` audit columns present across entities.
- Data Retention: Payment history and subscription records are preserved across renewals. Orders retain historical pricing snapshots in `order_items`.

---

## 11. API Audit

The Spring Boot backend exposes **70 REST Endpoints**:

```
ROLE_ADMIN (9 Endpoints):
  GET     /api/admin/dashboard/stats              # Platform aggregate metrics
  GET     /api/admin/shops                        # List all shops with filters
  GET     /api/admin/shops/{shopId}               # Detailed bakery dossier
  PATCH   /api/admin/shops/{shopId}/status        # Activate, suspend, or set pending
  GET     /api/admin/plans                        # List subscription plans
  POST    /api/admin/plans                        # Create subscription plan
  PUT     /api/admin/plans/{id}                   # Update subscription plan
  PATCH   /api/admin/plans/{id}/status            # Toggle plan active status
  POST    /api/admin/messages                     # Broadcast platform announcement

ROLE_SHOP_OWNER (33 Endpoints):
  GET     /api/owner/analytics/dashboard          # Realized revenue & velocity analytics
  GET     /api/owner/products                     # List bakery products
  POST    /api/owner/products                     # Create product with variants
  PUT     /api/owner/products/{id}                # Update product details
  DELETE  /api/owner/products/{id}                # Delete product
  GET     /api/owner/categories                   # List bakery categories
  POST    /api/owner/categories                   # Create category
  PUT     /api/owner/categories/{id}              # Update category name
  DELETE  /api/owner/categories/{id}              # Delete category (with safe check)
  GET     /api/owner/orders                       # List bakery orders
  GET     /api/owner/orders/{id}                  # Detailed order view
  PATCH   /api/owner/orders/{id}/status           # Transition order status
  GET     /api/owner/orders/{id}/invoice          # Generate printable invoice
  GET     /api/owner/delivery-slots               # List delivery slots
  POST    /api/owner/delivery-slots               # Create delivery slot
  PUT     /api/owner/delivery-slots/{id}          # Update slot & capacity
  PATCH   /api/owner/delivery-slots/{id}/status   # Toggle slot active status
  DELETE  /api/owner/delivery-slots/{id}          # Delete delivery slot
  GET     /api/owner/customers                    # List customers derived from orders
  GET     /api/owner/customers/{email}            # Customer order history
  GET     /api/owner/feedback                     # List customer reviews
  POST    /api/owner/feedback/{id}/reply          # Reply to customer review
  DELETE  /api/owner/feedback/{id}                # Delete review
  GET     /api/owner/enquiries                    # List customer enquiries
  POST    /api/owner/enquiries/{id}/reply         # Reply to enquiry
  GET     /api/owner/custom-cakes                 # List custom cake design requests
  POST    /api/owner/custom-cakes/{id}/respond    # Quote / respond to custom cake
  GET     /api/owner/coupons                      # List bakery coupons
  POST    /api/owner/coupons                      # Create promotional coupon
  POST    /api/owner/media/upload                 # Upload product/logo image
  GET     /api/owner/subscriptions/current        # Get current subscription status
  POST    /api/owner/payments/mock-checkout       # Complete subscription payment

AUTHENTICATED (SHARED) (10 Endpoints):
  GET     /api/shops/my-shop                      # Get logged-in owner's shop
  PUT     /api/shops/my-shop                      # Update bakery profile
  GET     /api/shops/my-shop/stats                # Quick shop overview stats
  GET     /api/shops/my-shop/payouts              # Get bank payout details
  POST    /api/shops/my-shop/payouts              # Save bank payout details
  GET     /api/verification/documents             # List uploaded KYC documents
  POST    /api/verification/documents             # Upload KYC document
  GET     /api/notifications                      # List user notifications
  GET     /api/notifications/unread-count         # Get unread badge count
  PATCH   /api/notifications/read-all             # Mark all notifications read
  PATCH   /api/notifications/{id}/read            # Mark single notification read

PUBLIC / CUSTOMER / WEBHOOKS (18 Endpoints):
  POST    /api/auth/login                         # User login (JWT)
  POST    /api/auth/register                      # Owner registration
  POST    /api/auth/make-admin                    # SECURITY RISK: Public role escalation
  GET     /api/storefront/shops/search            # Marketplace bakery search
  GET     /api/storefront/shops/{shopId}          # Public bakery storefront profile
  GET     /api/storefront/shops/{shopId}/categories # Bakery active categories
  GET     /api/storefront/shops/{shopId}/products # Bakery public product catalog
  GET     /api/storefront/shops/{shopId}/products/{productId} # Single product details
  GET     /api/storefront/shops/{shopId}/delivery-slots # Storefront delivery slots
  POST    /api/storefront/shops/{shopId}/orders   # Place customer order
  GET     /api/storefront/shops/orders/{orderNumber} # Track customer order
  GET     /api/storefront/shops/orders/{orderNumber}/invoice # Customer invoice
  GET     /api/storefront/shops/{shopId}/feedback # View public reviews
  POST    /api/storefront/shops/{shopId}/feedback # Submit customer review
  POST    /api/storefront/shops/{shopId}/enquiries # Submit bakery enquiry
  POST    /api/storefront/enquiries               # Submit global contact enquiry
  POST    /api/storefront/shops/{shopId}/custom-cakes # Submit custom design request
  POST    /api/webhooks/razorpay                  # Razorpay payment webhook
```

---

## 12. Frontend Audit

### 12.1 Route Inventory (`frontend_v2`)
All 28 Next.js pages compile cleanly with 0 TypeScript errors and 0 ESLint warnings:

1. `/` (Public Homepage): Hero, category showcase, featured bakeries, baker CTA, value props.
2. `/explore` (Marketplace): State $\to$ District $\to$ City $\to$ Area hierarchy, search bar, active bakery cards.
3. `/how-it-works` (Informational): Dual-tab customer/baker visual guide with interactive FAQs.
4. `/pricing` (Pricing & Plans): Monthly/yearly billing toggle, feature checklist, 14-day trial CTA.
5. `/for-owners` (Baker Landing): Partner program benefits, zero-commission value prop, registration CTA.
6. `/contact` (Support): Multi-channel support cards, contact enquiry form.
7. `/login` (Authentication): Email/password form with automatic role-based redirect.
8. `/onboarding` (Registration): Step 1-4 wizard for bakery creation and KYC file upload.
9. `/shop/[id]` (Public Storefront): Bakery header, dynamic categories, product grid, eggless toggle.
10. `/checkout` (Checkout): Guest checkout, delivery slot picker, COD payment button.
11. `/orders/[orderNumber]` (Order Tracking): Fulfillment timeline, order summary, invoice download.
12. `/dashboard/owner` (Command Center): Operational greeting, daily summary cards, quick action links.
13. `/dashboard/owner/analytics` (Analytics): Realized revenue KPI, 7-day velocity chart, top 5 products.
14. `/dashboard/owner/products` (Catalog): Product table, file upload tab, Unsplash presets, edit modal.
15. `/dashboard/owner/orders` (Orders): Order tabs, status progression buttons, invoice viewer modal.
16. `/dashboard/owner/delivery-slots` (Logistics): Slot capacity configuration, operational days.
17. `/dashboard/owner/customers` (Customer CRM): Order counts, customer spend metrics.
18. `/dashboard/owner/reviews` (Reputation): 1-5 star reviews, owner reply interface.
19. `/dashboard/owner/enquiries` (Inquiries): Customer messages, reply composer modal.
20. `/dashboard/owner/coupons` (Marketing): Coupon creator, discount codes, usage limits.
21. `/dashboard/owner/website` (Storefront Customization): Bio, operating hours, cover/logo settings.
22. `/dashboard/owner/subscription` (Billing): Current subscription plan, renewal payment trigger.
23. `/dashboard/owner/settings` (Settings): Profile information, password change, notifications.
24. `/admin` (Admin Overview): Platform health metrics, KYC approval alert banner, shop list.
25. `/admin/shops` (Admin Shop Registry): Searchable multi-tenant bakery directory.
26. `/admin/shops/[id]` (Admin Bakery Dossier): Complete shop profile, subscriptions, activity logs.
27. `/admin/plans` (Admin Subscription Plans): Plan creation and price editing.
28. `/admin/messages` (Admin Broadcasts): Platform broadcast announcement composer.

---

## 13. Subscription Audit

### 13.1 Subscription Lifecycle State Machine
```text
[Owner Registration] ──> Shop: PENDING / Subscription: None
                               │
               [Subscription Payment (Mock / Razorpay)]
                               │
                               v
                       Shop: ACTIVE / Subscription: ACTIVE
                               │
                    [Daily Cron Expiration]
                               │
                               v
                       Subscription: EXPIRED
                               │
                               v  <-- (CRITICAL BUG: Disconnected in scheduler)
                       Shop: INACTIVE
```

### 13.2 The Subscription Scheduler Bug
In `SubscriptionScheduler.java`:
```java
private void handleExpiredSubscription(Subscription sub) {
    sub.setStatus(SubscriptionStatus.EXPIRED);
    subscriptionRepository.save(sub);

    Shop shop = sub.getShop();
    User owner = shop.getOwner();
    String message = String.format("Your subscription for %s has expired. Your shop is now hidden from customers.", shop.getBusinessName());

    notificationService.createNotification(owner, NotificationType.SUBSCRIPTION_EXPIRED, ...);
    log.info("Subscription expired for Shop ID {}", shop.getId());
}
```
**Audit Finding:** `handleExpiredSubscription` updates the `Subscription` to `EXPIRED` and sends a notification, but it **never updates the `Shop` status to `INACTIVE`**!
In `SubscriptionService.java:88`, the method `expireSubscription` correctly calls `shopStatusManager.markShopInactive(subscription.getShop().getId(), null)`. However, `SubscriptionScheduler` directly manipulates `subscriptionRepository` instead of invoking `subscriptionService.expireSubscription(sub.getId())`. As a result, the shop remains `ShopStatus.ACTIVE` in the database, and customers can continue ordering from an expired bakery.

---

## 14. Payment / Razorpay Audit

### 14.1 Online Payment Status: PARTIAL / STAGED
- **Cash on Delivery (COD):** 100% operational.
- **Frontend Staging:** In `frontend_v2/lib/services/payments.ts`, the checkout dynamically loads `checkout.js` from `checkout.razorpay.com` if `NEXT_PUBLIC_RAZORPAY_KEY_ID` is defined. If undefined, it provides a simulated pilot checkout modal so user journeys can be verified end-to-end.
- **Backend Webhook Deficiencies (`WebhookController.java`):**
  1. `RAZORPAY_SECRET = "mock_razorpay_secret_123"` is hardcoded instead of being read from `application.yml`.
  2. Signature verification does not compute the standard HMAC-SHA256 digest of the raw request payload; it merely checks `if (signature == null)`.
  3. Order lookup executes `orderRepository.findAll().stream().filter(...)` (in-memory table scan) instead of an indexed query `orderRepository.findByOrderNumber(orderNumber)`.
  4. Idempotency: Webhook does not check whether the transaction ID has already been recorded in a dedicated payment transaction log.

---

## 15. Order & Delivery Audit

### 15.1 Order Fulfillment Flow
- **States:** `PENDING` $\to$ `CONFIRMED` $\to$ `PREPARING` $\to$ `READY_FOR_PICKUP` / `OUT_FOR_DELIVERY` $\to$ `DELIVERED` / `CANCELLED`.
- **Invoicing:** Compliant with PRD Section 23. Tax calculation, itemized pricing, delivery address, custom cake message, and bakery branding are included in the downloadable invoice.

### 15.2 Delivery Slot Capacity & Overbooking Prevention
- **Capacity Enforcement:** Checked during `POST /api/storefront/shops/{shopId}/orders` in `CustomerStorefrontService.java:120`. If total non-cancelled orders for `(slotId, deliveryDate)` equal or exceed `slot.getMaxOrders()`, the request is rejected with HTTP 400 (`"Selected delivery slot is fully booked for this date"`).
- **Cancelled Order Filtering:** Verified in Phase 6D that cancelled orders free up slot capacity immediately.

---

## 16. Marketplace Audit

- **Discovery Flow:** `/explore` allows customers to locate bakeries by selecting State $\to$ District $\to$ City $\to$ Area.
- **Filtering Rules:** `CustomerStorefrontController.searchShops` queries bakeries with `status = ACTIVE` and `verificationStatus = VERIFIED`.
- **Dynamic Routing:** All bakery cards link dynamically to `/shop/{id}`, successfully loading real database products.

---

## 17. Analytics Audit

- **Canonical Realized Revenue Rule:** Verified in Phase 6D. Revenue calculations in `OrderRepository` query `status IN ('DELIVERED', 'COMPLETED')`. Unfulfilled, pending, or cancelled orders are strictly excluded.
- **Velocity Metrics:** Computes daily sales volume across a rolling 7-day window.
- **Top Products:** Computes the top 5 cake items ranked by total units sold.
- **Operational Timezone Support:** Configured via `app.business.default-timezone` (`Asia/Kolkata`) in `application.yml`.

---

## 18. Notification Audit

- **In-App Architecture:** `Notification.java` entity, `NotificationService.java`, and `NotificationController.java`.
- **Real Event Generation:** Automated triggers implemented for:
  1. `NEW_ORDER`: Dispatched to shop owner upon customer order placement.
  2. `NEW_ENQUIRY`: Dispatched to shop owner upon storefront inquiry submission.
  3. `NEW_CUSTOM_REQUEST`: Dispatched to shop owner upon custom cake request.
  4. `NEW_FEEDBACK`: Dispatched to shop owner upon review submission.
- **UI Experience:** Bell icon in owner navbar with badge counter; popover allows marking individual notifications as read or marking all as read.

---

## 19. Testing Audit

### 19.1 Automated Tests Summary
- **Backend:** 8 Test classes, **69 unit and service tests passing** (`mvn test` $\to$ `BUILD SUCCESS`).
  - Covers: Notification service, category service, product category assignment, shop access validator, analytics service, storefront search, and storefront details.
- **Frontend (`frontend_v2`):** **0 automated Jest/RTL unit tests**. The project relies on Next.js compiler verification (`npm run build`) and external Playwright/Python integration scripts.

### 19.2 Critical Uncovered Paths
1. `AdminDashboardService` — No unit tests for platform stats calculation or shop status transitions.
2. `OrderService` — No unit tests for order status state transitions or invoice generation.
3. `SubscriptionScheduler` — No unit tests verifying automatic expiration or daily cron execution.
4. `WebhookController` — No unit tests verifying Razorpay signature verification or idempotent event handling.

---

## 20. Production Configuration Audit

| Configuration Item | Current Setting | Production Requirement | Action Required |
| :--- | :--- | :--- | :--- |
| **`spring.datasource.url`** | `jdbc:postgresql://localhost:5432/cake_platform` | Managed PostgreSQL / Supabase URL | Set via `DB_URL` environment variable. |
| **`jwt.secret`** | Fallback hex secret in `application.yml` | 256-bit cryptographically random secret | Set via `JWT_SECRET` environment variable. |
| **`server.port`** | `8080` | Port 8080 or container assigned port | Ready. |
| **`app.business.default-timezone`**| `Asia/Kolkata` | Configurable per deployment | Ready. |
| **CORS Allowed Origins** | `localhost:3000`, `localhost:3001` | Production domain (e.g. `https://cakestore.in`) | Parameterize in `WebConfig.java`. |
| **Image Storage** | Local filesystem (`uploads/`) | Cloudinary or S3 bucket | Implement cloud storage adapter. |
| **Razorpay Keys** | Mock secret string | Live Merchant Key ID + Key Secret | Add to `application.yml` and `.env.production`. |

---

## 21. Already Complete (DO NOT TOUCH)

The following modules and features are genuinely production-implemented, verified, and stable. **They must NOT be refactored, redesigned, or rewritten**:

1. **Owner Analytics Backend (Phase 6A):** Canonical realized revenue rule, 7-day velocity aggregation, top 5 products calculation, and operational timezone abstraction.
2. **Owner Operational Dashboard (Phase 6B):** Header greeting, live KPI calculation, quick action buttons, and responsive layout.
3. **Owner Notification Center (Phase 6C):** In-app notification bell, unread count badge, notification popover, read/unread states, and 4 event triggers.
4. **Product Catalog & Category Management:** Product CRUD, weight variants, image upload tab, preset chips, dynamic shop categories, and empty-category deletion protection.
5. **Kitchen Order Fulfillment:** Status workflow, order itemization, custom cake messaging, and printable PDF invoices.
6. **Delivery Slot Logistics:** Day-of-week slots, capacity enforcement, overbooking prevention, and cancelled order slot restoration.
7. **Customer Marketplace & Storefront:** Multi-level location hierarchy (/explore), public bakery storefronts (/shop/[id]), dynamic category filtering, and eggless toggle.
8. **Cash on Delivery (COD) Checkout:** Guest checkout flow, unique order number generation, and live order tracking (/orders/[orderNumber]).
9. **Multi-Tenant Ownership Isolation:** Scoping of all owner resources via `ShopAccessValidator` and authenticated owner JWT tokens.
10. **Database Foundation:** All 9 Flyway migrations (V1 to V9) and 20 JPA entities with strict schema validation.

---

## 22. Partially Complete

The following features exist in the codebase but require targeted completion before production:

1. **Admin Dashboard Intelligence:** Missing granular PRD metrics (`inactiveShops`, `todayRegistrations`, `activeSubscriptions`, `expiredSubscriptions`, `todayPayments`, `monthlyRevenue`).
2. **Admin Shop Suspension:** Needs a confirmation dialog with reason text input in the frontend; backend must log the admin actor ID rather than `null`.
3. **Admin Document Verification:** Backend needs approve/reject endpoints for `BusinessDocument`; admin UI needs review action buttons.
4. **Subscription Expiration Scheduler:** `SubscriptionScheduler` must invoke `shopStatusManager.markShopInactive` when a subscription expires so the shop is hidden from customer discovery.
5. **Shop Access Gating:** `ShopAccessValidator.java` must re-enable verification and subscription checks, and explicitly reject `ShopStatus.SUSPENDED`.
6. **Online Payment Gateway:** Staged Razorpay integration needs real HMAC-SHA256 webhook signature validation and production key configuration.
7. **Owner Payment History:** Add `GET /api/owner/payments` to display lifetime billing receipts to owners.
8. **Cart Experience:** Unify single-item checkout and multi-item cart drawer.

---

## 23. Missing Features (From Original PRD)

The following features described in `Cake_Platform_PRD_Final.md` are not yet implemented:

1. **Password Reset Flow (§ 48):** Forgot password request, secure one-time reset token generation, email dispatch, and token verification.
2. **Email Verification Flow (§ 49):** Registration verification email with confirmation link.
3. **Auth Rate Limiting / Brute Force Protection (§ 47):** Login attempt throttling, IP rate limiting, and account lockout.
4. **Cloudinary Storage Adapter (§ 50):** Direct cloud image upload integration for production hosting environments where local disk storage is ephemeral.
5. **Customer Saved Accounts (§ 5.3):** Customer account registration, login, and saved address book (currently operates in guest mode).

---

## 24. Important New Features Recommended

Based on the existing architecture and the goal of running a high-performing commercial SaaS platform, the following features are recommended:

### 24.1 Essential Before Public Launch
1. **Remove Security Backdoor:** Delete or restrict `POST /api/auth/make-admin` which allows unauthenticated privilege escalation to `ROLE_ADMIN`.
2. **Subscription Expiry Fix:** Connect `SubscriptionScheduler` to `ShopStatusManager.markShopInactive`.
3. **Suspension Reason Enforcement:** Prompt admin for suspension reason and record in activity logs.
4. **Re-enable Access Gating:** Re-activate verification and subscription checks in `ShopAccessValidator.java`.

### 24.2 Important Soon After Launch
1. **Automated WhatsApp / SMS Order Alerts:** Integrate Twilio or Gupshup for instant order status alerts to customers and kitchen dispatch alerts to bakers.
2. **Coupon Code Validation in Checkout:** Connect existing `coupons` table to the checkout calculation.
3. **Automated Payout Processing:** Connect `ShopPayoutDetails` to Razorpay Route for automated split payments and commission settlement.

### 24.3 Growth Features
1. **Bakery Custom Subdomains:** Allow bakeries to have vanity URLs like `johnscakes.cakestore.in`.
2. **Holiday Seasonal Calendars:** Enable bakers to block out specific dates (e.g., Diwali, Christmas) or set holiday surge capacities.

### 24.4 Future / Advanced
1. **Multi-Location / Multi-Kitchen Support:** Support multi-branch bakeries with shared catalogs and separate dispatch kitchens.
2. **Bakery Mobile Companion App:** Lightweight React Native / PWA kitchen dispatch screen with audio alerts.

---

## 25. P0/P1/P2/P3 Findings

### P0 — MUST FIX (Security & Data Integrity Blocker)
1. **Public Admin Escalation Endpoint:** `POST /api/auth/make-admin` in `AuthController.java` is publicly accessible without authentication. Anyone can elevate any account to `ROLE_ADMIN`. **Fix:** Remove endpoint or restrict to internal admin bootstrap key.
2. **Subscription Expiry Desynchronization:** `SubscriptionScheduler.java` expires subscriptions but leaves `shop.status = ACTIVE`, allowing expired bakeries to continue accepting customer orders. **Fix:** Call `shopStatusManager.markShopInactive(shop.getId(), null)`.
3. **Commented-Out Access Gating:** `ShopAccessValidator.java` has verification and subscription checks commented out, and lacks a check for `shop.getStatus() == SUSPENDED`. **Fix:** Restore checks and enforce suspended shop lockout.

### P1 — MUST FIX BEFORE ONLINE PAYMENT / PUBLIC LAUNCH
1. **Mock Razorpay Webhook Secret & Validation:** `WebhookController.java` uses a hardcoded mock secret and does not verify HMAC-SHA256 signatures of raw payloads. **Fix:** Implement standard Razorpay SDK signature verification with environment secrets.
2. **Missing Rate Limiting on Login:** `/api/auth/login` lacks rate limiting or account lockout, leaving the platform vulnerable to credential stuffing. **Fix:** Add Bucket4j filter or IP rate limiting.
3. **Admin Audit Logging Attribution:** Admin shop status changes log `null` actor IDs. **Fix:** Extract admin `id` from `@AuthenticationPrincipal` and persist in `activity_logs`.
4. **Missing Admin Suspension Reason Dialog:** Admin can suspend shops with a single click without documenting the reason. **Fix:** Add reason modal in `/admin/shops/[id]`.

### P2 — IMPORTANT (Post-Launch Polish)
1. **Admin Dashboard Stats Metrics:** Add `inactiveShops`, `todayRegistrations`, `activeSubscriptions`, `todayPayments`, and `monthlyRevenue` to `DashboardStatsResponse`.
2. **Admin KYC Document Review:** Add endpoints and UI actions to individually approve or reject `BusinessDocument` uploads.
3. **Owner Historical Payments List:** Add `GET /api/owner/payments` to display billing invoices to owners.
4. **Cloudinary Storage Adapter:** Replace local file disk storage with cloud storage for ephemeral container environments.

### P3 — FUTURE (Long-Term Roadmap)
1. **Password Reset & Email Verification Flows:** Implement self-service password reset and registration verification.
2. **Customer Accounts & Order History Portal:** Allow customers to log in and view past orders.
3. **Automated WhatsApp Order Updates:** Webhook trigger to WhatsApp Business API.

---

## 26. Completion Score

| Domain | Score | Weight | Weighted Score | Methodology & Justification |
| :--- | :---: | :---: | :---: | :--- |
| **Backend Architecture & APIs** | 88% | 15% | 13.2% | 70 REST endpoints, 20 JPA entities, clean layered design; needs webhook hardening & admin metrics. |
| **Frontend Applications (`frontend_v2`)**| 90% | 15% | 13.5% | 28 production pages, responsive UI, 0 compile/lint errors; needs suspension dialog & payment Polish. |
| **Database & Migrations** | 98% | 10% | 9.8% | 9 Flyway migrations, clean constraints, timestamps, and foreign keys. |
| **Authentication & Security** | 78% | 10% | 7.8% | Strong BCrypt & JWT; penalized for public make-admin endpoint and disabled gating. |
| **Admin Role** | 68% | 10% | 6.8% | Working dashboard & shop dossier; penalized for missing stats, suspension reason, and KYC review. |
| **Shop Owner Role** | 92% | 15% | 13.8% | Outstanding maturity across products, categories, orders, slots, analytics, and notifications. |
| **Customer Storefront & Checkout** | 85% | 10% | 8.5% | Full marketplace, storefront, custom cakes, slot picking, COD; online payments in pilot staging. |
| **Subscription Management** | 80% | 5% | 4.0% | Plans CRUD and current subscription work; scheduler fails to set shop inactive. |
| **Payments & Gateways** | 65% | 5% | 3.25% | COD 100% complete; Razorpay online gateway is staged with mock webhook verification. |
| **Testing & Verification** | 72% | 5% | 3.6% | 69 backend tests passing; 0 frontend automated unit tests (relies on E2E scripts). |
| **TOTAL WEIGHTED SCORE** | — | **100%** | **84.45%** | **OVERALL PRODUCT COMPLETION: SUBSTANTIALLY COMPLETE (~82–84%)** |

---

## 27. Recommended Remaining Roadmap

To achieve full production launch readiness efficiently without duplicating working code, the remaining work is organized into six targeted stages:

### STAGE A — Core Business Rules & Security Hardening (P0 Immediate)
- **Objective:** Eliminate critical security vulnerabilities and fix subscription lifecycle desynchronization.
- **Tasks:**
  1. Remove or secure `POST /api/auth/make-admin`.
  2. Fix `SubscriptionScheduler.java` to invoke `shopStatusManager.markShopInactive(shop.getId(), null)` upon subscription expiration.
  3. Re-enable verification and subscription access checks in `ShopAccessValidator.java`, and add explicit checks blocking `ShopStatus.SUSPENDED`.
  4. Pass authenticated admin user ID to `ShopStatusManager` so activity logs record the real actor.

### STAGE B — Complete Admin Platform (P1/P2)
- **Objective:** Complete all PRD Section 24-28 requirements for platform administration.
- **Tasks:**
  1. Expand `AdminDashboardService.getPlatformStats()` to return `inactiveShops`, `todayRegistrations`, `activeSubscriptions`, `expiredSubscriptions`, `todayPayments`, and `monthlyRevenue`.
  2. Implement suspension reason modal in `admin/shops/[id]/page.tsx` and pass reason to `PATCH /api/admin/shops/{id}/status`.
  3. Add backend endpoints and frontend actions to approve/reject uploaded KYC compliance documents.

### STAGE C — Online Payments & Razorpay Hardening (P1)
- **Objective:** Transform staged Razorpay pilot into a secure, verified production gateway.
- **Tasks:**
  1. Parameterize Razorpay Key ID and Secret in `application.yml` and `.env.production`.
  2. Implement HMAC-SHA256 signature verification of raw webhook payloads in `WebhookController.java`.
  3. Replace `findAll().stream()` scan in `WebhookController` with `orderRepository.findByOrderNumber()`.
  4. Add `GET /api/owner/payments` endpoint and owner billing history table.

### STAGE D — Customer Experience & Order Completion (P2)
- **Objective:** Polish customer ordering and storefront experience.
- **Tasks:**
  1. Connect coupon discount code validation to `/checkout`.
  2. Enhance `/orders/[orderNumber]` with direct customer contact baker action button.
  3. Unify multi-item cart drawer with direct checkout flow.

### STAGE E — Production Deployment & Cloud Storage (P2)
- **Objective:** Prepare infrastructure for public cloud hosting.
- **Tasks:**
  1. Implement Cloudinary or AWS S3 image storage service adapter.
  2. Parameterize CORS allowed origins for production domain.
  3. Add login rate limiting filter on `/api/auth/login`.

### STAGE F — Final Production Verification & Launch (P0)
- **Objective:** End-to-end regression validation and official launch sign-off.
- **Tasks:**
  1. Full automated integration suite execution.
  2. Multi-tenant boundary penetration test.
  3. Live payment gateway end-to-end transaction verification.

---

## 28. FINAL PRODUCT STATUS

### Question 1: How much of CakeStore is actually complete today?
**CakeStore is approximately 82% to 84% complete today.**  
The foundational architecture, database schema, multi-tenant isolation, kitchen order fulfillment, catalog management, real SQL analytics, in-app notification center, delivery slot capacity logistics, customer marketplace discovery, public storefronts, and Cash on Delivery (COD) guest checkout are **100% complete, fully integrated, and verified**.

### Question 2: What remains before the entire 3-role platform can be considered complete?
Before CakeStore can be declared a complete, production-ready 3-role platform, four key areas must be finalized:
1. **Security & Gating Hardening:** Remove the unauthenticated `/api/auth/make-admin` escalation endpoint, re-enable access gating in `ShopAccessValidator`, and fix the `SubscriptionScheduler` bug that fails to mark expired bakeries as `INACTIVE`.
2. **Admin Completeness:** Add the missing PRD dashboard metrics, require a reason dialog for shop suspension, log admin actor IDs, and add KYC document approval actions.
3. **Online Payment Verification:** Transition Razorpay integration from staged pilot mode to production mode by implementing HMAC-SHA256 signature verification on webhooks.
4. **Owner Billing Records:** Expose `GET /api/owner/payments` so bakery owners can view past subscription payment invoices.

### Question 3: What should we build next?
**We should immediately execute STAGE A (Core Business Rules & Security Hardening).**  
Stage A addresses all P0 issues: eliminating the public admin escalation backdoor, fixing the subscription scheduler expiration disconnect, re-enabling owner access gating, and recording real admin actor IDs in audit logs. These changes require zero schema migrations, preserve all accepted Phase 6A–6D work, and immediately elevate platform security and business logic to enterprise standards.
