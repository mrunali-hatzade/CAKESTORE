# Phase 1 — Marketplace Audit: Design 2 & Real Data Verification

**Date:** September 8, 2026  
**Target:** `frontend_v2` Marketplace Architecture & Backend Integration  
**Backend Port:** `http://localhost:8080` (Spring Boot 3 + Java 17 + PostgreSQL)  
**Frontend Port:** `http://localhost:3001` (Next.js 14 App Router)  

---

## 1. Existing Marketplace Components
The Design 2 visual language is already built and consists of:
- **`app/page.tsx`**: Homepage containing `HeroSection`, `AdvancedLocationFilter`, `BakeryGrid`, `TrustBadges`, and `OwnerCTA`.
- **`app/explore/page.tsx`**: Explore page with dual `SearchBar`, `AdvancedLocationFilter`, `CategoryPills`, and `BakeryGrid`.
- **`components/customer/marketplace/HeroSection.tsx`**: Visual hero with background artwork, platform tag, central search bar, quick category pills, and platform trust guarantees.
- **`components/customer/marketplace/BakeryCard.tsx`**: Card rendering bakery cover image, brand logo avatar, status badge, veg badge, rating, business category, location, and "Visit Storefront" CTA (`/shop/${shop.id}`).
- **`components/customer/marketplace/BakeryGrid.tsx`**: Grid layout with sorting dropdown, header title/subtitle, result counter, and empty/error states.
- **`components/customer/marketplace/CategoryPills.tsx`**: Pill buttons for category/business-type filtering.
- **`components/customer/marketplace/AdvancedLocationFilter.tsx`**: Hierarchical Indian State &rarr; District &rarr; City &rarr; Area cascading dropdowns.
- **`components/common/SearchBar.tsx`**: Dual input bar for keyword search and location search.
- **`components/customer/marketplace/TrustBadges.tsx`**: Platform-level assurance features.
- **`components/customer/marketplace/OwnerCTA.tsx`**: Invitation banner linking to `/onboarding`.

---

## 2. Existing API Integration
- **Storefront Search API:** `GET /api/storefront/shops/search`
  - Backend controller: `CustomerStorefrontController.java`
  - Service: `CustomerStorefrontService.java`
  - Specifications: `ShopSpecification.java`
  - Valid Query Parameters supported by backend:
    - `state` (case-insensitive string)
    - `district` (case-insensitive string)
    - `city` (case-insensitive string)
    - `area` (case-insensitive string)
    - `businessType` (enum: `HOME_BAKERY`, `BAKERY_SHOP`, `CAKE_STUDIO`, `ONLINE_CAKE_BUSINESS`, `OTHER`)
    - `search` (keyword matched against `businessName`, `description`, `businessCategory`, `city`, `area`)
    - `location` (matched against `city`, `pincode`, `area`, `address`)
  - Status Requirement: Strictly requires `status == ACTIVE`.
- **Storefront Shop Details:** `GET /api/storefront/shops/{id}`
- **Storefront Products:** `GET /api/storefront/shops/{id}/products`
- **Storefront Delivery Slots:** `GET /api/storefront/shops/{id}/delivery-slots`
- **Storefront Order Placement:** `POST /api/storefront/shops/{id}/orders`

---

## 3. Existing Filters
- **Category Filter:** `CategoryPills.tsx` offers pills: All, Home Bakers, Custom Studios, Pastry Boutiques, Commercial Bakes, 100% Eggless.
- **Location Filter:** `AdvancedLocationFilter.tsx` has cascading selectors for State, District, City, and Area.
- **Sort Filter:** `BakeryGrid.tsx` has Default, Name (A-Z), and City sorting.

---

## 4. Existing Search
- `SearchBar.tsx` provides keyword search (cake name, flavor, or bakery) and location text input.
- Triggered by Enter key or "Find Cakes" submit button.

---

## 5. Existing Navigation
- Bakery cards link directly to canonical storefront route: `/shop/${shop.id}`.
- All storefront tenant data is keyed strictly by `{shopId}`.

---

## 6. Existing Problems Identified

### Problem A: Mismatched Category Enum (`BusinessType`)
- In `frontend_v2/components/customer/marketplace/CategoryPills.tsx`, the values passed were `HOME_BAKER`, `CUSTOM_CAKE_STUDIO`, `PASTRY_SHOP`, `COMMERCIAL_BAKERY`.
- In backend `BusinessType.java`, the enum constants are: `HOME_BAKERY`, `BAKERY_SHOP`, `CAKE_STUDIO`, `ONLINE_CAKE_BUSINESS`, `OTHER`.
- **Impact:** Backend threw `IllegalArgumentException` and returned `[]` (empty list), causing "0 bakeries available"!

### Problem B: Fake Mock Fallback Hiding Real Backend Responses
- `lib/api/storefront.ts` had:
  ```ts
  if (Array.isArray(data) && data.length > 0) return data;
  return MOCK_INDIAN_BAKERIES.filter(...);
  ```
- **Impact:** If backend returned 0 genuine matches or failed, it silently substituted hardcoded mock bakeries instead of showing honest empty or error states.
- In `BakeryCard.tsx`: Hardcoded `shop.rating || 4.8` fabricated fake ratings for shops that had no review data.

### Problem C: Hierarchical Location Filter Collapse
- `AdvancedLocationFilter.tsx` collapsed State, District, City, and Area into a single flat string (`locationQuery`), instead of sending the granular query params (`state`, `district`, `city`, `area`) that the backend `ShopSpecification` is designed to filter.

### Problem D: Abrupt Loading Experience
- `BakeryGrid.tsx` used a generic full-page text spinner instead of polished Design 2 skeleton cards matching the bakery grid aspect ratio.

### Problem E: Lack of Clear "Clear Filters" in Empty State
- When 0 bakeries matched, the empty state did not offer an action to reset search/filters.

---

## 7. Files That Need Modification
1. `lib/api/storefront.ts` — Remove fake mock fallback arrays, forward real backend responses, support structured `ShopSearchFilters` (`state`, `district`, `city`, `area`, `businessType`, `search`, `location`).
2. `components/customer/marketplace/CategoryPills.tsx` — Fix enum mapping to match backend `BusinessType` (`HOME_BAKERY`, `CAKE_STUDIO`, `BAKERY_SHOP`, `ONLINE_CAKE_BUSINESS`).
3. `components/customer/marketplace/BakeryCard.tsx` — Remove hardcoded ratings (`|| 4.8`), show ratings only when real review/rating data exists, render truthful verification badges.
4. `components/customer/marketplace/BakeryGrid.tsx` — Add Design 2 skeleton loading cards, actionable empty state with "Clear Filters" and "Explore All" buttons, and honest result counter.
5. `components/customer/marketplace/AdvancedLocationFilter.tsx` — Expose granular `(state, district, city, area)` callback to parent.
6. `app/page.tsx` and `app/explore/page.tsx` — Pass granular location parameters to `storefrontApi.searchShops`, support reset and loading skeletons.

---

## 8. Files That Should NOT Be Touched
- Backend Java modules (`backend/**`)
- Database migrations (`V1` to `V8`)
- Old frontend (`frontend/**`)
- Owner dashboard (`app/dashboard/owner/**`)
- Admin dashboard (`app/admin/**`)
- Checkout / Order placement logic (`app/checkout/**`)
- Auth architecture (`lib/auth/**`)
