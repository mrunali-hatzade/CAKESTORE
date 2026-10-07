# CakeStore SaaS Platform — Implementation Status

**Document Version:** 1.0 (Phase 0.5 Status Baseline)  
**Date:** September 2026  
**Audited Against:** Actual Live Codebase, Spring Boot Backend (Java 17), Next.js 14 Frontend, and PostgreSQL 18.

---

## 1. Project Architecture

CakeStore is a multi-tenant B2B2C Software-as-a-Service (SaaS) web platform. The platform is designed around three distinct, unified user domains:

1. **Customer Marketplace & Bakery Storefronts:** Public directory for local bakery discovery by hierarchical geographical boundaries (State $\rightarrow$ District $\rightarrow$ City $\rightarrow$ Area), verified bakery profile showcases, real product catalog inspection, and direct custom cake enquiries.
2. **Shop Owner Workspace:** Multi-tenant authenticated portal where bakery owners manage their product catalog, weight/size variants, optional addons, pickup/delivery capacity time slots, order status lifecycle, and view bakery analytics.
3. **Platform Administration Panel:** Centralized oversight dashboard for platform administrators to review bakery registrations, verify FSSAI accreditations, approve/suspend shops, manage SaaS subscription plans, and inspect system-wide activity.

The backend is built as a single Spring Boot modular monolith, and the frontend is a unified Next.js App Router application consuming the Spring Boot REST API.

---

## 2. Technology Stack

| Layer | Framework / Library | Version | Operational State |
| :--- | :--- | :--- | :--- |
| **Frontend Runtime** | Next.js (App Router) | 14.2.5 | Active (`npm run build` PASS) |
| **UI Library** | React | 18.3.1 | Active |
| **Language (FE)** | TypeScript | 5.x | Active (Strict type checking PASS) |
| **Styling** | Tailwind CSS | 3.4.1 | Active (Custom V2 Theme) |
| **Icons** | Lucide React | 0.400.0 | Active |
| **Backend Runtime** | Java OpenJDK | 17 | Active |
| **Backend Framework** | Spring Boot | 3.3.2 | Active (`mvn test` PASS: 34 tests) |
| **Security & Auth** | Spring Security 6, JJWT | 0.12.5 | Active (Stateless Bearer JWT) |
| **Database & ORM** | PostgreSQL 18, Hibernate 6 | 6.5.2 | Active (21 tables in schema) |
| **DB Migrations** | Flyway | 10.x | Active (V1 through V9 applied) |
| **Image Storage** | Cloudinary / Local filesystem | 1.38.0 | Active with disk fallback |
| **Payment Gateway** | Razorpay SDK | 1.4.6 | Backend ready (Mock checkout active) |

---

## 3. Customer Implementation Status

| Feature Area | Classification | Status Details |
| :--- | :--- | :--- |
| **Marketplace Homepage (`/`)** | `DONE` | Location-based search (State, District, City, Area), Category tabs, live bakery cards. |
| **Bakery Search & Filters** | `DONE` | Keyword matching on bakery name, address, area, and description. |
| **Bakery Storefront (`/shop/[id]`)** | `DONE` | Canonical route, cover banner, logo, business details, FSSAI accreditation, active badges. |
| **Bakery Product Showcase** | `DONE` | Strictly isolated to active bakery products, empty state handling, category filtering. |
| **Product Detail Modal** | `DONE` | Real image, price (₹), description, real variants, addons, availability badge. |
| **Customer Cake Enquiry Flow** | `DONE` | Submits to `POST /api/storefront/enquiries`, saves to `custom_cake_requests`, WhatsApp chat. |
| **Guest Cart & Checkout** | `PARTIAL` | Skeletons preserved in `components/checkout/`; backend order endpoint exists. |
| **Customer Order Tracking** | `BACKEND ONLY` | Backend order lookup & invoice generation exist; dedicated tracking screen pending. |
| **Customer Reviews Submission** | `BACKEND ONLY` | Backend `feedback` table and endpoints exist; public submission form pending. |

---

## 4. Owner Implementation Status

| Feature Area | Classification | Status Details |
| :--- | :--- | :--- |
| **Owner Onboarding (`/onboarding`)** | `DONE` | 4-step wizard: Personal info, bakery info, location, document upload $\rightarrow$ `/api/auth/register`. |
| **Owner Authentication (`/(auth)/login`)** | `DONE` | JWT issuance, localStorage token storage, protected route redirection. |
| **Dashboard Overview (`/dashboard/owner`)** | `PARTIAL` | Real-time stats from `GET /api/shops/my-shop/stats`; trend charts pending. |
| **Product Catalog (`/dashboard/owner/products`)**| `DONE` | Full CRUD, weight/size variants, addons, image upload (`POST /api/owner/media/upload`). |
| **Order Management (`/dashboard/owner/orders`)** | `DONE` | Order list, search/filters, status updates (`PATCH /status`), PDF invoice generation. |
| **Delivery Slots (`/dashboard/owner/delivery-slots`)** | `DONE` | Full CRUD, weekday slots, capacity limits, active toggle. |
| **Customer Enquiries & Custom Cakes** | `BACKEND ONLY` | `GET /api/owner/custom-cakes` & `/api/owner/enquiries` exist; owner response screen pending. |
| **Customer CRM Database** | `BACKEND ONLY` | `GET /api/owner/customers` exists; frontend screen pending. |
| **Coupons & Discounts** | `BACKEND ONLY` | `GET/POST /api/owner/coupons` exists; frontend screen pending. |
| **Reviews & Feedback Management** | `BACKEND ONLY` | `GET/POST /api/owner/feedback` exists; frontend screen pending. |
| **Analytics Dashboard** | `BACKEND ONLY` | `GET /api/owner/analytics/dashboard` exists; frontend charts pending. |
| **Shop Settings & Profile** | `BACKEND ONLY` | `GET/PUT /api/shops/my-shop` exists; frontend screen pending. |
| **Subscription & Billing** | `BACKEND ONLY` | `GET /api/owner/subscriptions/current` exists; frontend screen pending. |

---

## 5. Admin Implementation Status

| Feature Area | Classification | Status Details |
| :--- | :--- | :--- |
| **Admin Authentication** | `PARTIAL` | Backend supports `ROLE_ADMIN`; dedicated admin login UI pending. |
| **Platform Statistics** | `BACKEND ONLY` | `GET /api/admin/dashboard/stats` exists in backend; frontend UI pending. |
| **Bakery Directory & Auditing** | `BACKEND ONLY` | `GET /api/admin/shops` and `GET /api/admin/shops/{id}` exist in backend; UI pending. |
| **Bakery Approval & Status Lifecycle** | `BACKEND ONLY` | `PATCH /api/admin/shops/{id}/status` exists in backend; UI pending. |
| **Subscription Plan Management** | `BACKEND ONLY` | Full CRUD `/api/admin/plans` exists in backend; UI pending. |
| **Platform Broadcast Messaging** | `BACKEND ONLY` | `POST /api/admin/messages` exists in backend; UI pending. |

---

## 6. Backend Implementation Status

- **Status:** `DONE` (100% compiled and unit-tested).
- **Modules (14):** `admin`, `audit`, `auth`, `interaction`, `media`, `notification`, `order`, `payment`, `product`, `security`, `shop`, `storefront`, `subscription`, `user`.
- **Controllers:** 22 Spring Boot REST controllers.
- **Endpoints:** 63 mapped endpoints.
- **Security:** Stateless JWT authentication, role-based method security (`@PreAuthorize`), rate limiting, multi-tenant owner checks.

---

## 7. Database Status

- **Status:** `DONE` (21 tables active in PostgreSQL).
- **Applied Flyway Migrations:**
  - `V1__init_schema.sql`
  - `V2__add_verification_and_location.sql`
  - `V3__add_subscriptions_and_payouts.sql`
  - `V4__add_notifications.sql`
  - `V5__orders_and_customers.sql`
  - `V6__feedback_and_enquiries.sql`
  - `V7__cake_variants_and_slots.sql`
  - `V8__coupons_and_discounts.sql`
  - `V9__order_lifecycle.sql`

---

## 8. Authentication Status

- **Status:** `DONE`.
- **Public Endpoints:** `/api/auth/**`, `/api/storefront/**`, `/uploads/**`, `/error`.
- **Authenticated Endpoints:** All `/api/owner/**`, `/api/admin/**`, `/api/shops/my-shop/**`.
- **Token Handling:** Standard Bearer header parsed by `JwtAuthenticationFilter`.

---

## 9. Payment Status

- **Classification:** `PARTIAL / MOCK`.
- **Current State:** `Payment` entity and ledger exist in PostgreSQL. `POST /api/owner/payments/mock-checkout` provides simulated subscription payment success for development. Razorpay SDK integrated; awaiting live production credentials.

---

## 10. Notification Status

- **Classification:** `BACKEND ONLY`.
- **Current State:** Table `notifications` exists with unread index. `NotificationService` dispatches in-app alerts on orders and enquiries. Frontend notification bell/inbox UI not yet connected.

---

## 11. Current Frontend Routes

| Route | Role | Purpose | Verification Status |
| :--- | :--- | :--- | :--- |
| `/` | Customer | Marketplace Home with Location Filter | `DONE` (Verified live) |
| `/explore` | Customer | Bakery Grid Discovery | `DONE` (Verified live) |
| `/shop/[id]` | Customer | Canonical Bakery Storefront Profile | `DONE` (Verified live) |
| `/shops/[id]` | Customer | HTTP 307 Redirection to `/shop/[id]` | `DONE` (Verified live) |
| `/checkout` | Customer | Standalone Checkout Prototype | `PARTIAL` |
| `/how-it-works` | Public | Informational page | `DONE` |
| `/pricing` | Public | SaaS Pricing page | `DONE` |
| `/for-owners` | Public | Seller Acquisition landing | `DONE` |
| `/contact` | Public | Customer Support form | `DONE` |
| `/(auth)/login` | Owner/Admin | JWT Login Page | `DONE` (Verified live) |
| `/onboarding` | Owner | 4-Step Bakery Registration Wizard | `DONE` (Verified live) |
| `/dashboard/owner` | Owner | Owner Dashboard Home | `DONE` (Verified live) |
| `/dashboard/owner/products` | Owner | Product Catalog & Variants Manager | `DONE` (Verified live) |
| `/dashboard/owner/orders` | Owner | Orders Management & Invoices | `DONE` (Verified live) |
| `/dashboard/owner/delivery-slots` | Owner | Pickup/Delivery Slots Manager | `DONE` (Verified live) |

---

## 12. Current API Integration Status

- **Active Frontend-to-Backend Integrations (17 endpoints):** All 17 active calls verified with live backend responses.
- **Backend Endpoints Awaiting Frontend Screens (46 endpoints):** Documented completely in `API_INTEGRATION_MATRIX.md`.

---

## 13. Remaining Functionality to Implement

1. **Owner Enquiries & Custom Cake Review Screen (`/dashboard/owner/enquiries`):** Allow baker to view leads, review requested dates/servings, set price quote, and update status.
2. **Owner Analytics & Revenue Visuals (`/dashboard/owner/analytics`):** Charting components for sales volume and revenue.
3. **Owner Profile & Settings (`/dashboard/owner/settings`):** Manage address, contact, and bank settlement details.
4. **Owner Subscription & Billing (`/dashboard/owner/subscription`):** Display current plan, renewal date, and upgrade actions.
5. **Platform Admin Panel (`/admin/*`):** Platform metrics, bakery directory, approval/rejection actions, and plan management.
6. **Customer Storefront Direct Checkout:** Connect storefront basket to `POST /api/storefront/shops/{id}/orders`.

---

## 14. Known Technical Debt

1. **Legacy Route:** `/shops/[id]` exists as a redirect to `/shop/[id]`.
2. **Dietary Tag on Products:** Database `products` table does not have a `dietary_type` column (only `order_items` captures this currently).
3. **Stand-in JPA Entity:** Table `order_status_history` exists in DB but does not yet have a corresponding Java `@Entity` class.

---

## 15. Deleted Files (Phase 0 & 0.5 Cleanup)

- `frontend_v1/src/` (and redundant `src/data/locations.ts`)
- `frontend_v1/storefront.css`
- `frontend_v1/app/shops/[id]/StorefrontPageClient.tsx`
- `frontend_v1/components/layout/BottomTrustBar.tsx`
- `frontend_v1/components/storefront-v2/StorefrontNavbarV2.tsx`
- `frontend_v1/components/storefront-v2/StorefrontHeroV2.tsx`
- `frontend_v1/components/storefront-v2/StorefrontFooterV2.tsx`
- `frontend_v1/components/storefront-v2/ProductModal.tsx`
- `frontend_v1/components/storefront-v2/ShopStatusIndicator.tsx`
- All 9 unreferenced files in `frontend_v1/components/storefront/`
- All 7 duplicate exploratory files in `frontend_v1/components/marketplace/`
- All 6 abandoned tab prototypes in `frontend_v1/components/dashboard/owner/`

---

## 16. Preserved Files

- `frontend_v1/components/storefront/ProductDetailModal.tsx` (Canonical product detail & enquiry component).
- `frontend_v1/components/checkout/CartDrawer.tsx` & `CheckoutModal.tsx` (Clean reference skeletons for Phase 4).
- `frontend_v1/components/dashboard/owner/` (Coupons, Customers, Settings, Subscription tab skeletons).
- `frontend_v1/lib/constants/mockData.ts` (Defensive offline fallback).
- `frontend_v1/components/ui/RatingStars.tsx` (Active component).
- All PRD documents.

---

## 17. Current Phase

**Phase 0.5: Complete.** Baseline stabilized, dead files removed, architecture documented, and builds passing.

---

## 18. Next Recommended Phase

**Phase 1: Owner Enquiries & Custom Cake Request Management UI (`/dashboard/owner/enquiries`).**
