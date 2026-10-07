# CakeStore SaaS Platform — Customer UI & Architecture Blueprint

**Document Version:** 1.0 (Phase 1 Baseline)  
**Date:** September 2026  
**Audience:** Frontend Engineers, Product Designers  
**Status:** Design Frozen (Approved Customer Marketplace and Storefront UI).

---

## 1. Customer Application Architecture Tree

```text
Customer Experience
│
├── Marketplace (Design Frozen & Verified)
│   ├── Homepage (/)
│   ├── Location Filtering (State → District → City → Area)
│   ├── Bakery Search (Keyword matching against name & description)
│   ├── Category Tabs (All Businesses, Home Bakery, Cake Studio, Pure Veg toggle)
│   ├── Bakery Cards (Rating, distance, tags, FSSAI badge, click to storefront)
│   ├── How It Works Section (4-step ordering guide)
│   ├── Trust & Quality Benefits Section
│   ├── Customer Testimonials Section
│   └── Explore Page (/explore)
│
├── Bakery Storefront (/shop/[id] - Canonical)
│   ├── Header Banner & Bakery Profile
│   ├── Accreditation & Trust Badges (FSSAI verified, Years in Business)
│   ├── Contact Channels (Phone call, Instant WhatsApp button)
│   ├── Storefront Navigation Tabs (Menu, About, Contact)
│   ├── Active Bakery Products Showcase
│   └── Category Pills Filter (All, signature cakes, custom specials)
│
├── Product Detail & Enquiry Flow (Verified in Phase D)
│   ├── Product Detail Modal (High-res photo, price, description, status)
│   ├── Product Size & Weight Variants (0.5kg, 1kg, etc. if available)
│   ├── Product Optional Addons (Candles, Toppers if available)
│   ├── Customer Cake Enquiry Form (Name, Phone, Email, Quantity, Date, Custom Note)
│   ├── Enquiry Persistence (Saves to custom_cake_requests table with PENDING status)
│   └── Celebratory Confirmation View with Reference ID & WhatsApp Chat
│
├── Cart (Preserved Skeleton in components/checkout/CartDrawer.tsx)
│   ├── Basket Item List (Quantity stepper, variant summary, total)
│   └── Checkout Action Button
│
├── Checkout (Preserved Skeleton in components/checkout/CheckoutModal.tsx)
│   ├── Customer Contact Details (Name, Phone, Email)
│   ├── Delivery Address Input
│   ├── Delivery Slot Selector (Calling GET /api/storefront/shops/{id}/delivery-slots)
│   └── Place Order Submission (Calling POST /api/storefront/shops/{id}/orders)
│
├── Orders & Tracking
│   ├── Customer Order Status Lookup (/orders/[orderNumber])
│   └── Official Order PDF Invoice Download
│
└── Reviews & Feedback
    ├── Storefront Customer Reviews Feed (/shop/[id]#reviews)
    └── Post-Order Rating & Testimonial Submission Form
```

---

## 2. Section-by-Section Specifications & Status

### 2.1 Marketplace
- **Purpose:** Public landing page and local bakery discovery portal.
- **Routes:** `/`, `/explore`.
- **Components Active:**
  - `components/layout/Navbar.tsx`
  - `components/layout/Footer.tsx`
  - `components/layout/AnnouncementBar.tsx`
  - `components/marketplace/HeroSection.tsx`
  - `components/marketplace/LocationFilterBar.tsx`
  - `components/marketplace/BusinessCategoryTabs.tsx`
  - `components/marketplace/BakeryGrid.tsx`
  - `components/marketplace/BakeryCard.tsx`
  - `components/marketplace/HowItWorks.tsx`
  - `components/marketplace/TrustBenefits.tsx`
  - `components/marketplace/CustomerTestimonials.tsx`
  - `components/marketplace/OwnerCTA.tsx`
- **APIs Connected:** `GET /api/storefront/shops/search` (Consumes real PostgreSQL data with state/district/city/area/search filters).
- **Status:** `DONE ✅` (Design Frozen).

### 2.2 Bakery Storefront
- **Purpose:** Individual bakery online profile and oven-fresh cake menu.
- **Routes:** `/shop/[id]` (Canonical), `/shops/[id]` (HTTP 307 redirect).
- **Components Active:**
  - `app/shop/[id]/page.tsx`
  - `components/layout/Navbar.tsx`
  - `components/layout/Footer.tsx`
- **APIs Connected:** `GET /api/storefront/shops/{id}`, `GET /api/storefront/shops/{id}/products`.
- **Status:** `DONE ✅` (Design Frozen).

### 2.3 Product Detail & Customer Cake Enquiry
- **Purpose:** Full product inspection and custom cake lead generation.
- **Modal Component:** `components/storefront/ProductDetailModal.tsx`.
- **APIs Connected:** `GET /api/storefront/shops/{id}/products/{productId}`, `POST /api/storefront/enquiries`.
- **Database Tables:** `products`, `custom_cake_requests`.
- **Status:** `DONE ✅` (Tested and verified with 100% test pass).

### 2.4 Cart
- **Purpose:** Temporary basket holding selected cakes and celebration addons before placing order.
- **Component Skeleton:** `components/checkout/CartDrawer.tsx` (Self-contained, preserved in clean skeleton state).
- **Status:** `PARTIAL` (Skeleton preserved; will be wired in Phase 11).

### 2.5 Checkout
- **Purpose:** Guest customer order placement with delivery address and time window.
- **Component Skeleton:** `components/checkout/CheckoutModal.tsx` & `/checkout/page.tsx`.
- **Backend Endpoints:**
  - `GET /api/storefront/shops/{shopId}/delivery-slots` (`CustomerStorefrontController`)
  - `POST /api/storefront/shops/{shopId}/orders` (`CustomerStorefrontController`)
- **Database Tables:** `orders`, `order_items`, `shop_delivery_slots`.
- **Status:** `BACKEND ONLY` (Backend endpoints exist; frontend modal wiring scheduled for Phase 11).

### 2.6 Orders & Tracking
- **Purpose:** Guest customer order lookup and downloadable PDF receipt.
- **Backend Endpoints:** `GET /api/storefront/shops/orders/{orderNumber}/invoice`.
- **Status:** `BACKEND ONLY` (Scheduled for Phase 12).

### 2.7 Reviews
- **Purpose:** Public storefront ratings and testimonials.
- **Backend Endpoints:** `GET /api/storefront/shops/{shopId}/feedback`, `POST /api/storefront/shops/{shopId}/feedback`.
- **Status:** `BACKEND ONLY` (Scheduled for Phase 12).
