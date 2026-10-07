# CakeStore SaaS Platform — Read-Only Architecture & Folder Audit

**Document Version:** 1.0 (Phase 1 Baseline Audit)  
**Date:** September 2026  
**Git Checkpoint Reference:** `Phase 0.5 cleanup and integration baseline`  
**Audit Scope:** Read-only inspection of frontend (`app/`, `components/`, `lib/`, `types/`, `public/`), backend domain modules, and API services. Zero application files modified.

---

## 1. Current Folder Structure

```text
frontend_v1/
├── app/
│   ├── (auth)/login/page.tsx               # Owner & Admin JWT authentication page
│   ├── checkout/page.tsx                   # Customer standalone checkout prototype
│   ├── contact/page.tsx                    # Public contact form
│   ├── dashboard/owner/
│   │   ├── AuthGuard.tsx                   # Client auth check & redirection guard
│   │   ├── layout.tsx                      # Owner dashboard shell layout
│   │   ├── page.tsx                        # Owner overview & live metrics
│   │   ├── delivery-slots/page.tsx         # Pickup & delivery capacity slot manager
│   │   ├── orders/page.tsx                 # Owner orders pipeline & PDF invoice download
│   │   └── products/page.tsx               # Product catalog CRUD, variants, addons & media
│   ├── explore/page.tsx                    # Customer bakery exploration grid
│   ├── for-owners/page.tsx                 # Public seller acquisition page
│   ├── how-it-works/page.tsx               # Public ordering process walkthrough
│   ├── onboarding/
│   │   ├── context.tsx                     # React Context for multi-step owner form
│   │   ├── layout.tsx                      # Onboarding layout provider
│   │   ├── page.tsx                        # Redirects to /onboarding/step-1
│   │   ├── step-1/page.tsx                 # Owner personal details
│   │   ├── step-2/page.tsx                 # Bakery brand & business type
│   │   ├── step-3/page.tsx                 # Location, address & pincode
│   │   └── step-4/page.tsx                 # FSSAI document upload & submission
│   ├── pricing/page.tsx                    # Public SaaS pricing plans
│   ├── shop/[id]/page.tsx                  # Customer canonical bakery storefront
│   ├── shops/[id]/page.tsx                 # HTTP 307 redirect to /shop/[id]
│   ├── globals.css                         # Tailwind CSS root imports & design tokens
│   ├── layout.tsx                          # Global HTML root layout & providers
│   ├── page.tsx                            # Customer Marketplace V2 Landing Page
│   └── storefront.css                      # Unreferenced legacy stylesheet (36 KB)
├── components/
│   ├── checkout/
│   │   ├── CartDrawer.tsx                  # Customer cart drawer skeleton
│   │   └── CheckoutModal.tsx               # Customer checkout modal skeleton
│   ├── dashboard/
│   │   ├── DashboardLayoutWrapper.tsx      # Sidebar/Header wrapper for owner shell
│   │   ├── Header.tsx                      # Top bar with shop indicator & avatar
│   │   ├── Sidebar.tsx                     # Wine-styled navigation sidebar
│   │   └── owner/
│   │       ├── OwnerCouponsTab.tsx         # Coupons skeleton (Future Owner tab)
│   │       ├── OwnerCustomersTab.tsx       # Customers CRM skeleton (Future Owner tab)
│   │       ├── OwnerSettingsTab.tsx        # Settings skeleton (Future Owner tab)
│   │       └── OwnerSubscriptionTab.tsx    # Subscription skeleton (Future Owner tab)
│   ├── layout/
│   │   ├── AnnouncementBar.tsx             # Promotional top ticker on marketplace
│   │   ├── Footer.tsx                      # Global multi-column footer
│   │   ├── MobileMenu.tsx                  # Mobile slide-out navigation
│   │   └── Navbar.tsx                      # Customer & public header navigation
│   ├── marketplace/
│   │   ├── BakeryCard.tsx                  # Individual bakery card with rating & tags
│   │   ├── BakeryGrid.tsx                  # Responsive grid of bakery cards
│   │   ├── BusinessCategoryTabs.tsx        # Bakery filter tabs (Home bakery, studio, etc.)
│   │   ├── CakeCard.tsx                    # Featured cake product card
│   │   ├── CustomerTestimonials.tsx        # Customer social proof carousel
│   │   ├── FeaturedCakes.tsx               # Featured cakes section (Unused in page.tsx)
│   │   ├── HeroSection.tsx                 # Marketplace hero banner with search
│   │   ├── HowItWorks.tsx                  # 4-step marketplace visual flow
│   │   ├── LocationFilterBar.tsx           # 4-tier location hierarchy selector
│   │   ├── OwnerCTA.tsx                    # "Become a Baker" bottom CTA
│   │   └── TrustBenefits.tsx               # Freshness & hygiene trust badges
│   ├── onboarding/
│   │   ├── StepNavigator.tsx               # 4-step progress indicator
│   │   └── SuccessModal.tsx                # Post-registration celebration modal
│   ├── storefront/
│   │   └── ProductDetailModal.tsx          # Real product showcase & cake enquiry form
│   └── ui/
│       └── RatingStars.tsx                 # Reusable star rating visualization
├── lib/
│   ├── api/
│   │   ├── auth.ts                         # Login API & localStorage JWT storage
│   │   ├── client.ts                       # Central fetch wrapper with Bearer token
│   │   ├── deliverySlots.ts                # Owner delivery slots CRUD API
│   │   ├── orders.ts                       # Owner orders list, status & invoice API
│   │   ├── products.ts                     # Owner product CRUD & media upload API
│   │   └── storefront.ts                   # Public discovery, storefront, products & enquiries
│   ├── constants/
│   │   ├── categories.ts                   # Cake & bakery category constants
│   │   └── mockData.ts                     # Defensive offline development fallback
│   └── api.ts                              # Standalone registration API client (Onboarding)
├── data/
│   └── locations.ts                        # Hierarchical India state/district/city/area data
├── types/
│   └── storefront.ts                       # Domain types: Shop, Product, Variant, Addon, Enquiry
└── public/
    ├── 3d/                                 # 8 timestamped 3D asset variants (Unreferenced)
    ├── 3d_*.png                            # 8 root 3D assets (Unreferenced)
    ├── hero[1-3].jpg                       # 3 static hero banners (Unreferenced)
    ├── chocolate-cake.png                  # Static cake graphic (Unreferenced)
    ├── strawberry-cake.png                 # Static cake graphic (Unreferenced)
    ├── favicon.svg, icons.svg              # Active favicon & SVG symbols
    └── next.svg, vercel.svg                # Framework static assets
```

---

## 2. Customer File Map

Files actively utilized to render the Customer Marketplace, Bakery Storefront, and Product Detail flows:

| File Path | Role Function | Consuming Pages / Components |
| :--- | :--- | :--- |
| `app/page.tsx` | Customer Marketplace Home | Direct route `/` |
| `app/explore/page.tsx` | Bakery Directory Grid | Direct route `/explore` |
| `app/shop/[id]/page.tsx` | Canonical Bakery Storefront Profile | Direct route `/shop/[id]` |
| `app/shops/[id]/page.tsx` | HTTP 307 Redirection to `/shop/[id]` | Direct route `/shops/[id]` |
| `components/marketplace/HeroSection.tsx` | Search & Hero Banner | `app/page.tsx` |
| `components/marketplace/LocationFilterBar.tsx` | 4-Tier Location Filter | `app/page.tsx`, `app/explore/page.tsx` |
| `components/marketplace/BusinessCategoryTabs.tsx` | Bakery Category Filter | `app/page.tsx`, `app/explore/page.tsx` |
| `components/marketplace/BakeryGrid.tsx` | Bakery Card Grid Layout | `app/page.tsx`, `app/explore/page.tsx` |
| `components/marketplace/BakeryCard.tsx` | Individual Bakery Card | `components/marketplace/BakeryGrid.tsx` |
| `components/marketplace/HowItWorks.tsx` | Ordering Process Steps | `app/page.tsx` |
| `components/marketplace/TrustBenefits.tsx` | Freshness & Hygiene Badges | `app/page.tsx` |
| `components/marketplace/CustomerTestimonials.tsx` | Social Proof Feed | `app/page.tsx` |
| `components/marketplace/OwnerCTA.tsx` | Seller Acquisition Banner | `app/page.tsx` |
| `components/storefront/ProductDetailModal.tsx` | Product Showcase & Enquiry Modal | `app/shop/[id]/page.tsx` |
| `lib/api/storefront.ts` | Storefront API Client | `app/page.tsx`, `app/explore/page.tsx`, `app/shop/[id]/page.tsx`, `ProductDetailModal.tsx` |
| `data/locations.ts` | Location Master Dataset | `components/marketplace/LocationFilterBar.tsx` |

---

## 3. Owner File Map

Files actively utilized to render the Bakery Owner Onboarding, Authentication, and Dashboard workflows:

| File Path | Role Function | Consuming Pages / Components |
| :--- | :--- | :--- |
| `app/(auth)/login/page.tsx` | Owner JWT Login Page | Direct route `/(auth)/login` |
| `app/onboarding/layout.tsx` | Onboarding Multi-Step Provider | Direct route `/onboarding` |
| `app/onboarding/context.tsx` | State context for registration wizard | `app/onboarding/layout.tsx`, steps 1–4, `lib/api.ts` |
| `app/onboarding/page.tsx` | Auto-redirect to `/onboarding/step-1` | Direct route `/onboarding` |
| `app/onboarding/step-1/page.tsx` | Owner Personal Info | Direct route `/onboarding/step-1` |
| `app/onboarding/step-2/page.tsx` | Bakery Business Details | Direct route `/onboarding/step-2` |
| `app/onboarding/step-3/page.tsx` | Bakery Address & Pincode | Direct route `/onboarding/step-3` |
| `app/onboarding/step-4/page.tsx` | FSSAI Upload & API Submit | Direct route `/onboarding/step-4` |
| `components/onboarding/StepNavigator.tsx` | Step Navigation Bar | Steps 1, 2, 3, 4 |
| `components/onboarding/SuccessModal.tsx` | Onboarding Completion Popup | `app/onboarding/step-4/page.tsx` |
| `app/dashboard/owner/layout.tsx` | Protected Owner Layout | All `/dashboard/owner/*` routes |
| `app/dashboard/owner/AuthGuard.tsx` | JWT Verification & Route Protector | `app/dashboard/owner/layout.tsx` |
| `app/dashboard/owner/page.tsx` | Owner Overview & Real Stats | Direct route `/dashboard/owner` |
| `app/dashboard/owner/products/page.tsx` | Product Catalog CRUD & Variants | Direct route `/dashboard/owner/products` |
| `app/dashboard/owner/orders/page.tsx` | Orders Management & Invoices | Direct route `/dashboard/owner/orders` |
| `app/dashboard/owner/delivery-slots/page.tsx` | Delivery/Pickup Windows | Direct route `/dashboard/owner/delivery-slots` |
| `components/dashboard/DashboardLayoutWrapper.tsx`| Dashboard Shell Controller | `app/dashboard/owner/layout.tsx` |
| `components/dashboard/Sidebar.tsx` | Wine Navigation Sidebar | `components/dashboard/DashboardLayoutWrapper.tsx` |
| `components/dashboard/Header.tsx` | Top Bar with Shop Badge & Avatar | `components/dashboard/DashboardLayoutWrapper.tsx` |
| `lib/api/auth.ts` | Login API Client | `app/(auth)/login/page.tsx` |
| `lib/api.ts` | Registration API Client | `app/onboarding/step-4/page.tsx` |
| `lib/api/products.ts` | Product CRUD & Media API | `app/dashboard/owner/products/page.tsx` |
| `lib/api/orders.ts` | Orders API & PDF Invoices | `app/dashboard/owner/orders/page.tsx` |
| `lib/api/deliverySlots.ts` | Delivery Slots CRUD API | `app/dashboard/owner/delivery-slots/page.tsx` |

---

## 4. Admin File Map

| File Path | Current Status | Description |
| :--- | :--- | :--- |
| `app/(auth)/login/page.tsx` | Shared with Owner | Admins log in via same endpoint (`/api/auth/login`) which issues JWT with `ROLE_ADMIN`. |
| Frontend Admin Screens | **FRONTEND MISSING (0%)** | All 9 backend admin endpoints exist in Spring Boot (`AdminDashboardController`, `AdminSubscriptionPlanController`, `AdminMessageController`). Dedicated frontend routes (`/admin/*`) are planned for Phase 7–10. |

---

## 5. Shared File Map

Files that are inherently role-agnostic and **must remain shared** in common directories:

| File Path | Shared Function | Consumers Across Domains |
| :--- | :--- | :--- |
| `app/layout.tsx` | Root HTML shell & fonts | Global (Customer, Owner, Admin) |
| `app/globals.css` | Global styling & design tokens | Global |
| `components/layout/Navbar.tsx` | Primary navigation header | Customer pages (`/`, `/explore`, `/shop/[id]`, `/checkout`, `/pricing`, `/how-it-works`, `/contact`) |
| `components/layout/Footer.tsx` | Primary navigation footer | Customer pages (`/`, `/explore`, `/shop/[id]`, `/checkout`, `/pricing`, `/how-it-works`, `/contact`) |
| `components/layout/AnnouncementBar.tsx`| Promotional top bar | `app/page.tsx` |
| `components/layout/MobileMenu.tsx` | Mobile navigation drawer | `components/layout/Navbar.tsx` |
| `components/ui/RatingStars.tsx` | Rating star visualizer | `components/marketplace/BakeryCard.tsx`, Future Reviews |
| `lib/api/client.ts` | Centralized Fetch wrapper | `lib/api/storefront.ts`, `lib/api/products.ts`, `lib/api/orders.ts`, `lib/api/deliverySlots.ts`, `lib/api/auth.ts` |
| `lib/constants/categories.ts` | Master category definitions | `Navbar.tsx`, `MobileMenu.tsx`, `HeroSection.tsx` |
| `lib/constants/mockData.ts` | Defensive offline fallback | `lib/api/storefront.ts` |
| `types/storefront.ts` | Shared TypeScript interfaces | 11 files across `app/`, `components/`, and `lib/` |

---

## 6. Route Map

| URL Path | Domain / Role | Implementation Status | Backing Component / Handler |
| :--- | :--- | :--- | :--- |
| `/` | Customer | `DONE` (Verified live) | `app/page.tsx` |
| `/explore` | Customer | `DONE` (Verified live) | `app/explore/page.tsx` |
| `/shop/[id]` | Customer | `DONE` (Verified live) | `app/shop/[id]/page.tsx` |
| `/shops/[id]` | Customer | `DONE` (307 Redirect) | `app/shops/[id]/page.tsx` |
| `/checkout` | Customer | `PARTIAL` (Skeleton) | `app/checkout/page.tsx` |
| `/how-it-works` | Public | `DONE` | `app/how-it-works/page.tsx` |
| `/pricing` | Public | `DONE` | `app/pricing/page.tsx` |
| `/for-owners` | Public | `DONE` | `app/for-owners/page.tsx` |
| `/contact` | Public | `DONE` | `app/contact/page.tsx` |
| `/(auth)/login` | Owner / Admin | `DONE` (Verified live) | `app/(auth)/login/page.tsx` |
| `/onboarding` | Owner | `DONE` (Verified live) | `app/onboarding/page.tsx` |
| `/onboarding/step-1` | Owner | `DONE` (Verified live) | `app/onboarding/step-1/page.tsx` |
| `/onboarding/step-2` | Owner | `DONE` (Verified live) | `app/onboarding/step-2/page.tsx` |
| `/onboarding/step-3` | Owner | `DONE` (Verified live) | `app/onboarding/step-3/page.tsx` |
| `/onboarding/step-4` | Owner | `DONE` (Verified live) | `app/onboarding/step-4/page.tsx` |
| `/dashboard/owner` | Owner | `PARTIAL` (Live stats) | `app/dashboard/owner/page.tsx` |
| `/dashboard/owner/products` | Owner | `DONE` (Verified live) | `app/dashboard/owner/products/page.tsx` |
| `/dashboard/owner/orders` | Owner | `DONE` (Verified live) | `app/dashboard/owner/orders/page.tsx` |
| `/dashboard/owner/delivery-slots`| Owner | `DONE` (Verified live) | `app/dashboard/owner/delivery-slots/page.tsx` |

---

## 7. API / Service Map

```text
lib/api/
├── client.ts                     [SHARED] Core authenticated fetch wrapper injecting Bearer JWT
├── auth.ts                       [OWNER/ADMIN] loginOwner() -> POST /api/auth/login
├── storefront.ts                 [CUSTOMER] fetchShops(), fetchShopDetails(), fetchShopProducts(),
│                                           fetchProductDetails(), submitProductEnquiry()
├── products.ts                   [OWNER] getOwnerProducts(), createOwnerProduct(), updateOwnerProduct(),
│                                         deleteOwnerProduct(), uploadProductImage()
├── orders.ts                     [OWNER] getOwnerOrders(), getOrderDetails(), updateOrderStatus(),
│                                         downloadInvoice()
├── deliverySlots.ts              [OWNER] getSlots(), createSlot(), updateSlot(), updateStatus(), deleteSlot()
└── ../api.ts                     [OWNER] registerOwner() -> POST /api/auth/register (Standalone in lib/)
```

---

## 8. Dependency & Reference Map

Complete inbound import counts across `frontend_v1`:

```text
types/storefront.ts              <- 11 incoming imports (Core domain types)
components/layout/Navbar.tsx     <- 8 incoming imports (All public & customer pages)
components/layout/Footer.tsx     <- 8 incoming imports (All public & customer pages)
app/onboarding/context.tsx       <- 7 incoming imports (Onboarding wizard state)
lib/api/client.ts                <- 6 incoming imports (All authenticated API services)
components/onboarding/StepNavigator.tsx <- 4 incoming imports (Steps 1–4)
lib/api/storefront.ts            <- 4 incoming imports (Marketplace, Explore, Storefront, Modal)
lib/constants/categories.ts      <- 3 incoming imports (Navbar, MobileMenu, HeroSection)
components/marketplace/BakeryGrid.tsx <- 2 incoming imports (Home, Explore)
components/marketplace/LocationFilterBar.tsx <- 2 incoming imports (Home, Explore)
components/marketplace/BusinessCategoryTabs.tsx <- 2 incoming imports (Home, Explore)
lib/api.ts                       <- 2 incoming imports (Step 4, Jest test)
components/marketplace/BakeryCard.tsx <- 1 incoming import (BakeryGrid)
components/marketplace/CakeCard.tsx <- 1 incoming import (FeaturedCakes)
components/marketplace/CustomerTestimonials.tsx <- 1 incoming import (Home)
components/marketplace/HeroSection.tsx <- 1 incoming import (Home)
components/marketplace/HowItWorks.tsx <- 1 incoming import (Home)
components/marketplace/OwnerCTA.tsx <- 1 incoming import (Home)
components/marketplace/TrustBenefits.tsx <- 1 incoming import (Home)
components/storefront/ProductDetailModal.tsx <- 1 incoming import (Shop storefront)
components/ui/RatingStars.tsx    <- 1 incoming import (BakeryCard)
data/locations.ts                <- 1 incoming import (LocationFilterBar)
components/checkout/CartDrawer.tsx <- 1 incoming import (CheckoutModal)
lib/constants/mockData.ts        <- 1 incoming import (storefront.ts)
```

---

## 9. Safe-to-Move Files (For Future Phased Reorganization)

When the project transitions into folder reorganization, the following files can be moved into role-specific folders **only after updating their corresponding import statements**:

### Customer Components:
- `components/marketplace/*` (10 files) $\rightarrow$ `components/customer/marketplace/*`
- `components/storefront/ProductDetailModal.tsx` $\rightarrow$ `components/customer/storefront/ProductDetailModal.tsx`
- `components/checkout/*` (2 files) $\rightarrow$ `components/customer/checkout/*`

### Owner Components:
- `components/dashboard/owner/*` (4 skeleton tabs) $\rightarrow$ `components/owner/tabs/*`
- `components/dashboard/Header.tsx`, `Sidebar.tsx`, `DashboardLayoutWrapper.tsx` $\rightarrow$ `components/owner/layout/*`
- `components/onboarding/*` (2 files) $\rightarrow$ `components/owner/onboarding/*`
- `lib/api.ts` (registerOwner) $\rightarrow$ Merge into `lib/api/auth.ts`

---

## 10. Potentially Unused Files Requiring Confirmation

| File Path | Evidence & Reason | Recommended Action |
| :--- | :--- | :--- |
| **`app/storefront.css`** | 36,061 bytes of CSS. Exact string search across the entire codebase yields **zero imports or `<link>` references**. It was leftover from an early V1 prototype. | Confirm for deletion in future cleanup phase. |
| **`components/marketplace/FeaturedCakes.tsx`** | Component defines a static cake carousel. `app/page.tsx` imports `fetchFeaturedCakes` from `lib/api/storefront.ts` but **never imports or renders `<FeaturedCakes />`**. | Confirm whether to wire into `app/page.tsx` or archive. |
| **`components/marketplace/CakeCard.tsx`** | Only imported by `FeaturedCakes.tsx`. Not rendered anywhere else in the application. | Tied to `FeaturedCakes.tsx` decision. |
| **`public/hero1.jpg`, `hero2.jpg`, `hero3.jpg`** | Static photos in `public/`. Total size ~2.4 MB. Exact string search yields **zero references** (active hero uses Unsplash URLs). | Archive or retain as offline asset fallback. |
| **`public/chocolate-cake.png`, `strawberry-cake.png`** | Static cake graphics in `public/`. Total size ~1.5 MB. **Zero references**. | Archive or retain as offline fallback. |
| **`public/3d/` (8 files)** | Timestamped duplicates of the root `3d_*.png` assets. **Zero references**. | Confirm deletion of redundant folder. |

---

## 11. Duplicate / Legacy Files

1. **`lib/api.ts` vs `lib/api/auth.ts`:**
   - `lib/api.ts` sits in the root of `lib/` and contains only `registerOwner()`.
   - `lib/api/auth.ts` sits in `lib/api/` and contains `loginOwner()`.
   - *Analysis:* Both handle authentication. `lib/api.ts` should eventually be consolidated into `lib/api/auth.ts` to keep `lib/api/` unified.
2. **`app/shops/[id]` vs `app/shop/[id]`:**
   - Canonical storefront is `/shop/[id]`.
   - `app/shops/[id]/page.tsx` is a 1-line redirect (`redirect('/shop/' + params.id)`).
   - *Analysis:* Harmless redirect maintained for backward compatibility.

---

## 12. Recommended Final Folder Structure

```text
frontend_v1/
├── app/
│   ├── (public)/                     # Grouped public routes: /, explore, pricing, contact
│   ├── (customer)/shop/[id]/         # Customer storefront
│   ├── (auth)/login/                 # Unified login
│   ├── onboarding/                   # Owner onboarding wizard
│   ├── dashboard/owner/              # Owner portal routes
│   └── admin/                        # Future Admin portal routes
├── components/
│   ├── common/                       # Shared UI: Navbar, Footer, Buttons, Modals, RatingStars
│   ├── customer/
│   │   ├── marketplace/              # HeroSection, LocationFilterBar, BakeryGrid, BakeryCard
│   │   ├── storefront/               # ProductDetailModal, BakeryShowcase
│   │   └── checkout/                 # CartDrawer, CheckoutModal
│   ├── owner/
│   │   ├── layout/                   # Sidebar, Header, DashboardLayoutWrapper
│   │   ├── onboarding/               # StepNavigator, SuccessModal
│   │   ├── products/                 # ProductTable, AddEditProductModal
│   │   ├── orders/                   # OrdersTable, OrderDetailsModal
│   │   └── tabs/                     # Coupons, Customers, Settings, Subscription skeletons
│   └── admin/
│       ├── layout/                   # AdminSidebar, AdminHeader
│       └── views/                    # Platform overview, Bakery moderation, Plans
├── lib/
│   ├── api/                          # Centralized API clients (client.ts, auth.ts, storefront.ts, ...)
│   ├── constants/                    # Categories, mock data
│   └── utils/                        # Shared formatters, helpers
├── types/                            # Domain TypeScript definitions
└── public/                           # Optimized static assets
```

---

## 13. Migration Order (When Approved to Proceed)

1. **Step 1 — Zero-Risk Consolidation:**
   - Merge `lib/api.ts` into `lib/api/auth.ts` and update import in `app/onboarding/step-4/page.tsx`.
   - Remove confirmed dead file `app/storefront.css`.
2. **Step 2 — Move Owner Layout & Onboarding Components:**
   - Move `components/dashboard/*` $\rightarrow$ `components/owner/layout/*`.
   - Move `components/onboarding/*` $\rightarrow$ `components/owner/onboarding/*`.
   - Update imports in `app/dashboard/owner/layout.tsx` and onboarding steps.
3. **Step 3 — Move Customer Components:**
   - Move `components/marketplace/*` $\rightarrow$ `components/customer/marketplace/*`.
   - Move `components/storefront/*` $\rightarrow$ `components/customer/storefront/*`.
   - Move `components/checkout/*` $\rightarrow$ `components/customer/checkout/*`.
   - Update imports in `app/page.tsx`, `app/explore/page.tsx`, and `app/shop/[id]/page.tsx`.
4. **Step 4 — Verification Gate:**
   - Run `npm run lint` and `npm run build` after each step to guarantee zero import regressions.

---

## 14. Risks & Mitigations

| Risk | Severity | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Broken Import Paths** | High | Build failure (`Type error: Cannot find module`) | Perform file moves in discrete batches, using TypeScript compiler checks (`tsc --noEmit` or `next build`) immediately following each move. |
| **Next.js Route Breakage** | Critical | 404 on public URLs | Keep all `app/` folder routes (`/`, `/shop/[id]`, `/dashboard/owner/*`) strictly in place. Route URLs must never change. |
| **Loss of Future Skeletons** | Medium | Loss of prepared UI logic for Cart or Owner CRM | All skeletons (`CartDrawer`, `CheckoutModal`, `OwnerCouponsTab`, `OwnerCustomersTab`, etc.) are explicitly cataloged and preserved. |
| **Duplicate Component Bloat** | Medium | Confusion between customer and owner components | Common UI primitives (`RatingStars`, layout components) stay in shared folders; role-specific views move into domain folders. |
