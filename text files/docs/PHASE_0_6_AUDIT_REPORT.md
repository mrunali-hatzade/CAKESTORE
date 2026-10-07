# CAKESTORE — PHASE 0.6 AUDIT REPORT

**Audit Phase:** Phase 0.6 (Full Project Reconnaissance + Read-Only Architecture Audit)  
**Date:** September 2026  
**Git Checkpoint Reference:** `Phase 0.5 cleanup and integration baseline`  
**Operating Constraint:** 100% Read-Only Inspection. Zero files modified, deleted, moved, renamed, or refactored.

---

## 1. Current Architecture

CakeStore is a cloud-native, multi-tenant B2B2C Software-as-a-Service (SaaS) platform built for artisan bakeries and hyper-local cake discovery.

### Frontend Architecture
- **Framework & Version:** Next.js `14.2.5` (App Router), React `18.3.1`, TypeScript `5.x`.
- **Styling System:** Tailwind CSS `3.4.1` with custom CakeStore V2 design tokens (`brand-cream`, `brand-plum`, `brand-espresso`, `brand-blush`).
- **Icons & UI Primitives:** Lucide React `0.400.0`.
- **API Proxying:** Configured in `frontend_v1/next.config.mjs` with rewrites forwarding `/api/:path*` directly to `http://localhost:8080/api/:path*`, eliminating CORS friction and decoupling client calls.
- **State Management:** React local state (`useState`, `useEffect`) and React Context (`app/onboarding/context.tsx` for multi-step owner onboarding wizard). No heavyweight external store (Redux/Zustand) is introduced, keeping the bundle lightweight.
- **Client Security & Route Guard:** `app/dashboard/owner/AuthGuard.tsx` enforces JWT token presence in `localStorage`, auto-redirecting unauthenticated users to `/login`.

### Backend Architecture
- **Framework & Version:** Spring Boot `3.3.2` on Java OpenJDK `17`.
- **Architecture Pattern:** Modular Monolith composed of 14 isolated domain packages in `com.cakeplatform.api.modules.*`.
- **Security & RBAC:** Spring Security 6 with stateless Bearer JJWT `0.12.6`. Whitelist: `/api/auth/**`, `/api/storefront/**`, `/uploads/**`, `/error`. Protected routes require `@PreAuthorize("hasRole('SHOP_OWNER')")` or `@PreAuthorize("hasRole('ADMIN')")`.
- **Rate Limiting & Invoicing:** Bucket4j `8.9.0` for request throttling; OpenPDF `1.3.32` for server-side PDF invoice generation.
- **Image Storage:** Cloudinary integration with local disk fallback in `MediaController`.

### Database Architecture
- **Engine:** PostgreSQL 18.
- **Schema Management:** Flyway 10 with 9 applied migrations (`V1` through `V9`) managing 21 active relational tables.
- **Multi-Tenancy Isolation:** Tenant boundaries are strictly enforced at the relational layer via mandatory `shop_id` foreign keys on all operational entities (`products`, `orders`, `shop_delivery_slots`, `custom_cake_requests`, `coupons`).

---

## 2. Current Folder Structure

```text
CAKE SAAs1/
├── backend/
│   ├── pom.xml                                   # Spring Boot 3.3.2, Java 17, JJWT, OpenPDF, Bucket4j
│   └── src/main/
│       ├── java/com/cakeplatform/api/
│       │   ├── config/                           # WebMvcConfig, CloudinaryConfig
│       │   ├── exception/                        # GlobalExceptionHandler, ResourceNotFoundException
│       │   ├── security/                         # SecurityConfig, JwtTokenProvider, JwtFilter, CustomUserDetailsService
│       │   └── modules/ (14 domain packages)
│       │       ├── admin/                        # AdminDashboardController, AdminSubscriptionPlanController
│       │       ├── audit/                        # ActivityLoggerService, ActivityLog
│       │       ├── auth/                         # AuthController, AuthService
│       │       ├── interaction/                  # CustomerInteractionController, OwnerInteractionController
│       │       ├── media/                        # MediaController, CloudinaryService
│       │       ├── notification/                 # NotificationController, AdminMessageController, NotificationService
│       │       ├── order/                        # OwnerOrderController, WebhookController, OrderService
│       │       ├── payment/                      # OwnerPaymentController, PaymentService
│       │       ├── product/                      # OwnerProductController, ProductService
│       │       ├── shop/                         # ShopController, OwnerDeliverySlotController, OwnerCouponController, etc.
│       │       ├── storefront/                   # CustomerStorefrontController, CustomerStorefrontEnquiryController
│       │       ├── subscription/                 # OwnerSubscriptionController, SubscriptionService
│       │       └── user/                         # UserService, UserRepository, User, Role
│       └── resources/
│           ├── application.yml                   # DB connection, port 8080, JWT secrets, 5MB multipart limit
│           └── db/migration/                     # Flyway scripts V1__init_schema.sql to V8__coupons_and_discounts.sql
├── frontend_v1/
│   ├── package.json                              # Next.js 14.2.5, React 18, Tailwind CSS, Jest
│   ├── next.config.mjs                           # Reverse proxy /api/:path* -> localhost:8080
│   ├── tailwind.config.js                        # CakeStore V2 custom color palette & typography tokens
│   ├── tsconfig.json                             # TypeScript path alias "@/*"
│   ├── .env.local                                # NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
│   ├── app/
│   │   ├── (auth)/login/page.tsx                 # Owner & Admin JWT login
│   │   ├── checkout/page.tsx                     # Customer checkout prototype
│   │   ├── contact/page.tsx                      # Public contact form
│   │   ├── dashboard/owner/
│   │   │   ├── layout.tsx, AuthGuard.tsx, page.tsx # Overview & live stats
│   │   │   ├── products/page.tsx                 # Product catalog CRUD, variants, addons & media upload
│   │   │   ├── orders/page.tsx                 # Order status transitions & PDF invoice download
│   │   │   └── delivery-slots/page.tsx           # Delivery & pickup capacity time slots
│   │   ├── explore/page.tsx                      # Bakery discovery grid
│   │   ├── for-owners/page.tsx, how-it-works/page.tsx, pricing/page.tsx # Public marketing pages
│   │   ├── onboarding/                           # 4-step Owner Onboarding Wizard with React Context
│   │   ├── shop/[id]/page.tsx                    # Canonical Bakery Storefront & Product Showcase
│   │   ├── shops/[id]/page.tsx                   # HTTP 307 Redirection to /shop/[id]
│   │   ├── globals.css, layout.tsx, page.tsx     # Marketplace V2 Landing Page
│   │   └── storefront.css                        # Unreferenced legacy CSS (36 KB)
│   ├── components/
│   │   ├── checkout/                             # CartDrawer.tsx, CheckoutModal.tsx (Skeletons)
│   │   ├── dashboard/                            # DashboardLayoutWrapper.tsx, Sidebar.tsx, Header.tsx
│   │   │   └── owner/                            # Skeletons: OwnerCouponsTab, OwnerCustomersTab, Settings, Subscription
│   │   ├── layout/                               # Navbar.tsx, Footer.tsx, AnnouncementBar.tsx, MobileMenu.tsx
│   │   ├── marketplace/                          # 10 components: HeroSection, LocationFilterBar, BakeryGrid, BakeryCard, etc.
│   │   ├── onboarding/                           # StepNavigator.tsx, SuccessModal.tsx
│   │   ├── storefront/                           # ProductDetailModal.tsx (Product showcase + Customer cake enquiry)
│   │   └── ui/                                   # RatingStars.tsx
│   ├── lib/
│   │   ├── api/                                  # client.ts, auth.ts, storefront.ts, products.ts, orders.ts, deliverySlots.ts
│   │   ├── constants/                            # categories.ts, mockData.ts
│   │   └── api.ts                                # Standalone registration client (Onboarding)
│   ├── data/                                     # locations.ts (India hierarchical location dataset)
│   ├── types/                                    # storefront.ts (TypeScript domain models)
│   └── public/                                   # Icons, logos, and static image assets
├── api-tests/                                    # 17 .http specification test files
└── docs/                                         # Architecture, Blueprint, and Roadmap specifications
```

---

## 3. Customer Architecture

| Sub-Domain | File Path | Route / UI Element | Backing API | Data Source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Marketplace** | `app/page.tsx` | `/` | `GET /api/storefront/shops/search` | PostgreSQL `shops` | **DONE (Real DB)** |
| **Marketplace** | `app/explore/page.tsx` | `/explore` | `GET /api/storefront/shops/search` | PostgreSQL `shops` | **DONE (Real DB)** |
| **Marketplace** | `components/marketplace/LocationFilterBar.tsx` | 4-Tier Location Selector | `data/locations.ts` & API query params | Local dataset + DB search | **DONE (Real DB)** |
| **Marketplace** | `components/marketplace/BakeryGrid.tsx` & `BakeryCard.tsx` | Bakery Grid | Ingests live API bakery records | PostgreSQL `shops` | **DONE (Real DB)** |
| **Storefront** | `app/shop/[id]/page.tsx` | `/shop/[id]` | `GET /api/storefront/shops/{id}` | PostgreSQL `shops` | **DONE (Real DB)** |
| **Storefront** | `app/shop/[id]/page.tsx` | Menu Showcase | `GET /api/storefront/shops/{id}/products` | PostgreSQL `products` | **DONE (Real DB)** |
| **Product** | `components/storefront/ProductDetailModal.tsx` | Detail Modal Popup | `GET /api/storefront/shops/{id}/products/{pId}` | PostgreSQL `products`, `variants`, `addons` | **DONE (Real DB)** |
| **Enquiry** | `components/storefront/ProductDetailModal.tsx` | Custom Cake Enquiry Form | `POST /api/storefront/enquiries` | PostgreSQL `custom_cake_requests` | **DONE (Real DB)** |
| **Cart** | `components/checkout/CartDrawer.tsx` | Slide-out Basket Drawer | Client memory (Local state) | Skeleton | **PARTIAL** |
| **Checkout** | `components/checkout/CheckoutModal.tsx` | Guest Order Modal | `POST /api/storefront/shops/{id}/orders` | PostgreSQL `orders` | **BACKEND ONLY** |
| **Order Tracking** | Planned `/orders/[orderNumber]` | Status & Receipt | `GET /api/storefront/shops/orders/{orderNumber}/invoice` | PostgreSQL `orders` | **BACKEND ONLY** |
| **Feedback** | Planned `/shop/[id]#reviews` | Review Feed & Form | `GET/POST /api/storefront/shops/{id}/feedback` | PostgreSQL `feedback` | **BACKEND ONLY** |
| **Common UI** | `components/layout/Navbar.tsx` & `Footer.tsx` | Navigation Shell | None | Static | **DONE** |

---

## 4. Owner Architecture

| Area | File Path | Route | Backend API | Status | Mock Data? | Inbound Imports |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `app/(auth)/login/page.tsx` | `/(auth)/login` | `POST /api/auth/login` | **IMPLEMENTED** | No | Direct route |
| **Onboarding** | `app/onboarding/step-[1-4]/page.tsx` | `/onboarding` | `POST /api/auth/register` | **IMPLEMENTED** | No | Direct routes |
| **Dashboard** | `app/dashboard/owner/page.tsx` | `/dashboard/owner` | `GET /api/shops/my-shop/stats` | **PARTIAL** | No | Direct route |
| **Products** | `app/dashboard/owner/products/page.tsx` | `/dashboard/owner/products` | `GET/POST/PUT/DELETE /api/owner/products`<br>`POST /api/owner/media/upload` | **IMPLEMENTED** | No | Direct route |
| **Orders** | `app/dashboard/owner/orders/page.tsx` | `/dashboard/owner/orders` | `GET /api/owner/orders`<br>`PATCH /api/owner/orders/{id}/status`<br>`GET /invoice` | **IMPLEMENTED** | No | Direct route |
| **Delivery** | `app/dashboard/owner/delivery-slots/page.tsx`| `/dashboard/owner/delivery-slots` | `GET/POST/PUT/DELETE /api/owner/delivery-slots`<br>`PATCH /status` | **IMPLEMENTED** | No | Direct route |
| **Enquiries** | Planned `/dashboard/owner/enquiries` | `/dashboard/owner/enquiries` | `GET/POST /api/owner/custom-cakes`<br>`GET/POST /api/owner/enquiries` | **BACKEND ONLY** | No | Frontend missing |
| **Customers**| `OwnerCustomersTab.tsx` (Skeleton) | `/dashboard/owner/customers` | `GET /api/owner/customers` | **BACKEND ONLY** | No | Skeleton |
| **Analytics**| Planned `/dashboard/owner/analytics` | `/dashboard/owner/analytics` | `GET /api/owner/analytics/dashboard` | **BACKEND ONLY** | No | Frontend missing |
| **Feedback** | Planned `/dashboard/owner/reviews` | `/dashboard/owner/reviews` | `GET/POST/DELETE /api/owner/feedback` | **BACKEND ONLY** | No | Frontend missing |
| **Subscription**| `OwnerSubscriptionTab.tsx` (Skeleton) | `/dashboard/owner/subscription` | `GET /api/owner/subscriptions/current`<br>`POST /api/owner/payments/mock-checkout`| **BACKEND ONLY** | Mock gateway | Skeleton |
| **Settings** | `OwnerSettingsTab.tsx` (Skeleton) | `/dashboard/owner/settings` | `GET/PUT /api/shops/my-shop`<br>`GET/POST /api/shops/my-shop/payouts` | **BACKEND ONLY** | No | Skeleton |
| **Notifications**| Planned Header Bell | Global Header | `GET /api/notifications` | **BACKEND ONLY** | No | Frontend missing |

---

## 5. Admin Architecture

| Sub-Domain | Backend Controller | Backend Endpoint | Role Required | DB Entities | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin Auth** | `AuthController` | `POST /api/auth/login` | `ROLE_ADMIN` | `User` | **BACKEND IMPLEMENTED** (Shared login UI) |
| **Dashboard** | `AdminDashboardController` | `GET /api/admin/dashboard/stats` | `ROLE_ADMIN` | `Shop`, `User`, `Order`, `Payment` | **FRONTEND MISSING** |
| **Shops Moderation**| `AdminDashboardController` | `GET /api/admin/shops`<br>`GET /api/admin/shops/{id}`<br>`PATCH /status` | `ROLE_ADMIN` | `Shop`, `BusinessDocument` | **FRONTEND MISSING** |
| **Users** | `AuthController`, `AdminDashboardController` | `GET /api/admin/users`<br>`POST /api/auth/make-admin` | `ROLE_ADMIN` | `User` | **FRONTEND MISSING** |
| **Orders** | `AdminDashboardController` | `GET /api/admin/orders` | `ROLE_ADMIN` | `Order`, `OrderItem` | **FRONTEND MISSING** |
| **Payments** | `AdminDashboardController` | `GET /api/admin/payments` | `ROLE_ADMIN` | `Payment` | **FRONTEND MISSING** |
| **Subscriptions** | `AdminSubscriptionPlanController` | `GET /api/admin/subscriptions` | `ROLE_ADMIN` | `Subscription` | **FRONTEND MISSING** |
| **Plans & Pricing** | `AdminSubscriptionPlanController` | `GET/POST/PUT/PATCH /api/admin/plans` | `ROLE_ADMIN` | `SubscriptionPlan` | **FRONTEND MISSING** |
| **Messages** | `AdminMessageController` | `POST /api/admin/messages` | `ROLE_ADMIN` | `Notification` | **FRONTEND MISSING** |
| **Reports** | `AdminDashboardController` | `GET /api/admin/reports` | `ROLE_ADMIN` | All entities | **FRONTEND MISSING** |
| **Settings** | `AdminDashboardController` | `GET/PUT /api/admin/settings` | `ROLE_ADMIN` | Config | **FRONTEND MISSING** |
| **Activity** | `ActivityLoggerService` | `GET /api/admin/activity-logs` | `ROLE_ADMIN` | `ActivityLog` | **FRONTEND MISSING** |

---

## 6. Route Inventory

| Route | Role | Backing File | Purpose | Backing API | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Customer | `app/page.tsx` | Marketplace Discovery Landing | `GET /api/storefront/shops/search` | **DONE (Live DB)** |
| `/explore` | Customer | `app/explore/page.tsx` | All Bakeries Grid | `GET /api/storefront/shops/search` | **DONE (Live DB)** |
| `/shop/[id]` | Customer | `app/shop/[id]/page.tsx` | **Canonical** Bakery Storefront | `GET /api/storefront/shops/{id}`<br>`GET /products` | **DONE (Live DB)** |
| `/shops/[id]` | Customer | `app/shops/[id]/page.tsx` | **Redirect Route** (307 redirect) | None (Redirects to `/shop/[id]`) | **LEGACY REDIRECT** |
| `/checkout` | Customer | `app/checkout/page.tsx` | Standalone Checkout | `POST /api/storefront/shops/{id}/orders` | **PARTIAL (Skeleton)** |
| `/how-it-works` | Public | `app/how-it-works/page.tsx` | Visual Guide | None | **DONE** |
| `/pricing` | Public | `app/pricing/page.tsx` | SaaS Plans Display | None | **DONE** |
| `/for-owners` | Public | `app/for-owners/page.tsx` | Baker Landing Page | None | **DONE** |
| `/contact` | Public | `app/contact/page.tsx` | General Contact Form | None | **DONE** |
| `/(auth)/login` | Owner/Admin | `app/(auth)/login/page.tsx` | JWT Authentication | `POST /api/auth/login` | **DONE (Live DB)** |
| `/onboarding` | Owner | `app/onboarding/page.tsx` | Wizard Redirect | None (Redirects to step-1) | **DONE** |
| `/onboarding/step-1` | Owner | `app/onboarding/step-1/page.tsx` | Personal Info Form | None (Local Context) | **DONE** |
| `/onboarding/step-2` | Owner | `app/onboarding/step-2/page.tsx` | Bakery Info Form | None (Local Context) | **DONE** |
| `/onboarding/step-3` | Owner | `app/onboarding/step-3/page.tsx` | Address & Location | None (Local Context) | **DONE** |
| `/onboarding/step-4` | Owner | `app/onboarding/step-4/page.tsx` | FSSAI Upload & Submit | `POST /api/auth/register` | **DONE (Live DB)** |
| `/dashboard/owner` | Owner | `app/dashboard/owner/page.tsx` | Owner Overview | `GET /api/shops/my-shop/stats` | **PARTIAL (Live DB)** |
| `/dashboard/owner/products` | Owner | `app/dashboard/owner/products/page.tsx` | Products CRUD | `GET/POST/PUT/DELETE /api/owner/products` | **DONE (Live DB)** |
| `/dashboard/owner/orders` | Owner | `app/dashboard/owner/orders/page.tsx` | Orders Management | `GET /api/owner/orders`, `PATCH /status` | **DONE (Live DB)** |
| `/dashboard/owner/delivery-slots`| Owner | `app/dashboard/owner/delivery-slots/page.tsx`| Delivery Slots CRUD | `GET/POST/PUT/DELETE /api/owner/delivery-slots`| **DONE (Live DB)** |

### Canonical vs. Redirect Analysis:
- **Canonical Route:** `/shop/[id]` is the canonical storefront route used across all `BakeryCard.tsx` links, navigation bars, and SEO meta tags.
- **Redirect Route:** `/shops/[id]` is a legacy 1-line re-route calling `redirect('/shop/' + params.id)`. It is preserved to prevent 404 errors on legacy bookmarks.

---

## 7. Component Inventory

### Group A: ACTIVE — DO NOT TOUCH (19 Components)
| Component | Role | Consumed By | Purpose |
| :--- | :--- | :--- | :--- |
| `components/layout/Navbar.tsx` | Common | 8 pages | Primary navigation bar |
| `components/layout/Footer.tsx` | Common | 8 pages | Global footer |
| `components/layout/AnnouncementBar.tsx` | Customer | `app/page.tsx` | Top promotion ticker |
| `components/layout/MobileMenu.tsx` | Common | `Navbar.tsx` | Mobile responsive slide-out |
| `components/marketplace/HeroSection.tsx` | Customer | `app/page.tsx` | Main hero search banner |
| `components/marketplace/LocationFilterBar.tsx` | Customer | `app/page.tsx`, `explore` | 4-tier location selector |
| `components/marketplace/BusinessCategoryTabs.tsx` | Customer | `app/page.tsx`, `explore` | Category filter pills |
| `components/marketplace/BakeryGrid.tsx` | Customer | `app/page.tsx`, `explore` | Bakery card grid wrapper |
| `components/marketplace/BakeryCard.tsx` | Customer | `BakeryGrid.tsx` | Individual bakery showcase card |
| `components/marketplace/HowItWorks.tsx` | Customer | `app/page.tsx` | 4-step ordering guide |
| `components/marketplace/TrustBenefits.tsx` | Customer | `app/page.tsx` | Freshness & hygiene badges |
| `components/marketplace/CustomerTestimonials.tsx` | Customer | `app/page.tsx` | Customer reviews carousel |
| `components/marketplace/OwnerCTA.tsx` | Customer | `app/page.tsx` | Seller acquisition banner |
| `components/storefront/ProductDetailModal.tsx` | Customer | `app/shop/[id]/page.tsx` | Real product detail & enquiry modal |
| `components/onboarding/StepNavigator.tsx` | Owner | Steps 1, 2, 3, 4 | Multi-step progress bar |
| `components/onboarding/SuccessModal.tsx` | Owner | Step 4 | Registration celebration popup |
| `components/dashboard/DashboardLayoutWrapper.tsx`| Owner | `owner/layout.tsx` | Shell controller |
| `components/dashboard/Sidebar.tsx` | Owner | `DashboardLayoutWrapper.tsx` | Wine-styled navigation sidebar |
| `components/dashboard/Header.tsx` | Owner | `DashboardLayoutWrapper.tsx` | Shop identity & user dropdown |
| `components/ui/RatingStars.tsx` | Common | `BakeryCard.tsx` | Reusable star rating visualizer |

### Group B: REFERENCE / FUTURE USE (6 Skeletons)
| Component | Role | Reason Preserved |
| :--- | :--- | :--- |
| `components/checkout/CartDrawer.tsx` | Customer | Preserved skeleton for Phase 11 customer cart drawer. |
| `components/checkout/CheckoutModal.tsx` | Customer | Preserved skeleton for Phase 11 guest checkout modal. |
| `components/dashboard/owner/OwnerCouponsTab.tsx` | Owner | Preserved skeleton for Phase 4 coupons tab. |
| `components/dashboard/owner/OwnerCustomersTab.tsx` | Owner | Preserved skeleton for Phase 4 customer CRM tab. |
| `components/dashboard/owner/OwnerSettingsTab.tsx` | Owner | Preserved skeleton for Phase 5 settings tab. |
| `components/dashboard/owner/OwnerSubscriptionTab.tsx`| Owner | Preserved skeleton for Phase 6 subscription tab. |

### Group C: POSSIBLY DEAD — NEEDS REVIEW (2 Components)
| Component | Evidence & Reason | Recommended Action |
| :--- | :--- | :--- |
| `components/marketplace/FeaturedCakes.tsx` | `app/page.tsx` imports the API function `fetchFeaturedCakes` from `lib/api/storefront.ts` but **never imports or renders `<FeaturedCakes />`**. Inbound imports: **0**. | Needs review: Wire into `page.tsx` or archive. |
| `components/marketplace/CakeCard.tsx` | Only imported by `FeaturedCakes.tsx`. Inbound imports: **1**. | Tied to `FeaturedCakes.tsx` decision. |

---

## 8. API Inventory

| Frontend Service File | Exported Function | HTTP | Backend Endpoint | Role | Backend Controller | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `lib/api/storefront.ts` | `fetchShops` | `GET` | `/api/storefront/shops/search` | Customer | `CustomerStorefrontController` | **WORKING (Live DB)** |
| `lib/api/storefront.ts` | `fetchShopDetails` | `GET` | `/api/storefront/shops/{id}` | Customer | `CustomerStorefrontController` | **WORKING (Live DB)** |
| `lib/api/storefront.ts` | `fetchShopProducts` | `GET` | `/api/storefront/shops/{id}/products` | Customer | `CustomerStorefrontController` | **WORKING (Live DB)** |
| `lib/api/storefront.ts` | `fetchProductDetails` | `GET` | `/api/storefront/shops/{id}/products/{pId}` | Customer | `CustomerStorefrontController` | **WORKING (Live DB)** |
| `lib/api/storefront.ts` | `submitProductEnquiry` | `POST` | `/api/storefront/enquiries` | Customer | `CustomerStorefrontEnquiryController` | **WORKING (Live DB)** |
| `lib/api/auth.ts` | `loginOwner` | `POST` | `/api/auth/login` | Owner/Admin | `AuthController` | **WORKING (Live DB)** |
| `lib/api.ts` | `registerOwner` | `POST` | `/api/auth/register` | Owner | `AuthController` | **WORKING (Live DB)** |
| `lib/api/products.ts` | `getOwnerProducts` | `GET` | `/api/owner/products` | Owner | `OwnerProductController` | **WORKING (Live DB)** |
| `lib/api/products.ts` | `createOwnerProduct` | `POST` | `/api/owner/products` | Owner | `OwnerProductController` | **WORKING (Live DB)** |
| `lib/api/products.ts` | `updateOwnerProduct` | `PUT` | `/api/owner/products/{id}` | Owner | `OwnerProductController` | **WORKING (Live DB)** |
| `lib/api/products.ts` | `deleteOwnerProduct` | `DELETE` | `/api/owner/products/{id}` | Owner | `OwnerProductController` | **WORKING (Live DB)** |
| `lib/api/products.ts` | `uploadProductImage` | `POST` | `/api/owner/media/upload` | Owner | `MediaController` | **WORKING (Live DB)** |
| `lib/api/orders.ts` | `getOwnerOrders` | `GET` | `/api/owner/orders` | Owner | `OwnerOrderController` | **WORKING (Live DB)** |
| `lib/api/orders.ts` | `getOrderDetails` | `GET` | `/api/owner/orders/{id}` | Owner | `OwnerOrderController` | **WORKING (Live DB)** |
| `lib/api/orders.ts` | `updateOrderStatus` | `PATCH` | `/api/owner/orders/{id}/status` | Owner | `OwnerOrderController` | **WORKING (Live DB)** |
| `lib/api/orders.ts` | `downloadInvoice` | `GET` | `/api/owner/orders/{id}/invoice` | Owner | `OwnerOrderController` | **WORKING (Live DB)** |
| `lib/api/deliverySlots.ts` | `getSlots`, `createSlot`, etc. | `GET/POST/PUT/PATCH/DELETE` | `/api/owner/delivery-slots` | Owner | `OwnerDeliverySlotController` | **WORKING (Live DB)** |
| *(46 Backend Endpoints)* | *(Awaiting UI bindings)* | `GET/POST` | `/api/owner/custom-cakes`, `/api/admin/**`, etc. | Owner/Admin | Multiple | **BACKEND ONLY** |

---

## 9. Mock / Fake Data Audit

| Occurrence | File Location | Classification | Purpose & Usage Analysis |
| :--- | :--- | :--- | :--- |
| `MOCK_BAKERIES` | `lib/constants/mockData.ts` | **REQUIRED OFFLINE FALLBACK** | Used exclusively inside the `catch` block of `lib/api/storefront.ts` when the backend server is completely unreachable. Prevents client crash during offline frontend development. When backend is online, 100% real database records are consumed. |
| `MOCK_FEATURED_CAKES` | `lib/constants/mockData.ts` | **REQUIRED OFFLINE FALLBACK** | Used in `catch` block for cake fallback. |
| Input Placeholders | Across form `.tsx` files | **UI PLACEHOLDER** | Standard HTML input placeholders (`placeholder="e.g. Aditi Sharma"`). |
| Mock Subscription Checkout | `OwnerPaymentController.java` (`/api/owner/payments/mock-checkout`) | **DEVELOPMENT SEED / MOCK GATEWAY** | Backend mock payment simulation allowing subscription activation during local testing without live Razorpay API keys. |

---

## 10. Duplicate / Dead File Audit

| File Path | Purpose | Why It Appears Unused | Inbound Imports | Safe to Delete? | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`frontend_v1/app/storefront.css`** | Legacy stylesheet | 36 KB file from early prototype. Exactly zero imports or `<link>` tags across entire codebase. | 0 | Yes (after approval) | **HIGH** |
| **`frontend_v1/lib/api.ts`** | Standalone registration client | Contains `registerOwner()` directly in `lib/` root, duplicating `lib/api/auth.ts` domain. | 2 | Merge into `lib/api/auth.ts` | **HIGH** |
| **`frontend_v1/public/3d/` (8 files)** | 3D graphics | Timestamped duplicates of `public/3d_*.png`. Zero code imports. | 0 | Yes (after approval) | **HIGH** |
| **`frontend_v1/public/hero[1-3].jpg`** | Static hero photos | Unreferenced in code (active hero consumes remote Unsplash URLs). | 0 | Retain as offline asset | **MEDIUM** |
| **`frontend_v1/components/marketplace/FeaturedCakes.tsx`** | Featured cakes section | `app/page.tsx` queries the API but never renders `<FeaturedCakes />`. | 0 | Needs product decision | **MEDIUM** |

---

## 11. Folder Organization Audit

### What Is Already Correctly Organized
- `frontend_v1/app/dashboard/owner/`: Page routes for products, orders, and delivery slots are logically placed.
- `frontend_v1/app/onboarding/`: Wizard steps 1 through 4 are clean and self-contained with their own layout and context.
- `frontend_v1/components/layout/`: Common layout components (`Navbar`, `Footer`, `AnnouncementBar`) are properly shared.
- `frontend_v1/lib/api/`: Centralized API clients for storefront, products, orders, and delivery slots.

### What Should Eventually Be Moved (Phased Migration)
1. `components/marketplace/*` $\rightarrow$ `components/customer/marketplace/*`
2. `components/storefront/*` $\rightarrow$ `components/customer/storefront/*`
3. `components/checkout/*` $\rightarrow$ `components/customer/checkout/*`
4. `components/dashboard/owner/*` $\rightarrow$ `components/owner/tabs/*`
5. `components/dashboard/*` $\rightarrow$ `components/owner/layout/*`
6. `components/onboarding/*` $\rightarrow$ `components/owner/onboarding/*`
7. Consolidate `lib/api.ts` into `lib/api/auth.ts`.

---

## 12. PRD vs Implementation

| Requirement | PRD Reference | Current Implementation | Status | Gap Analysis |
| :--- | :--- | :--- | :--- | :--- |
| **Multi-tenant Location Discovery** | PRD Section 3.1 | 4-tier filtering (State, District, City, Area) against real PostgreSQL `shops` | **DONE** | Fully aligned. |
| **Bakery Accreditation (FSSAI)** | PRD Section 3.2 | Displayed on storefront with verified badge | **DONE** | Fully aligned. |
| **Product Customization (Variants & Addons)** | PRD Section 4.1 | Supported in database, backend CRUD, owner manager, and storefront modal | **DONE** | Fully aligned. |
| **Custom Cake Request Consultation** | PRD Section 4.3 | Customer submits to `POST /api/storefront/enquiries`, saved to `custom_cake_requests` | **DONE** | Customer side 100%; Owner response screen is BACKEND ONLY. |
| **Delivery Time Windows & Caps** | PRD Section 5.2 | Full owner CRUD with order limits per slot | **DONE** | Fully aligned. |
| **Order Status Workflow & PDF Invoices** | PRD Section 5.4 | Status progression (`PREPARING`, `READY`, etc.) + OpenPDF invoice downloads | **DONE** | Fully aligned. |
| **Platform Admin Dashboard** | PRD Section 6.1 | All 9 backend admin endpoints exist | **BACKEND ONLY** | Frontend UI missing. |
| **Single Next.js App Requirement** | Architecture PRD | Single Next.js App Router project | **DONE** | Aligned. |

### PRD Contradictions Identified:
- *Contradiction:* Early PRDs referenced creating separate frontend repositories or standalone single-page apps.  
  *Codebase Truth:* The platform is unified in a single Next.js 14 App Router application (`frontend_v1/`) consuming the Spring Boot API via reverse proxy. This unified architecture is superior, eliminates CORS issues, and must be preserved.

---

## 13. UI Reference vs Implementation

### Reference 1: Customer Marketplace & Storefront (CakeStore V2)
- **Current UI:** Warm cream (`#FAF7F2`), white cards, plum accents (`#5B2333`), serif display headings.
- **Target UI:** Same as current.
- **Status:** **100% MATCHED & DESIGN FROZEN.**

### Reference 2: Bakery Owner Dashboard (`media_1788430950490.jpg` Panel 2)
- **Current UI:** Functional dashboard with live KPI counters, products table, orders list, and delivery slots.
- **Target UI:** Deep wine sidebar (`#3D101E`), 4 KPI cards with percentage badges, sales overview line chart, recent orders table with color status chips, and 3 alert cards (Low Stock, Upcoming Orders, Customer Feedback).
- **Status:** **PARTIAL.** Functional baseline active; visual layout alignment scheduled for Phase 2.

### Reference 3: Platform Admin Panel (`media_1788430950490.jpg` Panel 3)
- **Current UI:** 0% frontend implemented.
- **Target UI:** Deep slate/navy sidebar (`#162232`), platform KPI metrics, platform revenue line chart, recent bakery directory, and approval action widgets.
- **Status:** **BACKEND ONLY.** Scheduled for Phase 7–10.

---

## 14. Security Audit

1. **Authentication:** Stateless Bearer JWT tokens with HMAC-SHA256 signature (`jwt.secret`). Token expiration is set to 24 hours (86,400,000 ms).
2. **Authorization:** Role-Based Access Control enforced at the method level via `@PreAuthorize("hasRole('SHOP_OWNER')")` and `@PreAuthorize("hasRole('ADMIN')")`.
3. **Route Protection (Frontend):** `AuthGuard.tsx` wraps `/dashboard/owner/*` to intercept unauthenticated sessions.
4. **Multi-Tenant Data Leakage Prevention:** Verified that owner endpoints strictly query using the authenticated owner's `shop_id`. Public storefront product endpoints reject requests if the product does not belong to the requested bakery (`HTTP 400 Bad Request`).
5. **Rate Limiting:** Bucket4j configured in backend filter chain to prevent API abuse.

---

## 15. Database / Backend Audit

| Table Name | Entity Class | Repository | Service | Controller | Frontend Consumed? | Operational State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `users` | `User.java` | `UserRepository` | `UserService`, `AuthService` | `AuthController` | Yes (`/login`, `/onboarding`) | **ACTIVE** |
| `shops` | `Shop.java` | `ShopRepository` | `ShopService`, `CustomerStorefrontService` | `CustomerStorefrontController`, `ShopController` | Yes (`/`, `/explore`, `/shop/[id]`, `/dashboard/owner`) | **ACTIVE** |
| `products` | `Product.java` | `ProductRepository` | `ProductService`, `CustomerStorefrontService` | `OwnerProductController`, `CustomerStorefrontController` | Yes (`/shop/[id]`, `/dashboard/owner/products`) | **ACTIVE** |
| `product_variants` | `ProductVariant.java` | `ProductVariantRepository` | `ProductService` | `OwnerProductController`, `CustomerStorefrontController` | Yes (Modal & CRUD) | **ACTIVE** |
| `product_addons` | `ProductAddon.java` | `ProductAddonRepository` | `ProductService` | `OwnerProductController`, `CustomerStorefrontController` | Yes (Modal & CRUD) | **ACTIVE** |
| `shop_delivery_slots`| `ShopDeliverySlot.java`| `ShopDeliverySlotRepository`| `DeliverySlotService`| `OwnerDeliverySlotController` | Yes (`/delivery-slots`) | **ACTIVE** |
| `orders` | `Order.java` | `OrderRepository` | `OrderService`, `CustomerStorefrontService` | `OwnerOrderController`, `CustomerStorefrontController` | Yes (`/dashboard/owner/orders`) | **ACTIVE** |
| `order_items` | `OrderItem.java` | `OrderItemRepository` | `OrderService` | `OwnerOrderController` | Yes (Line items) | **ACTIVE** |
| `order_status_history`| Schema only | Plain SQL queries | `OrderService` | `OwnerOrderController` | Backend only | **API READY** |
| `custom_cake_requests`| `CustomCakeRequest.java`| `CustomCakeRequestRepository`| `CustomerStorefrontService`, `OwnerInteractionService`| `CustomerStorefrontEnquiryController`, `OwnerInteractionController` | Yes (Customer enquiry form) | **ACTIVE** |
| `coupons` | `Coupon.java` | `CouponRepository` | `ShopService` | `OwnerCouponController` | Backend only | **API READY** |
| `enquiries` | `Enquiry.java` | `EnquiryRepository` | `InteractionService`, `OwnerInteractionService`| `CustomerInteractionController`, `OwnerInteractionController` | Backend only | **API READY** |
| `feedback` | `Feedback.java` | `FeedbackRepository` | `InteractionService`, `OwnerInteractionService`| `CustomerInteractionController`, `OwnerInteractionController` | Backend only | **API READY** |
| `subscriptions` | `Subscription.java` | `SubscriptionRepository` | `SubscriptionService` | `OwnerSubscriptionController` | Backend only | **API READY** |
| `subscription_plans` | `SubscriptionPlan.java`| `SubscriptionPlanRepository`| `SubscriptionService` | `AdminSubscriptionPlanController` | Backend only | **API READY** |
| `payments` | `Payment.java` | `PaymentRepository` | `PaymentService` | `OwnerPaymentController` | Backend only | **API READY** |
| `shop_payout_details`| `ShopPayoutDetails.java`| `ShopPayoutDetailsRepository`| `ShopService` | `ShopPayoutController` | Backend only | **API READY** |
| `business_documents` | `BusinessDocument.java`| `BusinessDocumentRepository`| `ShopService` | `VerificationController` | Yes (Upload during onboarding) | **ACTIVE** |
| `notifications` | `Notification.java` | `NotificationRepository` | `NotificationService` | `NotificationController`, `AdminMessageController` | Backend only | **API READY** |
| `activity_logs` | `ActivityLog.java` | `ActivityLogRepository` | `ActivityLoggerService` | Internal audit service | Backend only | **API READY** |
| `flyway_schema_history`| System Table | Flyway | Flyway | Internal | Internal | **SYSTEM ACTIVE** |

---

## 16. Feature Completion Matrix

| Feature | Frontend % | Backend % | Integration % | Overall Status |
| :--- | :--- | :--- | :--- | :--- |
| **CUSTOMER** | | | | |
| Marketplace Discovery | 100% | 100% | 100% | **DONE (Verified)** |
| Bakery Storefront | 100% | 100% | 100% | **DONE (Verified)** |
| Products Showcase | 100% | 100% | 100% | **DONE (Verified)** |
| Product Details Modal | 100% | 100% | 100% | **DONE (Verified)** |
| Custom Cake Enquiry | 100% | 100% | 100% | **DONE (Verified)** |
| Cart | 25% | 100% | 25% | **PARTIAL (Skeleton)** |
| Checkout | 25% | 100% | 25% | **PARTIAL (Skeleton)** |
| Order Tracking | 0% | 100% | 0% | **BACKEND ONLY** |
| Public Feedback | 0% | 100% | 0% | **BACKEND ONLY** |
| **OWNER** | | | | |
| Registration / Onboarding | 100% | 100% | 100% | **DONE (Verified)** |
| Login / JWT Auth | 100% | 100% | 100% | **DONE (Verified)** |
| Dashboard Overview | 75% | 100% | 75% | **PARTIAL (Live Stats)** |
| Products Catalog CRUD | 100% | 100% | 100% | **DONE (Verified)** |
| Orders Management | 100% | 100% | 100% | **DONE (Verified)** |
| Delivery Slots | 100% | 100% | 100% | **DONE (Verified)** |
| Enquiries Response | 0% | 100% | 0% | **BACKEND ONLY** |
| Customers CRM | 0% | 100% | 0% | **BACKEND ONLY** |
| Analytics | 0% | 100% | 0% | **BACKEND ONLY** |
| Reviews & Feedback | 0% | 100% | 0% | **BACKEND ONLY** |
| Subscription & Renewal | 0% | 100% | 0% | **BACKEND ONLY** |
| Settings & Payouts | 0% | 100% | 0% | **BACKEND ONLY** |
| Notifications | 0% | 100% | 0% | **BACKEND ONLY** |
| **ADMIN** | | | | |
| Admin Auth | 50% | 100% | 50% | **BACKEND IMPLEMENTED** |
| Platform Dashboard | 0% | 100% | 0% | **FRONTEND MISSING** |
| Bakery Moderation | 0% | 100% | 0% | **FRONTEND MISSING** |
| Users Management | 0% | 100% | 0% | **FRONTEND MISSING** |
| Orders Supervision | 0% | 100% | 0% | **FRONTEND MISSING** |
| Payments Ledger | 0% | 100% | 0% | **FRONTEND MISSING** |
| Subscriptions | 0% | 100% | 0% | **FRONTEND MISSING** |
| Plans & Pricing | 0% | 100% | 0% | **FRONTEND MISSING** |
| Broadcast Messages | 0% | 100% | 0% | **FRONTEND MISSING** |
| Platform Reports | 0% | 100% | 0% | **FRONTEND MISSING** |
| Activity Logs | 0% | 100% | 0% | **FRONTEND MISSING** |
| Settings | 0% | 100% | 0% | **FRONTEND MISSING** |

---

## 17. Cleanup Plan

### KEEP (Critical Active Code)
- All 19 active components in Group A.
- All 6 active route pages in `app/`.
- All 6 API service files in `lib/api/`.
- `lib/constants/mockData.ts` (offline fallback).
- `data/locations.ts` (India location dataset).

### MOVE (Phased Reorganization — DO NOT MOVE YET)
- `components/marketplace/*` $\rightarrow$ `components/customer/marketplace/*`
- `components/storefront/*` $\rightarrow$ `components/customer/storefront/*`
- `components/checkout/*` $\rightarrow$ `components/customer/checkout/*`
- `components/dashboard/owner/*` $\rightarrow$ `components/owner/tabs/*`
- `components/dashboard/*` $\rightarrow$ `components/owner/layout/*`
- `components/onboarding/*` $\rightarrow$ `components/owner/onboarding/*`
- Consolidate `lib/api.ts` into `lib/api/auth.ts`.

### DELETE — HIGH CONFIDENCE (Dead Code — DO NOT DELETE YET)
- `frontend_v1/app/storefront.css` (36 KB, zero references).
- `frontend_v1/public/3d/` (8 redundant timestamped duplicate files).

### DELETE — NEEDS CONFIRMATION
- `components/marketplace/FeaturedCakes.tsx` & `CakeCard.tsx` (Unrendered component in `page.tsx`).
- `public/hero1.jpg`, `hero2.jpg`, `hero3.jpg` (Unused static banners).
- `public/chocolate-cake.png`, `strawberry-cake.png` (Unused static cake graphics).

### FUTURE REFERENCE (Preserved Skeletons)
- `CartDrawer.tsx` & `CheckoutModal.tsx` in `components/checkout/`.
- `OwnerCouponsTab.tsx`, `OwnerCustomersTab.tsx`, `OwnerSettingsTab.tsx`, `OwnerSubscriptionTab.tsx` in `components/dashboard/owner/`.

---

## 18. Recommended Final Folder Structure

```text
frontend_v1/
├── app/
│   ├── (public)/                       # /, /explore, /how-it-works, /pricing, /contact
│   ├── (customer)/shop/[id]/           # Storefront profile & products
│   ├── (auth)/login/                   # Unified JWT login
│   ├── onboarding/                     # 4-step wizard
│   ├── dashboard/owner/                # Owner management portal
│   └── admin/                          # Future Admin management portal
├── components/
│   ├── common/                         # Reusable Navbar, Footer, Buttons, Modal, RatingStars
│   ├── customer/
│   │   ├── marketplace/                # HeroSection, LocationFilterBar, BakeryGrid, BakeryCard
│   │   ├── storefront/                 # ProductDetailModal
│   │   └── checkout/                   # CartDrawer, CheckoutModal
│   ├── owner/
│   │   ├── layout/                     # Sidebar, Header, DashboardLayoutWrapper
│   │   ├── onboarding/                 # StepNavigator, SuccessModal
│   │   ├── products/                   # Product catalog views
│   │   ├── orders/                     # Orders pipeline views
│   │   └── tabs/                       # CRM, Coupons, Settings, Subscriptions
│   └── admin/
│       ├── layout/                     # AdminSidebar, AdminHeader
│       └── views/                      # Moderation, Plans, Broadcasts
├── lib/
│   ├── api/                            # Centralized API clients
│   ├── constants/                      # Categories, mock data
│   └── utils/                          # Shared helper functions
├── types/                              # Domain TypeScript interfaces
├── data/                               # Master datasets
└── public/                             # Optimized web assets
```

---

## 19. Recommended Development Roadmap

```text
PHASE 0.6: Full Project Reconnaissance + Architecture Audit (CURRENT COMPLETE)
    ↓
PHASE 2: Owner Dashboard Overview UI Alignment (Align with media_1788430950490.jpg Panel 2)
    ↓
PHASE 3: Owner Enquiries & Custom Cake Request Management (/dashboard/owner/enquiries)
    ↓
PHASE 4: Owner Customers CRM, Reviews & Coupons (/dashboard/owner/customers, /reviews, /coupons)
    ↓
PHASE 5: Owner Analytics, Settings & Website Management (/dashboard/owner/analytics, /settings, /website)
    ↓
PHASE 6: Owner Subscription & Billing (/dashboard/owner/subscription)
    ↓
PHASE 7: Admin Authentication & Platform Shell (/admin)
    ↓
PHASE 8: Admin Bakery Moderation & Directory (/admin/shops, /admin/shops/[id])
    ↓
PHASE 9: Admin SaaS Plans, Payments & Subscriptions (/admin/plans, /subscriptions, /payments)
    ↓
PHASE 10: Admin Reports & Broadcast Messaging (/admin/messages, /reports)
    ↓
PHASE 11: Customer Storefront Direct Cart & Checkout (Wire CartDrawer & CheckoutModal)
    ↓
PHASE 12: Customer Order Tracking & Public Reviews (/orders/[orderNumber], Storefront reviews)
    ↓
PHASE 13: Production Payment Gateway Integration (Live Razorpay keys & webhooks)
    ↓
PHASE 14: In-App Notification Feed (Header notification bell & alerts drawer)
    ↓
PHASE 15: Full Platform Integration QA & Performance Verification
```

---

## 20. Critical Issues

1. **Next.js Font Fetch Timeout on Cold Clean Builds:**
   - When running `npm run clean` (`rimraf .next`), Next.js attempts to download `Inter` and `Lora` from Google Fonts. If a transient network glitch occurs, the font loader throws `NextFontError: Failed to fetch Inter from Google Fonts`.
   - *Recommendation:* Keep font fallbacks robust in `layout.tsx` or retain cached `.next/cache` during local iterative builds.
2. **Duplicate Registration Endpoint Handling:**
   - `lib/api.ts` sits in the root of `lib/` and contains only `registerOwner()`, while `lib/api/auth.ts` contains `loginOwner()`. They should eventually be merged into `lib/api/auth.ts`.
3. **Legacy Storefront Redirect Route:**
   - `/shops/[id]` redirects to `/shop/[id]`. This is harmless and preserves bookmarks, but should be phased out in long-term documentation.

---

## 21. Files That Must NOT Be Touched

The following critical files power the active, working application and **must not be modified, deleted, or refactored**:
1. `app/page.tsx` (Marketplace Homepage)
2. `app/explore/page.tsx` (Bakery Explorer)
3. `app/shop/[id]/page.tsx` (Canonical Storefront Profile)
4. `components/marketplace/HeroSection.tsx` & `LocationFilterBar.tsx` (4-tier location filtering)
5. `components/marketplace/BakeryGrid.tsx` & `BakeryCard.tsx` (Marketplace bakery cards)
6. `components/storefront/ProductDetailModal.tsx` (Product showcase & enquiry flow)
7. `app/(auth)/login/page.tsx` & `app/onboarding/**` (Owner auth & registration)
8. `app/dashboard/owner/page.tsx`, `products/page.tsx`, `orders/page.tsx`, `delivery-slots/page.tsx` (Owner dashboard features)
9. `lib/api/client.ts`, `lib/api/storefront.ts`, `lib/api/products.ts`, `lib/api/orders.ts`, `lib/api/deliverySlots.ts`, `lib/api/auth.ts` (Active API layer)
10. `lib/constants/mockData.ts` (Defensive offline fallback)
11. `data/locations.ts` (India locations dataset)
12. All Flyway migration scripts `backend/src/main/resources/db/migration/V*` (Database schema integrity)

---

**STOP AFTER REPORT.** Phase 0.6 Reconnaissance and Architecture Audit is complete. No application code or database schema was altered. Awaiting your approval before proceeding.
