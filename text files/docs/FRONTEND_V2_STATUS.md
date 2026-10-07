# CakeStore Frontend V2 — Implementation Status & Architecture

**Document Version:** 1.4  
**Date:** September 5, 2026  
**Status:** PHASES B, C, G, H, I, K, L, M, N, O, P, Q (STOREFRONT & OWNER DASHBOARD ADVANCED) COMPLETE  
**Workspace:** `D:\PROJECTS\CAKE SAAs1\frontend_v2`  
**Host Port:** `http://localhost:3001`  
**Backend API Target:** `http://localhost:8080`

---

## 1. Executive Summary

Phases H & I (Customer Storefront & In-Store Checkout) are complete and fully operational.

### Core Architectural Requirement Satisfied:
- **Dedicated In-Store Experience:** Once a customer enters `/shop/[id]`, their entire shopping and ordering lifecycle takes place within that specific bakery.
- **No External Redirection:** The user adds custom cakes to their in-store basket (`CartDrawer`), customizes cake messages (`ProductDetailModal`), and checks out via the dedicated in-store modal (`StorefrontCheckoutModal`) without ever being bounced to the marketplace.
- **Single-Bakery Scoped Basket:** `CartContext` strictly isolates cart items to the active `shopId`, prompting clear confirmation before switching bakeries.
- **Live Backend Integration:** Connects to Spring Boot backend endpoints for shop metadata, product catalogs, delivery slots (`/api/storefront/shops/{shopId}/delivery-slots`), and guest orders (`POST /api/storefront/shops/{shopId}/orders`).

In strict adherence to the project guardrails:
- The existing working frontend (`D:\PROJECTS\CAKE SAAs1\frontend\`) remains **100% UNCHANGED**.
- The backend (`D:\PROJECTS\CAKE SAAs1\backend\`), database schema, and Flyway migrations remain **100% UNCHANGED**.
- Both `npm run lint` and `npm run build` pass with **zero errors and zero warnings**.
- The V2 application is actively serving traffic on **`http://localhost:3001`**.

---

## 2. Directory Architecture & Phase H/I Additions

```
frontend_v2/
├── app/
│   ├── layout.tsx                     # Root shell with AuthProvider, ToastProvider, CartProvider
│   ├── globals.css                    # Warm bakery styles, custom scrollbars, typography
│   ├── page.tsx                       # Customer Marketplace Landing Page
│   ├── explore/
│   │   └── page.tsx                   # Live Bakery Explorer with dual SearchBar & CategoryPills
│   ├── shop/
│   │   └── [id]/
│   │       └── page.tsx               # [UPDATED] Full in-store storefront with banner, catalog, cart, & checkout
│   ├── checkout/
│   │   └── page.tsx                   # Standalone guest checkout fallback with delivery slot picker
│   ├── orders/
│   │   └── [orderNumber]/
│   │       └── page.tsx               # Real-time Order Tracker with status timeline & receipt
│   ├── login/
│   │   └── page.tsx                   # Unified JWT Auth Page (Owner / Admin)
│   ├── onboarding/
│   │   └── page.tsx                   # 3-Step Bakery Registration Form
│   ├── dashboard/
│   │   └── owner/
│   │       ├── layout.tsx             # Deep wine sidebar shell & responsive header
│   │       ├── page.tsx               # Bakery KPI Overview & recent orders
│   │       ├── products/
│   │       │   └── page.tsx           # Product catalog CRUD table & creation modal
│   │       ├── orders/
│   │       │   └── page.tsx           # Order management board with StatusBadge
│   │       └── delivery-slots/
│   │           └── page.tsx           # Delivery time windows configuration
│   └── admin/
│       ├── layout.tsx                 # Deep navy admin sidebar shell & platform header
│       ├── page.tsx                   # Platform KPI Overview (GMV, Shops, Orders)
│       ├── shops/
│       │   └── page.tsx               # Bakery Directory & Moderation with StatusBadge
│       ├── plans/
│       │   └── page.tsx               # SaaS Subscription Plans grid
│       └── messages/
│           └── page.tsx               # Platform Broadcast Message composer & feed
├── components/
│   ├── ui/
│   │   ├── Button.tsx                 # Standardized button variants (primary, secondary, outline, ghost, danger)
│   │   ├── Input.tsx                  # Labelled input with error states and helper text
│   │   ├── Textarea.tsx               # Labelled multi-line textarea with error handling
│   │   ├── Select.tsx                 # Typed dropdown select with error handling
│   │   ├── Badge.tsx                  # Status indicators (success, warning, error, info, plum)
│   │   ├── Card.tsx                   # Elevation treatments (flat, soft, elevated) with hover lift
│   │   ├── Modal.tsx                  # Accessible dialog with backdrop blur & Escape listener
│   │   ├── Table.tsx                  # Composable table primitives (Table, Header, Row, Cell)
│   │   ├── Dropdown.tsx               # Contextual action dropdown with outside click listener
│   │   ├── LoadingState.tsx           # Bakery loading spinner with customizable message
│   │   ├── EmptyState.tsx             # Zero-data state with icons and actionable buttons
│   │   └── ErrorState.tsx             # Error message banner with retry triggers
│   ├── common/
│   │   ├── Navbar.tsx                 # Reusable customer navbar with mobile drawer & auth state
│   │   ├── Footer.tsx                 # Reusable marketplace footer with compliance badges
│   │   ├── SearchBar.tsx              # Dual-filter search bar (keyword + city/location)
│   │   ├── StatusBadge.tsx            # Unified status badge for orders, shops, and stock
│   │   └── Toast.tsx                  # Lightweight toast provider and useToast hook
│   ├── customer/
│   │   ├── marketplace/
│   │   │   ├── HeroSection.tsx        # Photorealistic hero with background image & integrated search
│   │   │   ├── CategoryPills.tsx      # Horizontal filter selector (Home Bakers, Studios, Eggless)
│   │   │   ├── BakeryCard.tsx         # Artisanal bakery card with ratings, tags, and storefront CTA
│   │   │   ├── BakeryGrid.tsx         # Responsive bakery grid with sorting, counts, and states
│   │   │   ├── TrustBadges.tsx        # 4-pillar quality guarantees (FSSAI, small-batch, delivery)
│   │   │   └── OwnerCTA.tsx           # High-impact callout for bakery owner onboarding
│   │   └── storefront/
│   │       ├── StorefrontNavbar.tsx   # [NEW] Dedicated bakery header with phone & in-store basket trigger
│   │       ├── StorefrontBanner.tsx   # [NEW] Bakery identity banner with FSSAI badge & bio
│   │       ├── ProductCard.tsx        # [NEW] Cake card with eggless tag, price, and customize button
│   │       ├── ProductDetailModal.tsx # [NEW] Custom message modal with quantity picker & conflict guard
│   │       ├── CartDrawer.tsx         # [NEW] In-store basket drawer with item breakdown & checkout trigger
│   │       └── StorefrontCheckoutModal.tsx # [NEW] Complete in-store guest checkout modal with slot picker
├── context/
│   └── CartContext.tsx                # [NEW] Global cart context with single-bakery isolation & storage persistence
├── lib/
│   ├── api/
│   │   ├── client.ts                  # Centralized fetch client (GET/POST/PUT/PATCH/DELETE) with JWT handling
│   │   ├── auth.ts                    # Login & multipart Register endpoints
│   │   ├── storefront.ts              # Shop profiles, search, and storefront catalog APIs
│   │   ├── products.ts                # Owner product catalog CRUD
│   │   ├── orders.ts                  # Guest checkout, order lookup, and owner status updates
│   │   └── deliverySlots.ts           # Storefront and owner delivery window APIs
│   ├── auth/
│   │   └── AuthContext.tsx            # Global auth context, token storage, and role routing
│   ├── constants/
│   │   └── tokens.ts                  # Frozen CakeStore design tokens source of truth
│   └── utils/
│       └── cn.ts                      # clsx + twMerge utility
├── types/
│   ├── auth.ts                        # UserRole, LoginRequest, LoginResponse, RegisterFormData
│   ├── shop.ts                        # Shop, ShopSummary, ShopSearchFilters
│   ├── product.ts                     # Product, ProductCategory, CreateProductRequest
│   ├── order.ts                       # Order, OrderItem, OrderStatus, GuestOrderRequest
│   ├── deliverySlot.ts                # DeliverySlot, CreateDeliverySlotRequest
│   └── admin.ts                       # AdminOverviewStats, SubscriptionPlan, AdminMessage
├── public/
│   └── marketplace-hero-bakers.jpg    # Artisanal bakery hero background image
├── .env.local                         # NEXT_PUBLIC_API_URL=http://localhost:8080, PORT=3001
├── next.config.mjs                    # Next.js 14 production configuration
├── tailwind.config.ts                 # Extended theme with brand, owner, and admin palettes
├── postcss.config.js                  # PostCSS plugins for Tailwind CSS
├── tsconfig.json                      # Strict TypeScript compiler options with @/* alias
└── package.json                       # Core dependencies (Next 14, React 18, Lucide, Tailwind)
```

---

## 3. Verification Results

| Check | Result | Status |
| :--- | :--- | :--- |
| `npm run lint` | `✔ No ESLint warnings or errors` | **PASS (0 errors, 0 warnings)** |
| `npm run build` | `✓ Generating static pages (16/16)` | **PASS (16/16 routes compiled)** |
| `http://localhost:3001/` | HTTP 200 OK | **PASS** |
| `http://localhost:3001/explore` | HTTP 200 OK | **PASS** |
| `http://localhost:3001/shop/1` | HTTP 200 OK | **PASS** |
| `http://localhost:3001/checkout` | HTTP 200 OK | **PASS** |
| `http://localhost:3001/orders/ORD-TEST` | HTTP 200 OK | **PASS** |
| Existing Frontend (`frontend/`) | Untouched | **100% UNCHANGED** |
| Backend & DB | Untouched | **100% UNCHANGED** |

---

## 4. Next Step & Stop Condition

Phases H & I are complete. Awaiting user review and approval to proceed with:

**PHASE K, L, M, N, O, P, Q — OWNER DASHBOARD ADVANCED EXPERIENCE**  
- Enhanced Product Catalog Management (with image URLs, flavors, weight, and eggless settings)
- Master Order Kanban/Pipeline Board (Accept, Bake, Out for Delivery, Delivered)
- Delivery Slots Configuration with capacity limits
- Customer CRM, Enquiries & Feedback Reviews
- Analytics Charts & SaaS Subscription Plan Upgrade Matrix
