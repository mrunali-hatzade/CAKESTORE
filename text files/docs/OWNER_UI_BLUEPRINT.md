# CakeStore SaaS Platform — Owner UI & Architecture Blueprint

**Document Version:** 1.0 (Phase 1 Baseline)  
**Date:** September 2026  
**Audience:** Frontend Engineers, Product Designers  
**Design Authority:** Official Bakery Owner Dashboard UI Reference (Deep Plum Sidebar `#3D101E`, Cream Body, KPI Cards, Order Table, Sales Trend Line Chart, and Alert Cards).

---

## 1. Owner Application Architecture Tree

```text
Owner Dashboard Application
│
├── Overview (/dashboard/owner)
│   ├── Header (Shop identity, Notification Bell, User Avatar)
│   ├── KPI Metric Cards (Total Orders, Total Revenue, Active Products, New Customers)
│   ├── Recent Orders Table (Order number, customer name, price, status badge, timestamp)
│   ├── Sales Overview Chart (Weekly / Monthly revenue trend)
│   └── Actionable Alert Banners (Low Stock Alert, Upcoming Orders, Customer Feedback)
│
├── Products (/dashboard/owner/products)
│   ├── Product List Table & Search Filter
│   ├── Add / Edit Product Modal
│   ├── Product Variants Manager (Weights & Sizes)
│   ├── Product Addons Manager (Candles, Toppers, Photo Prints)
│   └── Product Media Upload (Cloudinary / Disk storage)
│
├── Orders (/dashboard/owner/orders)
│   ├── Filterable Order Pipeline (All, NEW, PREPARING, READY, COMPLETED, CANCELLED)
│   ├── Order Details Modal (Line items, variant snapshot, custom message, delivery slot)
│   ├── Status Update Action Workflow (Transition triggers)
│   └── Official PDF Invoice Download
│
├── Delivery Slots (/dashboard/owner/delivery-slots)
│   ├── Weekday Slot Directory (Monday through Sunday)
│   ├── Time Window Manager (Start time, End time)
│   ├── Order Capacity Limits (Max orders per window)
│   └── Active / Inactive Status Toggle
│
├── Enquiries (/dashboard/owner/enquiries)
│   ├── Custom Cake Leads Pipeline
│   ├── Customer Design & Occasion Details View
│   ├── Reference Photo Inspector
│   ├── Price Quotation & Owner Response Form
│   └── Lead Status Workflow (PENDING, REVIEWED, ACCEPTED, REJECTED)
│
├── Customers (/dashboard/owner/customers)
│   ├── Customer CRM Table (Name, Email, Mobile, Total Orders, Lifetime Spend)
│   └── Customer Profile & Order History Modal
│
├── Reviews (/dashboard/owner/reviews)
│   ├── Customer Ratings & Review List
│   ├── Star Rating Filter (1 to 5 stars)
│   ├── Owner Public Reply Modal
│   └── Feedback Flag / Moderation
│
├── Coupons (/dashboard/owner/coupons)
│   ├── Active Coupon Cards (Code, Percentage/Flat discount, Expiry)
│   └── Create Coupon Modal (Usage limits, Minimum order value)
│
├── Analytics (/dashboard/owner/analytics)
│   ├── Revenue Breakdown (Daily, Weekly, Monthly)
│   ├── Top-Selling Products Bar Chart
│   └── Order Volume & Peak Hours Distribution
│
├── Subscription (/dashboard/owner/subscription)
│   ├── Current Plan Details (Tier, Price, Validity, Auto-renew flag)
│   ├── Plan Feature Entitlements
│   └── Subscription Renewal / Upgrade Checkout Action
│
├── Settings (/dashboard/owner/settings)
│   ├── Bakery Profile Information (Business Name, Category, Description)
│   ├── Location & Address Settings (Address lines, Area, City, State, Pincode)
│   ├── Contact Channels (Phone, WhatsApp number, Email)
│   ├── FSSAI Registration & Accreditation Number
│   └── Settlement Bank & UPI Payout Details
│
└── Website (/dashboard/owner/website)
    ├── Storefront Preview Link (Opens public /shop/[id])
    ├── Cover Image & Logo Uploader
    └── Bakery Story & Highlight Tags
```

---

## 2. Section-by-Section Specifications

### 2.1 Overview
- **Purpose:** Central operational pulse of the bakery showing immediate metrics, today's order actions, revenue trajectory, and priority alerts.
- **Route:** `/dashboard/owner`
- **UI Components Required:** `OwnerHeader`, `MetricKpiCard`, `RecentOrdersTable`, `SalesOverviewChart`, `AlertBannerCard`.
- **API Endpoints Required:** `GET /api/shops/my-shop/stats`, `GET /api/owner/orders`, `GET /api/owner/analytics/dashboard`.
- **Database Entities Involved:** `Shop`, `Product`, `Order`.
- **Current Status:** `PARTIAL` (Metrics loading live from `GET /api/shops/my-shop/stats`; trend chart and alert widgets need UI enhancement).
- **Dependencies:** Authenticated session (`ROLE_SHOP_OWNER`).
- **Target Phase:** Phase 2 (Owner UI Enhancement).

### 2.2 Products
- **Purpose:** Complete catalog management including multi-tier pricing, product photos, weight/size options, and custom celebration addons.
- **Route:** `/dashboard/owner/products`
- **UI Components Required:** `ProductTable`, `AddEditProductModal`, `VariantForm`, `AddonForm`, `ImageUploader`.
- **API Endpoints Required:** `GET/POST/PUT/DELETE /api/owner/products`, `POST /api/owner/media/upload`.
- **Database Entities Involved:** `Product`, `ProductVariant`, `ProductAddon`.
- **Current Status:** `DONE ✅` (Fully operational, tested, and passing).
- **Dependencies:** `ProductService`, `CloudinaryService`.
- **Target Phase:** Baseline Verified.

### 2.3 Orders
- **Purpose:** Order fulfillment lifecycle management from placement to delivery, including line-item inspection and invoice dispatch.
- **Route:** `/dashboard/owner/orders`
- **UI Components Required:** `OrdersTable`, `OrderFilterTabs`, `OrderDetailsModal`, `StatusDropdown`, `InvoiceDownloadButton`.
- **API Endpoints Required:** `GET /api/owner/orders`, `GET /api/owner/orders/{id}`, `PATCH /api/owner/orders/{id}/status`, `GET /api/owner/orders/{id}/invoice`.
- **Database Entities Involved:** `Order`, `OrderItem`, `ShopDeliverySlot`.
- **Current Status:** `DONE ✅` (Fully operational, tested, and passing).
- **Dependencies:** `OrderService`.
- **Target Phase:** Baseline Verified.

### 2.4 Delivery Slots
- **Purpose:** Control daily operational capacity by defining delivery/pickup hours and capping order quantities per slot.
- **Route:** `/dashboard/owner/delivery-slots`
- **UI Components Required:** `DeliverySlotCard`, `SlotModal`, `CapacityInput`, `ActiveToggle`.
- **API Endpoints Required:** `GET/POST/PUT/DELETE /api/owner/delivery-slots`, `PATCH /status`.
- **Database Entities Involved:** `ShopDeliverySlot`.
- **Current Status:** `DONE ✅` (Fully operational, tested, and passing).
- **Dependencies:** `DeliverySlotService`.
- **Target Phase:** Baseline Verified.

### 2.5 Enquiries & Custom Cake Requests
- **Purpose:** Lead management dashboard where the baker reviews custom cake requests submitted by marketplace customers, inspects inspiration photos, enters confirmed pricing quotes, and replies to general enquiries.
- **Route:** `/dashboard/owner/enquiries`
- **UI Components Required:** `EnquiryKanban` or `EnquiryTable`, `CustomCakeDetailModal`, `QuotePriceInput`, `OwnerReplyTextarea`, `StatusBadge`.
- **API Endpoints Required:**
  - `GET /api/owner/custom-cakes`
  - `POST /api/owner/custom-cakes/{id}/respond`
  - `GET /api/owner/enquiries`
  - `POST /api/owner/enquiries/{id}/reply`
- **Database Entities Involved:** `CustomCakeRequest`, `Enquiry`.
- **Current Status:** `BACKEND ONLY` (Backend 100% complete and tested in Phase D; frontend UI screen pending).
- **Dependencies:** `OwnerInteractionService`, `CustomCakeRequestRepository`.
- **Target Phase:** Phase 3.

### 2.6 Customers (CRM)
- **Purpose:** Customer relationship directory tracking customer contacts, aggregate orders placed, and lifetime spend.
- **Route:** `/dashboard/owner/customers`
- **UI Components Required:** `CustomerTable`, `CustomerSearchInput`, `CustomerHistoryDrawer`.
- **API Endpoints Required:** `GET /api/owner/customers`, `GET /api/owner/customers/{email}`.
- **Database Entities Involved:** `User`, `Order`.
- **Current Status:** `BACKEND ONLY` (Skeleton preserved in `OwnerCustomersTab.tsx`).
- **Dependencies:** `ShopService`.
- **Target Phase:** Phase 4.

### 2.7 Reviews & Feedback
- **Purpose:** Reputation management allowing owners to monitor customer star ratings, read testimonials, and post public responses.
- **Route:** `/dashboard/owner/reviews`
- **UI Components Required:** `ReviewCard`, `RatingFilter`, `OwnerReplyModal`, `DeleteConfirmModal`.
- **API Endpoints Required:** `GET /api/owner/feedback`, `POST /api/owner/feedback/{id}/reply`, `DELETE /api/owner/feedback/{id}`.
- **Database Entities Involved:** `Feedback`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `OwnerInteractionService`.
- **Target Phase:** Phase 4.

### 2.8 Coupons & Discounts
- **Purpose:** Promotional marketing tool for creating percentage or flat rate discount coupon codes with expiration dates.
- **Route:** `/dashboard/owner/coupons`
- **UI Components Required:** `CouponGrid`, `CreateCouponModal`, `DiscountTypeRadio`, `ExpiryPicker`.
- **API Endpoints Required:** `GET /api/owner/coupons`, `POST /api/owner/coupons`.
- **Database Entities Involved:** `Coupon`.
- **Current Status:** `BACKEND ONLY` (Skeleton preserved in `OwnerCouponsTab.tsx`).
- **Dependencies:** `ShopService`.
- **Target Phase:** Phase 4.

### 2.9 Analytics
- **Purpose:** Visual business intelligence suite displaying revenue performance, order volume patterns, and bestselling cake items.
- **Route:** `/dashboard/owner/analytics`
- **UI Components Required:** `RevenueSplineChart`, `TopProductsBarChart`, `TimeRangeSelector`, `SummaryCards`.
- **API Endpoints Required:** `GET /api/owner/analytics/dashboard`.
- **Database Entities Involved:** `Order`, `OrderItem`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `ShopService`.
- **Target Phase:** Phase 5.

### 2.10 Subscription & Billing
- **Purpose:** Subscription lifecycle center displaying current membership tier, billing dates, auto-renewal preferences, and upgrade/renewal triggers.
- **Route:** `/dashboard/owner/subscription`
- **UI Components Required:** `PlanCard`, `BillingHistoryTable`, `RenewButton`, `UpgradeModal`.
- **API Endpoints Required:** `GET /api/owner/subscriptions/current`, `POST /api/owner/payments/mock-checkout`.
- **Database Entities Involved:** `Subscription`, `SubscriptionPlan`, `Payment`.
- **Current Status:** `BACKEND ONLY` (Skeleton preserved in `OwnerSubscriptionTab.tsx`).
- **Dependencies:** `SubscriptionService`, `PaymentService`.
- **Target Phase:** Phase 6.

### 2.11 Settings
- **Purpose:** Master configuration for bakery profile, legal FSSAI number, business hours, and bank/UPI settlement accounts.
- **Route:** `/dashboard/owner/settings`
- **UI Components Required:** `ProfileSettingsForm`, `LocationForm`, `BankDetailsForm`, `SaveButton`.
- **API Endpoints Required:** `GET/PUT /api/shops/my-shop`, `GET/POST /api/shops/my-shop/payouts`.
- **Database Entities Involved:** `Shop`, `ShopPayoutDetails`.
- **Current Status:** `BACKEND ONLY` (Skeleton preserved in `OwnerSettingsTab.tsx`).
- **Dependencies:** `ShopService`.
- **Target Phase:** Phase 5.

### 2.12 Website Management
- **Purpose:** Customization of the bakery's public online storefront banner, logo, bio story, and social links.
- **Route:** `/dashboard/owner/website`
- **UI Components Required:** `LogoDropzone`, `CoverImageDropzone`, `StoryTextarea`, `StorefrontPreviewButton`.
- **API Endpoints Required:** `GET/PUT /api/shops/my-shop`, `POST /api/owner/media/upload`.
- **Database Entities Involved:** `Shop`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `ShopService`, `MediaController`.
- **Target Phase:** Phase 5.
