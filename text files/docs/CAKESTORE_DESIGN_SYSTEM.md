# CakeStore SaaS Platform — Design System & Visual Specification

**Document Version:** 1.0 (Phase 1 Baseline)  
**Status:** DESIGN FREEZE  
**Authorities:**
- **Customer:** CakeStore V2 Approved Marketplace & Storefront.
- **Owner:** Approved Bakery Owner Dashboard Reference (`media_1788430950490.jpg` Panel 2).
- **Admin:** Approved Platform Admin Panel Reference (`media_1788430950490.jpg` Panel 3).

---

## 1. Customer Design System (FROZEN)

The Customer Marketplace and Storefront interfaces are **permanently frozen**. No visual modifications or theme redesigns are permitted.

### 1.1 Color Palette
- **Background Cream Light:** `#FAF7F2` (Warm, natural bakery ambience)
- **Background Cream:** `#F5EBE1`
- **Surface White:** `#FFFFFF`
- **Brand Plum (Primary Accent):** `#5B2333` (Warm rich berry/plum)
- **Brand Plum Hover:** `#4A1525`
- **Ruby Crimson (Secondary):** `#9E2A2B`
- **Brand Blush (Soft Tint):** `#FCEFEF` / `#F5EBE6`
- **Brand Espresso (Headings & Body):** `#2B1810`
- **Brand Muted (Secondary text):** `#786C65`
- **Border Subdued:** `#EBDCCD`
- **Success Green:** Emerald 600 (`#059669`) / Emerald 50 (`#ECFDF5`)

### 1.2 Typography
- **Display Headings:** Serif font (e.g. `Playfair Display` or system serif fallback), bold, elegant, warm.
- **Body & Controls:** Clean sans-serif (`Inter`, system-ui), high legibility.
- **Font Scale:**
  - Hero Display: `3xl` to `5xl` (30px – 48px)
  - Section Titles: `2xl` to `3xl` (24px – 30px)
  - Card Titles: `base` to `lg` (16px – 18px)
  - Body Text: `xs` to `sm` (12px – 14px)
  - Badges & Micro-copy: `2xs` to `3xs` (10px – 11px)

### 1.3 Card & Surface Styles
- **Border Radius:** `rounded-3xl` (24px) for prominent containers; `rounded-2xl` (16px) for item cards.
- **Borders:** Thin, elegant border `border border-brand-border/80`.
- **Shadows:** Soft diffuse shadows `shadow-soft` (`0 4px 20px -2px rgba(91, 35, 51, 0.05)`).
- **Hover Effects:** Subtle card lift with plum border highlight `hover:border-brand-plum/30`.

### 1.4 Buttons & Controls
- **Primary Action:** Rounded pill `rounded-full`, bg `brand-plum`, text `white`, font `bold`, py 3 px 6.
- **Secondary Action:** Pill `rounded-full`, bg `brand-cream`, border `border-brand-border`, text `brand-espresso`.
- **Input Fields:** Rounded `rounded-xl`, subtle border, focus ring `focus:ring-2 focus:ring-brand-plum/20`.

---

## 2. Bakery Owner Design System

Based strictly on the approved Bakery Owner Dashboard UI Reference (`media_1788430950490.jpg` Panel 2).

### 2.1 Color Palette
- **Sidebar Background:** Deep Wine / Plum `#3D101E`
- **Sidebar Nav Active:** Soft Crimson `#5B1C2E` with white text
- **Sidebar Nav Text:** Rose Tinted White `#E5D0D6` (hover: `#FFFFFF`)
- **Main Canvas:** Crisp Off-White `#F8F9FA`
- **Card Surface:** Pure White `#FFFFFF`
- **Card Border:** Subtle Gray `#E9ECEF`
- **Heading Text:** Dark Charcoal `#1E293B`
- **Subtext / Muted:** Cool Gray `#64748B`
- **Trend Positive:** Forest Green `#10B981` (badge: `#ECFDF5`)

### 2.2 Dashboard Layout Shell
- **Sidebar:** Fixed width 256px (`w-64`), full height `h-screen`, dark wine theme.
- **Top Header:** Clean white bar with shop logo/avatar, bakery title, notification bell with unread indicator badge, and user dropdown.
- **Canvas Container:** Max width `max-w-7xl`, p 6 to 8, responsive flex layout.

### 2.3 Key UI Components
- **Metric KPI Cards:**
  - 4-column responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
  - White background, `rounded-2xl`, subtle border.
  - Title (sm, gray-500), large metric number (2xl, bold, gray-900), percentage change badge with green upward arrow.
- **Recent Orders Table:**
  - Clean minimalist table with order number, customer name, price (bold ₹), colored status chip, and relative time.
  - Status Chips:
    - `NEW`: Light Blue (`bg-blue-50 text-blue-700`)
    - `CONFIRMED`: Purple (`bg-purple-50 text-purple-700`)
    - `PREPARING`: Amber (`bg-amber-50 text-amber-700`)
    - `OUT FOR DELIVERY`: Orange (`bg-orange-50 text-orange-700`)
    - `DELIVERED`: Emerald (`bg-emerald-50 text-emerald-700`)
- **Sales Overview Trend Chart:**
  - Smooth spline line chart with gradient area fill.
  - Purple/Plum curve line (`#8B263E`), X-axis days of week, Y-axis revenue increments.
  - Time filter dropdown ("This Week", "This Month", "Last 30 Days").
- **Actionable Alert Cards:**
  - 3-column bottom row.
  - Icon badge, title, contextual subtitle (e.g. "Low Stock Alert — 3 products are running low").

---

## 3. Platform Admin Design System

Based strictly on the approved Platform Admin Panel UI Reference (`media_1788430950490.jpg` Panel 3).

### 3.1 Color Palette
- **Sidebar Background:** Deep Slate / Navy `#162232`
- **Sidebar Nav Active:** Cobalt Blue Tint `#21354D`
- **Sidebar Nav Text:** Slate Silver `#A0AEC0`
- **Platform Brand Badge:** Blue Accent `#3182CE`
- **Canvas Background:** Very Light Slate `#F4F6F9`
- **Card Surface:** Pure White `#FFFFFF`
- **Card Border:** Cool Slate `#E2E8F0`

### 3.2 Dashboard Layout Shell
- **Sidebar:** 260px wide, deep navy, logo `CakeStore Admin`, system management navigation links.
- **Top Header:** "Overview" header with Super Admin profile badge and system status pulse.

### 3.3 Key UI Components
- **Platform Metric KPI Cards:**
  - 4 primary platform indicators: Total Shops, Total Owners, Total Orders, Total Revenue.
  - Percentage growth indicators comparing to last month.
- **Platform Revenue Chart:**
  - Macro monthly revenue line chart with smooth interpolation and date ticks.
- **Recent Shops Moderation Table:**
  - Bakery thumbnail, Shop name, City, Date registered, Status badge (`ACTIVE`, `PENDING`, `SUSPENDED`).
  - Action button: Inspect / Moderate.
- **Platform Radar Cards:**
  - 4 bottom overview metric cards: Active Subscriptions, Expiring Soon, Pending Approvals, Broadcast Messages.

---

## 4. Shared Component Guidelines

The following components belong in `components/common/` and must be reused without duplication:
- **`Button`:** Standardized variants (`primary`, `secondary`, `outline`, `danger`, `ghost`).
- **`Input` & `Textarea`:** Consistent label, error state, and placeholder styles.
- **`Modal` & `Dialog`:** Unified backdrop blur (`bg-brand-espresso/50`), escape key listener, and close button.
- **`Table`:** Clean responsive table with header styling, empty state, and zebra striping options.
- **`Badge`:** Status pill supporting all domain statuses (`NEW`, `PREPARING`, `READY`, `COMPLETED`, `ACTIVE`, `PENDING`, `SUSPENDED`).
- **`Toast`:** Lightweight transient notification container.
- **`LoadingSpinner` & `EmptyState`:** Consistent loading skeletons and zero-data illustrations.
