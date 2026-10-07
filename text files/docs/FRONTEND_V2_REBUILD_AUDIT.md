# CakeStore Frontend V2 Rebuild — Comprehensive Architectural Audit & Master Plan

**Document Version:** 1.0  
**Date:** September 4, 2026  
**Auditor:** Senior Software Architect & Frontend Engineer  
**Workspace:** `D:\PROJECTS\CAKE SAAs1`  
**Reference Design:** `D:\PROJECTS\CAKE SAAs\frontend_v2`  
**Status:** PHASE A Complete — Ready for Review & Approval

---

## 1. Executive Summary

This audit establishes the foundation for creating `frontend_v2` inside `D:\PROJECTS\CAKE SAAs1` alongside the existing working Next.js application (`frontend/`). 

### Core Guardrails:
1. **Zero Modifications to Existing Code:** The current `frontend/`, `backend/`, PostgreSQL database, and Flyway migrations (V1–V8) remain completely untouched and fully functional.
2. **Design Inspiration vs. Functional Truth:**
   - Visual / Layout / Aesthetics Reference: `D:\PROJECTS\CAKE SAAs\frontend_v2`
   - Functional, Routing & Integration Truth: `D:\PROJECTS\CAKE SAAs1\frontend`
   - Business Logic & Contract Truth: `D:\PROJECTS\CAKE SAAs1\backend` (Spring Boot 3.2.x REST APIs)
3. **No Mock Data in Production Paths:** Every screen, table, filter, metric, and form in `frontend_v2` connects directly to active Spring Boot endpoints with rigorous TypeScript interfaces.

---

## 2. Inventory of Existing Working Routes (`frontend/`)

The working frontend contains 33 active routes across public, customer, shop owner, and system administrator domains:

### 2.1 Public & Authentication Routes
| Route | Access | Purpose | Primary Data Source |
| :--- | :--- | :--- | :--- |
| `/` | Public | Marketplace Landing Page (Hero, Featured Bakeries, Category filters) | `GET /api/storefront/shops/search` |
| `/login` | Public | Role-aware login (Customer, Owner, Admin) | `POST /api/auth/login` |
| `/register` | Public | Multi-step bakery registration + owner onboarding | `POST /api/auth/register` (multipart) |
| `/forgot-password` | Public | Password recovery form (Stubbed in UI) | N/A (documented in gap analysis) |

### 2.2 Customer Marketplace & Storefront Routes
| Route | Access | Purpose | Primary Data Source |
| :--- | :--- | :--- | :--- |
| `/shops` | Public | Full marketplace search, filters (city, district, type) | `GET /api/storefront/shops/search` |
| `/shop/[id]` | Public | Dedicated baker storefront (Catalog, Reviews, Hours) | `GET /api/storefront/shops/{id}` |
| `/shop/[id]/products` | Public | Storefront product catalog with category pills | `GET /api/storefront/shops/{id}/products` |
| `/shop/[id]/product/[productId]` | Public | Product details, custom message, tier & weight options | `GET /api/storefront/shops/{id}/products/{pId}` |
| `/shop/[id]/checkout` | Public | In-store checkout (Name, Phone, Delivery Slot, Address) | `POST /api/storefront/shops/{id}/orders` |
| `/shop/[id]/custom-cake` | Public | Custom cake request submission | `POST /api/storefront/shops/{id}/custom-cakes` |
| `/orders/[orderNumber]` | Public / Guest | Live order status tracker & timeline | `GET /api/storefront/orders/{orderNumber}` |
| `/orders/[orderNumber]/invoice` | Public / Guest | Printable PDF / HTML tax invoice | `GET /api/storefront/orders/{orderNumber}/invoice` |

### 2.3 Shop Owner Dashboard Routes (`ROLE_SHOP_OWNER`)
| Route | Access | Purpose | Primary Data Source |
| :--- | :--- | :--- | :--- |
| `/owner` | Owner | Redirects to `/owner/dashboard` | Session State |
| `/owner/dashboard` | Owner | Business overview, revenue metrics, urgent orders, alerts | `GET /api/owner/analytics/summary`, `GET /api/owner/orders` |
| `/owner/products` | Owner | Product catalog table, stock toggles, search, delete | `GET /api/owner/products`, `DELETE /api/owner/products/{id}` |
| `/owner/products/new` | Owner | Product creation wizard (images, flavors, tiers, eggless) | `POST /api/owner/products` |
| `/owner/products/[id]/edit` | Owner | Edit existing product details, price, images, variations | `PUT /api/owner/products/{id}` |
| `/owner/orders` | Owner | Master order management board (All/Pending/Confirmed/Delivered) | `GET /api/owner/orders`, `PATCH /api/owner/orders/{id}/status` |
| `/owner/orders/[id]` | Owner | Order detail inspection, timeline updates, customer info | `GET /api/owner/orders/{id}` |
| `/owner/delivery-slots` | Owner | Configure delivery slots (capacity, cutoff, time windows) | `GET|POST|PUT|DELETE /api/owner/delivery-slots` |
| `/owner/coupons` | Owner | Promo codes, discount rules, validity & usage limits | `GET|POST /api/owner/coupons` |
| `/owner/customers` | Owner | Customer directory, repeat orders, lifetime spend | `GET /api/owner/customers` |
| `/owner/analytics` | Owner | Sales trends, revenue by category, order volume charts | `GET /api/owner/analytics/sales`, `/summary` |
| `/owner/settings` | Owner | Shop profile, operating hours, delivery radius, logo | `GET|PUT /api/owner/shop/my-shop` |
| `/owner/payouts` | Owner | Banking details, IFSC, UPI ID, settlement history | `GET|PUT /api/owner/shop/payout-settings` |
| `/owner/subscription` | Owner | Current SaaS tier, renewal date, plan upgrade matrix | `GET /api/owner/subscription/current`, `POST /upgrade` |
| `/owner/feedback` | Owner | Customer reviews, ratings, and testimonials | `GET /api/owner/interactions/feedback` |
| `/owner/enquiries` | Owner | Customer inquiries, WhatsApp leads, custom requests | `GET|PATCH /api/owner/interactions/enquiries` |

### 2.4 Super Admin Panel Routes (`ROLE_ADMIN`)
| Route | Access | Purpose | Primary Data Source |
| :--- | :--- | :--- | :--- |
| `/admin` | Admin | Super-admin dashboard, platform GMV, active bakeries | `GET /api/admin/dashboard/overview` |
| `/admin/shops` | Admin | Directory of all bakeries with status approval/suspension | `GET /api/admin/dashboard/shops`, `PATCH .../status` |
| `/admin/shops/[id]` | Admin | Deep dive inspection of bakery profile, orders, and audits | `GET /api/admin/dashboard/shops/{shopId}` |
| `/admin/plans` | Admin | SaaS subscription plans CRUD (Pricing, features, limits) | `GET|POST|PUT|DELETE /api/admin/subscription-plans` |
| `/admin/messages` | Admin | System-wide broadcast alerts sent to owners/marketplaces | `GET|POST|DELETE /api/admin/messages` |

---

## 3. Backend API Capabilities: Available vs. Missing

```
+-----------------------------------------------------------------------------------+
|                              BACKEND CONTROLLER AUDIT                              |
+-----------------------------------------------------------------------------------+
|  AUTHENTICATION & VERIFICATION                                                    |
|  - AuthController: POST /api/auth/register, POST /login, POST /make-admin          |
|  - VerificationController: POST /api/verification/documents (FSSAI/KYC files)     |
|                                                                                   |
|  PUBLIC STOREFRONT & MARKETPLACE                                                  |
|  - StorefrontController: GET /shops/{id}, GET /shops/search                       |
|  - StorefrontOrderController: POST /{shopId}/orders, GET /orders/{orderNum}       |
|  - StorefrontProductController: GET /{shopId}/products, GET /.../products/{pId}   |
|  - StorefrontDeliverySlotController: GET /{shopId}/delivery-slots                 |
|  - StorefrontFeedbackController: GET|POST /{shopId}/feedback                      |
|  - StorefrontEnquiryController: POST /{shopId}/enquiries                          |
|  - CustomCakeController: POST /{shopId}/custom-cakes                              |
|                                                                                   |
|  OWNER OPERATIONS (hasRole('SHOP_OWNER'))                                         |
|  - OwnerProductController: CRUD on /api/owner/products                            |
|  - OwnerOrderController: GET, PATCH status on /api/owner/orders                   |
|  - OwnerDeliverySlotController: CRUD on /api/owner/delivery-slots                 |
|  - OwnerCouponController: GET, POST on /api/owner/coupons                         |
|  - OwnerCustomerController: GET /api/owner/customers                              |
|  - OwnerAnalyticsController: GET /summary, GET /sales                             |
|  - OwnerSubscriptionController: GET /current, POST /upgrade, POST /cancel        |
|  - OwnerInteractionController: GET feedback, GET|PATCH enquiries                  |
|  - ShopController: GET, PUT /api/owner/shop/my-shop                                |
|  - ShopPayoutController: GET, PUT /api/owner/shop/payout-settings                 |
|  - NotificationController: GET /notifications, PATCH /{id}/read                   |
|                                                                                   |
|  ADMIN OPERATIONS (hasRole('ADMIN'))                                              |
|  - AdminDashboardController: GET /overview, GET /shops, GET /shops/{id}, PATCH    |
|  - AdminSubscriptionPlanController: CRUD on /api/admin/subscription-plans         |
|  - AdminMessageController: GET, POST, DELETE on /api/admin/messages               |
+-----------------------------------------------------------------------------------+
```

### 3.1 What is Fully Available
- **100% Core Commerce:** Product catalog, image URLs, categories, pricing, variants, eggless flags.
- **100% Guest Checkout:** In-store ordering without customer account creation, guest email/phone capture, slot reservation, and real order numbers.
- **100% Owner Shop Controls:** Delivery slot time windows, coupon validation, order status pipeline (`PENDING` -> `ACCEPTED` -> `PREPARING` -> `OUT_FOR_DELIVERY` -> `DELIVERED`).
- **100% Admin Governance:** Multi-tenant bakery status moderation (`ACTIVE`, `SUSPENDED`, `REJECTED`), SaaS subscription tiers, broadcast messaging.

### 3.2 What is Missing / Gaps (Documented in `docs/AUTH_VERIFICATION_GAP.md`)
- **SMS / Email OTP Verification:** No SMS gateway (Twilio, Msg91), no JavaMailSender, no OTP tables in DB.
- **Password Reset Service:** No forgot-password token generation or email link dispatch.
- **Real Payment Gateway Webhooks:** Backend creates order in `PENDING` payment state (COD and manual UPI supported, Razorpay webhook requires future backend phase).

---

## 4. Visual Reference Analysis (`D:\PROJECTS\CAKE SAAs\frontend_v2`)

Inspection of the reference folder reveals high-quality modern styling that must be synthesized with real backend data:
1. **Tech Stack in Reference:** Next.js 15, Tailwind CSS v4, Lucide React, Zustand.
2. **Visual Strengths to Adopt:**
   - Warm, artisanal bakery aesthetic (amber/rose/gold palettes, clean card elevations, refined badges).
   - Polished mobile-first sticky navigation and search bars.
   - Clean owner sidebar with collapsible navigation and icon treatments.
   - Modern glassmorphism banners for promotional callouts.
3. **Flaws / Prototype Shortcuts in Reference to REJECT:**
   - Hardcoded arrays of mock bakeries and mock orders.
   - Non-functional forms that only `console.log()` state.
   - Missing all Super-Admin views (0 admin screens exist in the reference).
   - Incomplete Owner dashboard subroutes (missing payouts, feedback, notifications, delivery slot management).

---

## 5. Owner Onboarding & Registration Form Specification

Based on `RegisterRequest.java` (`D:\PROJECTS\CAKE SAAs1\backend\src\main\java\com\cakestore\dto\RegisterRequest.java`), the `frontend_v2` onboarding flow is partitioned into 3 structured steps:

### Step 1: Personal & Login Credentials (Required)
- `fullName` (Text, Required, `@NotBlank`)
- `email` (Email, Required, `@NotBlank`, `@Email`)
- `password` (Password, Required, `@NotBlank`, `@Size(min = 8)`)
- `mobile` (Tel, Required, `@NotBlank`, 10-digit Indian standard)

### Step 2: Bakery Identity & Contact (Required + Optional)
- `businessName` (Text, Required, `@NotBlank`)
- `businessType` (Select: `HOME_BAKER`, `PASTRY_SHOP`, `CUSTOM_CAKE_STUDIO`, `COMMERCIAL_BAKERY`, Optional)
- `businessDescription` (Textarea, Optional)
- `businessPhone` (Tel, Optional)
- `businessEmail` (Email, Optional)
- `yearsInBusiness` (Number, Optional)

### Step 3: Location & Business Verification
- `addressLine1` (Text, Required, `@NotBlank`)
- `addressLine2` (Text, Optional)
- `area` (Text, Optional)
- `city` (Text, Required, `@NotBlank`)
- `district` (Text, Optional)
- `state` (Select/Text, Required, `@NotBlank`)
- `pincode` (Text, Required, `@NotBlank`, 6-digit)
- `fssaiRegistration` (Text, Optional)
- `verificationFile` (File Upload, PDF/PNG/JPG, Optional multipart parameter)

---

## 6. Target Architecture & Directory Layout for `frontend_v2`

The new frontend will be established at `D:\PROJECTS\CAKE SAAs1\frontend_v2` utilizing Next.js 14/15 App Router with full strict TypeScript:

```
frontend_v2/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
├── .env.local                  (NEXT_PUBLIC_API_URL=http://localhost:8080)
├── public/
│   ├── images/
│   ├── placeholders/
│   └── icons/
└── src/
    ├── app/
    │   ├── layout.tsx          (Global Providers: Auth, Toast, Theme)
    │   ├── globals.css         (Tailwind directives, custom font imports)
    │   ├── page.tsx            (Marketplace Home / Landing)
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── (public)/
    │   │   ├── shops/page.tsx
    │   │   └── orders/[orderNumber]/page.tsx
    │   ├── shop/[id]/
    │   │   ├── layout.tsx      (Dedicated Baker Storefront Header & Cart Bar)
    │   │   ├── page.tsx        (Storefront Home & Featured Treats)
    │   │   ├── products/page.tsx
    │   │   ├── product/[productId]/page.tsx
    │   │   ├── custom-cake/page.tsx
    │   │   └── checkout/page.tsx
    │   ├── owner/
    │   │   ├── layout.tsx      (Owner Sidebar, Top Bar, Live Notifications)
    │   │   ├── dashboard/page.tsx
    │   │   ├── products/
    │   │   │   ├── page.tsx
    │   │   │   ├── new/page.tsx
    │   │   │   └── [id]/edit/page.tsx
    │   │   ├── orders/
    │   │   │   ├── page.tsx
    │   │   │   └── [id]/page.tsx
    │   │   ├── delivery-slots/page.tsx
    │   │   ├── coupons/page.tsx
    │   │   ├── customers/page.tsx
    │   │   ├── analytics/page.tsx
    │   │   ├── settings/page.tsx
    │   │   ├── payouts/page.tsx
    │   │   ├── subscription/page.tsx
    │   │   ├── feedback/page.tsx
    │   │   └── enquiries/page.tsx
    │   └── admin/
    │       ├── layout.tsx      (Super Admin Sidebar & System Status)
    │       ├── page.tsx        (Super Admin Dashboard Overview)
    │       ├── shops/
    │       │   ├── page.tsx
    │       │   └── [id]/page.tsx
    │       ├── plans/page.tsx
    │       └── messages/page.tsx
    ├── components/
    │   ├── ui/                 (Button, Input, Card, Modal, Badge, Dropdown, Table, Spinner)
    │   ├── shared/             (Navbar, Footer, SearchBar, StatusBadge, EmptyState)
    │   ├── marketplace/        (HeroSection, CategoryPills, BakeryCard, FilterSidebar)
    │   ├── storefront/         (StorefrontHeader, ProductCard, CartDrawer, InStoreCheckoutModal)
    │   ├── owner/              (OwnerHeader, OwnerSidebar, MetricCard, OrderStatusPill, ProductForm)
    │   └── admin/              (AdminHeader, AdminSidebar, ShopApprovalModal, PlanFormModal)
    ├── context/
    │   ├── AuthContext.tsx     (Token management, role parsing, login/logout)
    │   └── CartContext.tsx     (Isolated in-store cart per bakery ID)
    ├── services/
    │   ├── api.ts              (Axios client with Bearer interceptors & error handling)
    │   ├── auth.service.ts
    │   ├── storefront.service.ts
    │   ├── owner.service.ts
    │   └── admin.service.ts
    └── types/
        ├── auth.types.ts
        ├── shop.types.ts
        ├── product.types.ts
        ├── order.types.ts
        ├── analytics.types.ts
        └── admin.types.ts
```

---

## 7. 19-Phase Master Rebuild Roadmap (Phases A – S)

- [x] **Phase A: Architectural Audit & Master Plan** *(Current Phase - docs generated, awaiting user approval)*
- [ ] **Phase B: Frontend V2 Scaffold & Environment Setup** (Initialize Next.js App Router, Tailwind, Lucide, TypeScript, config files)
- [ ] **Phase C: Design Tokens & Base Theme** (Colors, fonts, typography, card shadows, responsive layout primitives)
- [ ] **Phase D: Core State, API Client & Auth Provider** (Axios client with interceptors, AuthContext with token persistence, CartContext with per-shop isolation)
- [ ] **Phase E: Shared UI Component Library** (Accessible, typed base components: Button, Input, Select, Modal, Card, Table, Badge, Toast, Loader)
- [ ] **Phase F: Auth Flow & Onboarding** (Modern login screen, 3-step Owner registration wizard, role-based redirects)
- [ ] **Phase G: Marketplace Landing & Discovery** (High-impact Hero, category filters, location search, live bakery discovery)
- [ ] **Phase H: Customer Storefront & Product Showcase** (`/shop/[id]`, baker branding, catalog filter, product detail view with custom message & eggless toggle)
- [ ] **Phase I: In-Store Cart & Checkout** (Dedicated in-store cart drawer, single-store checkout modal, delivery slot selector, guest details)
- [ ] **Phase J: Order Tracking & Customer Invoices** (`/orders/[orderNumber]`, live status timeline, printable tax invoice view)
- [ ] **Phase G: Owner Dashboard Layout & Real-time Overview** (Owner sidebar, live KPIs: today's revenue, pending orders, urgent alerts)
- [ ] **Phase L: Owner Product Catalog & Inventory** (Product grid/table, quick stock toggle, add/edit product modal with multi-field validation)
- [ ] **Phase M: Owner Order Management & Live Pipeline** (Categorized order board, quick status update buttons, print slip, customer contact)
- [ ] **Phase N: Owner Delivery Slots & Operational Settings** (Slot creation, daily capacity, cut-off times, active/inactive toggles)
- [ ] **Phase O: Owner Coupons & Marketing Engine** (Coupon list, create percentage/flat discount codes, minimum order value, expiry)
- [ ] **Phase P: Owner Customer Directory, Enquiries & Feedback** (Customer list, lifetime value, customer enquiries table with status updates, review viewer)
- [ ] **Phase Q: Owner Analytics & Subscription Billing** (Sales trend charts, category breakdown, current subscription plan card, upgrade modal)
- [ ] **Phase R: Super Admin Panel** (System overview, bakery directory with active/suspend/reject controls, SaaS plan manager, broadcast message center)
- [ ] **Phase S: Cross-Verification, Parity Testing & Handoff** (Compile all routes, verify zero TypeScript errors, end-to-end integration test against port 8080)

---

## 8. Risk Matrix & Quality Gates

| Risk Item | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Port Conflict with Existing Frontend** | Low | Existing frontend runs on `3000`. `frontend_v2` will run on port `3001` during local verification. |
| **Accidental Overwrite of Working Code** | Critical | Strict isolation: `frontend/` and `backend/` are strictly read-only. All new code created exclusively inside `frontend_v2/`. |
| **Missing Verification Endpoints** | High | Resolved in `docs/AUTH_VERIFICATION_GAP.md`. Direct login/register flow without fake OTP theater. |
| **Broken Multi-Shop Cart State** | High | `CartContext` scoped strictly to `shopId`. Adding items from a different shop triggers a clear confirmation modal to start a new basket. |
| **TypeScript / API Mismatch** | Medium | All TypeScript interfaces directly mirror Spring Boot DTOs (`ProductResponse`, `ShopResponse`, `OrderResponse`, `RegisterRequest`). |

---

## 9. Conclusion & Action Required

Phase A (Read-Only Audit) is complete. All findings, schema constraints, API mappings, and the 19-phase master roadmap are documented. 

**Awaiting user approval to proceed with Phase B (Project Scaffolding & Setup).**
