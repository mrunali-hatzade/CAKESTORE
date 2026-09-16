# CAKESTORE LOOP 2 — REAL LOCATION & MARKETPLACE DISCOVERY
## IMPLEMENTATION PLAN

**Plan Status:** PENDING APPROVAL (DO NOT IMPLEMENT YET)  
**Target Codebase:** CakeStore Multi-Tenant SaaS Platform (`backend` Spring Boot & `frontend_v2` Next.js)  
**Architectural Baseline:** `CAKESTORE_LOOP_2_LOCATION_MARKETPLACE_ARCHITECTURE_AUDIT_V2.md`  
**Flyway Migration Scope:** Begins strictly with `V18` (`V1` through `V17__owner_identity_and_phone_uniqueness.sql` are immutable)  

---

## 1. EXECUTIVE SUMMARY

The objective of Loop 2 is to transform CakeStore from a platform with simulated, static location filtering into a real, production-ready, location-aware bakery discovery platform.

### What Loop 2 Accomplishes:
1. **Real Owner Location Capture:** Bakery owners during onboarding and in settings select their location through a canonical administrative hierarchy (State $\to$ District $\to$ City $\to$ Area $\to$ Pincode) and pinpoint their physical kitchen/storefront using an interactive map pin, persisting exact `latitude` and `longitude`.
2. **Real Customer Marketplace Discovery:** Customers discover bakeries via their real device GPS coordinates (with permission handling and reverse geocoding) or by selecting administrative location filters, calculating real spherical distance in kilometers.
3. **Elimination of the N+1 Query Storm:** Replaces the legacy `mapToStorefrontShopResponse` loop (which triggered 7 unbatched SQL queries per shop) with a lightweight, single-query discovery projection (`StorefrontShopSummaryDTO`).
4. **Dynamic Popular Cities:** Replaces hardcoded static arrays with a real-time, cached SQL aggregation of active bakeries by city.
5. **Data & Lifecycle Integrity:** Preserves existing non-geocoded bakeries safely via text search, guarantees tenant isolation, and maintains strict subscription lifecycle boundaries (`ShopStatus.ACTIVE` only).

---

## 2. ARCHITECTURE DECISIONS (FROM AUDIT V2)

| Decision Area | Architectural Choice | Justification |
| :--- | :--- | :--- |
| **Shop Routing** | Numeric `id` (`/shop/[id]`) | Confirmed from codebase: `shops.slug` does not exist in schema or entity. Vanity slugs are explicitly excluded from Loop 2. |
| **Geospatial Math** | Native SQL Bounding Box + Haversine | Native PostgreSQL trigonometric functions (`cos`, `sin`, `acos`, `radians`) with composite B-Tree indexing. Zero container/hosting PostGIS C-extension overhead. |
| **Map Viewer** | Leaflet.js + `react-leaflet` | Open-source, client-side, lightweight (~40KB), zero recurring licensing fees, highly customizable. |
| **Provider Decoupling** | Provider Abstraction Layer | Map tiles and geocoding services are decoupled behind configuration interfaces (`NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_GEOCODING_PROVIDER`). Zero paid providers without approval. |
| **Location Data Model** | Hybrid Reference Model | Standard 6-tier Indian hierarchy reference dataset drives cascading dropdowns and backend validation; `shops` stores indexed canonical strings. Master tables deferred. |
| **Rating Architecture** | Rating Model Preserved (No V18 Columns) | Authoritative source decision point established: `feedback` (store-level) vs `product_reviews` (verified order item). No premature `shops` columns added in Loop 2. |
| **Marketplace Projection** | `StorefrontShopSummaryDTO` | Returns only discovery card attributes. Completely strips `banners`, `businessHours`, `deliveryConfigs`, `storefrontSettings`, and `customFields` from search. |
| **Existing Data** | Safe Non-Geocoded Fallback | Bakeries with `latitude = null` remain searchable by text (`city = 'Pune'`) but are gracefully omitted from radius-based GPS sorting until self-geocoded. |

---

## 3. PHASE BREAKDOWN

Implementation is executed in 6 strictly controlled phases. Each phase must be inspected, tested, and audited before proceeding to the next:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2.1: Database Schema & Indexes (Flyway V18)                      │
│ - Create B-Tree indexes on location & status                           │
│ - Create partial composite index on (latitude, longitude)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 2.2: Backend Spatial Search & Lightweight Projection             │
│ - Implement StorefrontShopSummaryDTO projection                        │
│ - Add Haversine bounding-box repository query in ShopRepository        │
│ - Add district/area/coordinates/radiusKm to search endpoint            │
│ - Implement dynamic /locations/popular-cities endpoint with cache      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 2.3: Canonical Indian Location Dataset & Validation              │
│ - Curate 6-tier reference dataset (28 states, 8 UTs, major districts) │
│ - Implement backend location validation rules                          │
│ - Expose /locations/hierarchy reference endpoint                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 2.4: Owner Onboarding & Settings Interactive Map Pin             │
│ - Integrate Leaflet map picker in onboarding Step 3                    │
│ - Update Owner Settings with map pin editor & coordinate backfill      │
│ - Pass district, area, lat, lng in authApi.register() & updateShop()   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 2.5: Customer Marketplace Real GPS & Cascading Filter            │
│ - Replace fake setTimeout in AdvancedLocationFilter with navigator GPS │
│ - Add reverse geocoding with client-side rate limiting & session cache │
│ - Connect explore/page.tsx to dynamic popular cities & distance sorting│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 2.6: Verification, Performance Benchmark & Full Test Suite       │
│ - Run EXPLAIN ANALYZE on 1,000 synthetic shop benchmark dataset        │
│ - Execute full backend test suite (321 existing + new tests)           │
│ - Verify zero regressions across Phase 0 & Phase 1                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. PHASE 2.1 — DATABASE CHANGES (FLYWAY V18)

### 4.1 Exact Proposed Migration: `V18__location_indexes_and_spatial_search.sql`
Location: `backend/src/main/resources/db/migration/V18__location_indexes_and_spatial_search.sql`

```sql
-- ====================================================================
-- CakeStore Flyway Migration V18
-- Module: Real Location & Marketplace Discovery
-- Description: Composite B-Tree indexes for location and spatial bounding-box search
-- ====================================================================

-- 1. B-Tree Indexes for Location Filtering and Dynamic Aggregation
CREATE INDEX IF NOT EXISTS idx_shops_status_city 
    ON shops(status, city) 
    WHERE city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shops_status_state 
    ON shops(status, state) 
    WHERE state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shops_district 
    ON shops(district) 
    WHERE district IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shops_pincode 
    ON shops(pincode) 
    WHERE pincode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shops_area 
    ON shops(area) 
    WHERE area IS NOT NULL;

-- 2. Partial Composite Index for Spatial Bounding-Box Lookups
-- Restricting index to ACTIVE shops with valid coordinates keeps the index tiny and ultra-fast
CREATE INDEX IF NOT EXISTS idx_shops_active_lat_lng 
    ON shops(latitude, longitude) 
    WHERE status = 'ACTIVE' AND latitude IS NOT NULL AND longitude IS NOT NULL;
```

### 4.2 Database Safety & Rollback Considerations
- **No Column Deletions or Renames:** All existing columns (`city`, `state`, `pincode`, `latitude`, `longitude`, `address`, `address_line_1`) remain completely untouched.
- **No Rating Columns in V18:** As decided in Audit V2, `rating_average` and `rating_count` will **not** be added until the authoritative rating model is finalized.
- **Rollback SQL:**
  ```sql
  DROP INDEX IF EXISTS idx_shops_active_lat_lng;
  DROP INDEX IF EXISTS idx_shops_area;
  DROP INDEX IF EXISTS idx_shops_pincode;
  DROP INDEX IF EXISTS idx_shops_district;
  DROP INDEX IF EXISTS idx_shops_status_state;
  DROP INDEX IF EXISTS idx_shops_status_city;
  ```

---

## 5. PHASE 2.2 — BACKEND LOCATION & SEARCH

### 5.1 DTO Definitions
Create `backend/src/main/java/com/cakeplatform/api/modules/storefront/dto/StorefrontShopSummaryDTO.java`:
```java
package com.cakeplatform.api.modules.storefront.dto;

import com.cakeplatform.api.modules.shop.BusinessType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorefrontShopSummaryDTO {
    private Long id;
    private String businessName;
    private String description;
    private BusinessType businessType;
    private String businessCategory;
    private String logoUrl;
    private String coverImageUrl;
    private String addressLine1;
    private String area;
    private String city;
    private String district;
    private String state;
    private String pincode;
    private Double latitude;
    private Double longitude;
    private Double distanceKm;
    private String verificationStatus;
    private Double averageRating;
    private Long totalReviews;
    private Boolean isPureVeg;
}
```

Create `backend/src/main/java/com/cakeplatform/api/modules/storefront/dto/PopularCityDTO.java`:
```java
package com.cakeplatform.api.modules.storefront.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PopularCityDTO {
    private String cityName;
    private String stateName;
    private Long activeBakeryCount;
}
```

### 5.2 `ShopRepository.java` Extensions
Add spatial and projection queries:
```java
// 1. Dynamic Popular Cities Query
@Query("SELECT new com.cakeplatform.api.modules.storefront.dto.PopularCityDTO(" +
       "s.city, s.state, COUNT(s.id)) " +
       "FROM Shop s " +
       "WHERE s.status = com.cakeplatform.api.modules.shop.ShopStatus.ACTIVE " +
       "  AND s.city IS NOT NULL AND TRIM(s.city) <> '' " +
       "GROUP BY s.city, s.state " +
       "ORDER BY COUNT(s.id) DESC, s.city ASC")
List<PopularCityDTO> findPopularCities(org.springframework.data.domain.Pageable pageable);

// 2. Native Spatial Haversine Query with Bounding-Box Pre-Filter
@Query(value = "SELECT s.id, s.business_name, s.description, s.business_type, s.business_category, " +
       "s.logo_url, s.cover_image_url, s.address_line_1, s.area, s.city, s.district, s.state, s.pincode, " +
       "s.latitude, s.longitude, s.verification_status, " +
       "(6371 * acos(least(1.0, greatest(-1.0, " +
       "  cos(radians(:lat0)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(:lon0)) + " +
       "  sin(radians(:lat0)) * sin(radians(s.latitude)) " +
       ")))) AS distance_km " +
       "FROM shops s " +
       "WHERE s.status = 'ACTIVE' " +
       "  AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL " +
       "  AND s.latitude BETWEEN :minLat AND :maxLat " +
       "  AND s.longitude BETWEEN :minLon AND :maxLon " +
       "HAVING (6371 * acos(least(1.0, greatest(-1.0, " +
       "  cos(radians(:lat0)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(:lon0)) + " +
       "  sin(radians(:lat0)) * sin(radians(s.latitude)) " +
       ")))) <= :radiusKm " +
       "ORDER BY distance_km ASC",
       countQuery = "SELECT count(s.id) FROM shops s " +
       "WHERE s.status = 'ACTIVE' " +
       "  AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL " +
       "  AND s.latitude BETWEEN :minLat AND :maxLat " +
       "  AND s.longitude BETWEEN :minLon AND :maxLon " +
       "HAVING (6371 * acos(least(1.0, greatest(-1.0, " +
       "  cos(radians(:lat0)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(:lon0)) + " +
       "  sin(radians(:lat0)) * sin(radians(s.latitude)) " +
       ")))) <= :radiusKm",
       nativeQuery = true)
Page<Object[]> findNearbyActiveShops(
       @Param("lat0") double lat0,
       @Param("lon0") double lon0,
       @Param("minLat") double minLat,
       @Param("maxLat") double maxLat,
       @Param("minLon") double minLon,
       @Param("maxLon") double maxLon,
       @Param("radiusKm") double radiusKm,
       Pageable pageable);
```

### 5.3 `CustomerStorefrontController.java` Updates
Update endpoint mapping to support spatial parameters and return lightweight DTOs:
```java
@GetMapping("/search")
public ResponseEntity<Page<StorefrontShopSummaryDTO>> searchShops(
        @RequestParam(required = false) String state,
        @RequestParam(required = false) String district,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) String area,
        @RequestParam(required = false) String businessType,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String location,
        @RequestParam(required = false) Double latitude,
        @RequestParam(required = false) Double longitude,
        @RequestParam(required = false, defaultValue = "15.0") Double radiusKm,
        @RequestParam(required = false, defaultValue = "DEFAULT") String sortBy,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
)
```

Add dynamic popular cities endpoint:
```java
@GetMapping("/locations/popular-cities")
public ResponseEntity<List<PopularCityDTO>> getPopularCities(
        @RequestParam(defaultValue = "12") int limit
) {
    return ResponseEntity.ok(storefrontService.getPopularCities(limit));
}
```

### 5.4 Parameter Validation
In `CustomerStorefrontService.java`:
```java
if (latitude != null || longitude != null) {
    if (latitude == null || longitude == null) {
        throw new IllegalArgumentException("Both latitude and longitude must be provided for nearby search.");
    }
    if (latitude < -90.0 || latitude > 90.0) {
        throw new IllegalArgumentException("Latitude must be between -90.0 and 90.0.");
    }
    if (longitude < -180.0 || longitude > 180.0) {
        throw new IllegalArgumentException("Longitude must be between -180.0 and 180.0.");
    }
    if (radiusKm == null || radiusKm <= 0.0 || radiusKm > 100.0) {
        radiusKm = 15.0; // Enforce safe defaults
    }
}
```

---

## 6. PHASE 2.3 — CANONICAL INDIAN LOCATION DATA

### 6.1 Reference Dataset Strategy
Instead of importing an unmanageable dataset of 150,000+ postal villages:
1. **Source of Truth:** Official Indian Local Government Directory (LGD) / Census administrative divisions.
2. **Format & Location:** A structured JSON catalog: `frontend_v2/lib/constants/indianAdministrativeHierarchy.json` and a corresponding backend reference service `com.cakeplatform.api.modules.location.LocationReferenceService`.
3. **Hierarchy Scope:**
   - **All 28 States & 8 Union Territories** (Tier 2).
   - **Major Commercial Districts** (Tier 3) across top states (Maharashtra, Karnataka, Delhi NCR, Tamil Nadu, Telangana, Gujarat, etc.).
   - **Key Municipal Corporations & Urban Local Bodies** (Tier 4).
   - **Standard Localities / Wards** (Tier 5) for Tier-1/Tier-2 urban bakery markets.
4. **Cascading Validation:**
   - Selecting a State strictly populates only its associated Districts.
   - Selecting a District populates its associated Cities/Towns.
   - Any attempt to submit an invalid combination (e.g., `State: Gujarat` + `District: Pune`) is rejected by the backend with HTTP 400 Bad Request.

---

## 7. PHASE 2.4 — OWNER LOCATION (ONBOARDING & SETTINGS)

### 7.1 Leaflet Integration in Next.js 14 App Router
Because Leaflet requires browser `window` and `document` APIs, the map picker must be dynamically imported with SSR disabled:
`frontend_v2/components/common/LocationMapPicker.tsx`:
```tsx
'use client';

import dynamic from 'next/dynamic';

export const LocationMapPicker = dynamic(
  () => import('./LocationMapPickerClient').then((mod) => mod.LocationMapPickerClient),
  { ssr: false, loading: () => <div className="h-64 w-full bg-brand-cream/50 animate-pulse rounded-2xl flex items-center justify-center text-brand-muted text-xs">Loading Interactive Map...</div> }
);
```

### 7.2 Onboarding Step 3 Redesign (`frontend_v2/app/onboarding/page.tsx`)
1. **Cascading Selection:**
   - Replaces `<datalist>` inputs with cascading `<Select>` components: State $\to$ District $\to$ City.
   - Provides free-form input for `Area / Locality` and `Street Address (Line 1 & 2)`.
   - 6-digit Pincode input with regex validation (`^[1-9][0-9]{5}$`).
2. **Interactive Pin Confirmation:**
   - Displays `LocationMapPicker`.
   - "Locate Kitchen via GPS" button centers the map on the owner's current position.
   - Owner can drag the marker to their exact entrance.
   - Dragging the pin updates `latitude` and `longitude` form state.
3. **Payload Submission:**
   - `authApi.register()` sends: `addressLine1`, `addressLine2`, `area`, `city`, `district`, `state`, `pincode`, `latitude`, `longitude`.

### 7.3 Owner Settings Update (`frontend_v2/app/dashboard/owner/settings/page.tsx`)
- Adds `LocationMapPicker` to the Profile Settings tab.
- Displays an alert banner for bakeries with null coordinates:
  > **Notice:** Your bakery does not have a map location set. Pin your location on the map below so local customers can discover you via nearby searches.
- Saving profile updates coordinates and address fields via `ownerApi.updateShopSettings()`.

---

## 8. PHASE 2.5 — CUSTOMER LOCATION & MARKETPLACE

### 8.1 Real Geolocation & Reverse Geocoding Hook
Create `frontend_v2/lib/hooks/useGeolocation.ts`:
1. Requests permission via `navigator.geolocation.getCurrentPosition`.
2. Handles permission states gracefully (`denied`, `prompt`, `granted`, `unavailable`, `timeout`).
3. If permission granted: captures `latitude` and `longitude` (high accuracy mode).
4. Invokes reverse geocoding via the configured provider abstraction:
   - Queries `GET /api/customer/locations/reverse-geocode?lat=...&lng=...` or client-side Nominatim adapter with a custom User-Agent and local `sessionStorage` cache.
   - Resolves City and Locality names.
   - Updates `AdvancedLocationFilter` active selection without user intervention.

### 8.2 Provider Abstraction Specification
Create `frontend_v2/lib/services/geocoding/`:
- `interface GeocodingProvider`:
  - `reverseGeocode(lat: number, lng: number): Promise<ResolvedLocation>`
  - `forwardGeocode(query: string): Promise<Coordinates>`
- **Default Implementation:** `NominatimProvider` (includes 1-request-per-second throttling and session caching).
- **Environment Switch:** `process.env.NEXT_PUBLIC_GEOCODING_PROVIDER` (`nominatim` | `custom`).

### 8.3 `explore/page.tsx` Integration
1. Accepts query params: `latitude`, `longitude`, `radiusKm`, `sortBy`.
2. Displays distance badge on `BakeryCard.tsx`: e.g. `📍 3.2 km away`.
3. Replaces static `INDIAN_POPULAR_CITIES` with real data fetched from `/api/storefront/shops/locations/popular-cities`.

---

## 9. API CONTRACTS (EXACT SPECIFICATIONS)

### 9.1 Marketplace Search Endpoint
```http
GET /api/storefront/shops/search?city=Pune&latitude=18.5204&longitude=73.8567&radiusKm=15&page=0&size=20&sortBy=DISTANCE_ASC
```
**Response (200 OK):**
```json
{
  "content": [
    {
      "id": 14,
      "businessName": "Vanilla Bean Confections",
      "description": "Handcrafted Belgian chocolate gateaux and artisanal entremets.",
      "businessType": "HOME_BAKER",
      "businessCategory": "Custom Cake Studio",
      "logoUrl": "https://img.cakestore.in/logos/14.png",
      "coverImageUrl": "https://img.cakestore.in/banners/14.png",
      "addressLine1": "Shop 4, Rosewood Enclave",
      "area": "Kothrud",
      "city": "Pune",
      "district": "Pune",
      "state": "Maharashtra",
      "pincode": "411038",
      "latitude": 18.5074,
      "longitude": 73.8077,
      "distanceKm": 2.4,
      "verificationStatus": "VERIFIED",
      "averageRating": 4.8,
      "totalReviews": 38,
      "isPureVeg": false
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20
  },
  "totalElements": 1,
  "totalPages": 1
}
```

### 9.2 Dynamic Popular Cities Endpoint
```http
GET /api/storefront/shops/locations/popular-cities?limit=12
```
**Response (200 OK):**
```json
[
  {
    "cityName": "Pune",
    "stateName": "Maharashtra",
    "activeBakeryCount": 42
  },
  {
    "cityName": "Bengaluru",
    "stateName": "Karnataka",
    "activeBakeryCount": 31
  }
]
```

### 9.3 Location Administrative Hierarchy Endpoint
```http
GET /api/storefront/shops/locations/hierarchy?state=Maharashtra&district=Pune
```
**Response (200 OK):**
```json
{
  "state": "Maharashtra",
  "district": "Pune",
  "cities": ["Pune Municipal Corporation", "Pimpri-Chinchwad Municipal Corporation", "Haveli"],
  "commonAreas": ["Kothrud", "Akurdi", "Baner", "Wakad", "Viman Nagar", "Hinjawadi", "Kalyani Nagar"]
}
```

---

## 10. RATING ARCHITECTURE DECISION POINT

### 10.1 Evaluation Framework
CakeStore has two rating-related tables in its schema:
1. `feedback` (`V6__feedback_and_enquiries.sql`): Store-level feedback submitted directly against a bakery (`shop_id`), moderated via `is_approved`.
2. `product_reviews` (`V11__product_reviews.sql`): Verified purchase reviews submitted for individual products (`order_item_id`, `product_id`), tied to orders.

### 10.2 Decision Point Strategy
- **Loop 2 Execution Boundary:** Do **NOT** add aggregate rating columns (`rating_average`, `rating_count`) to `shops` in migration `V18`.
- In Loop 2, marketplace cards will continue displaying ratings computed from approved store `feedback`.
- **Future Loop Rating Finalization:** Prior to adding materialized columns on `shops`, a dedicated product review reconciliation RFC will determine whether bakery rating should be:
  - Option A: Pure Store Feedback average.
  - Option B: Aggregate mean of all verified Product Reviews for products sold by that shop.
  - Option C: A weighted composite formula:
    $$\text{Rating} = 0.6 \times \text{ProductReviewMean} + 0.4 \times \text{FeedbackMean}$$

---

## 11. EXISTING DATA MIGRATION & SAFETY STRATEGY

1. **Zero Data Loss Guarantee:** Migrations will not modify or delete any existing user, shop, or location record.
2. **Handling Null Coordinates:**
   - Existing bakeries with valid `city`, `state`, and `pincode` continue to be returned for text queries (`city = 'Pune'`).
   - Radius-based queries explicitly check `WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL`.
   - Existing bakeries will not cause `NullPointerException` or invalid distance outputs.
3. **Self-Service Backfill:**
   - Bakery owners are guided via an in-app notice on their dashboard settings to save their exact map pin.
   - Upon saving, `latitude`, `longitude`, `district`, and `area` are updated cleanly.

---

## 12. SECURITY & MULTI-TENANT CONSIDERATIONS

1. **Tenant Isolation:**
   - Public marketplace search queries only return public store identity fields.
   - Private owner fields (passwords, bank accounts, owner mobile numbers, FSSAI document files, Razorpay IDs) are strictly omitted.
2. **IDOR Prevention:**
   - Location update requests in owner settings require authenticated JWT with `ROLE_OWNER` and pass through `ShopAccessValidator.validateShopAccess(shopId)`.
3. **Input Sanitization & Coordinate Guardrails:**
   - Coordinates are constrained: $-90.0 \le \text{lat} \le 90.0$ and $-180.0 \le \text{lon} \le 180.0$.
   - Search radius is capped at $100.0\text{ km}$ to prevent denial-of-service queries.

---

## 13. SUBSCRIPTION LIFECYCLE COMPATIBILITY

- Marketplace queries enforce `WHERE s.status = 'ACTIVE'`.
- Bakeries in `PENDING` (awaiting payment), `SUSPENDED`, or `EXPIRED` status are never discoverable on the marketplace or in nearby radius results.
- Direct customer storefront routing (`/shop/[id]`) remains governed by existing Phase 1 subscription rules.

---

## 14. TESTING STRATEGY

### 14.1 Unit & Integration Tests (Backend)
1. `ShopRepositoryLocationTest.java`:
   - Verify B-Tree index utilization for city/state queries.
   - Verify native Haversine query calculations against known geographic test points (e.g., Pune to Mumbai = ~120 km; Kothrud to Baner = ~8 km).
   - Verify bakeries outside the radius are excluded.
   - Verify bakeries with null coordinates are safely excluded from spatial queries.
2. `CustomerStorefrontServiceTest.java`:
   - Verify N+1 elimination: count repository invocations during search.
   - Test spatial parameter validation (invalid lat/lng, negative radius).
   - Test dynamic popular cities caching.
3. `RegistrationLocationValidationTest.java`:
   - Test owner registration with valid coordinates.
   - Verify rejection of inconsistent administrative pairings.

### 14.2 Frontend Verification
1. Verify cascading dropdown behavior: changing State resets District; changing District resets City.
2. Verify Leaflet map renders without SSR errors in Next.js 14.
3. Verify "Use My GPS" triggers actual browser geolocation prompt and updates coordinates.
4. Verify distance badge displays correctly on bakery cards (`2.4 km away`).

### 14.3 Full Regression Suite
- All **321 existing backend tests** must pass without regression:
  ```bash
  mvn clean test
  ```
- Frontend production build must succeed without type or routing errors:
  ```bash
  npm run build
  ```

---

## 15. PERFORMANCE TESTING STRATEGY (BENCHMARK SPECIFICATION)

### 15.1 Benchmark Dataset
- Create a test fixture inserting **1,000 synthetic active shops** distributed across 5 major districts (Pune, Mumbai, Bengaluru, Hyderabad, Delhi) with clustered geographic coordinates.

### 15.2 Query Plan Validation
- Execute `EXPLAIN (ANALYZE, BUFFERS)` on the spatial search query:
  - Verify execution uses `idx_shops_active_lat_lng`.
  - Confirm zero sequential table scans (`Seq Scan on shops`) for spatial searches.
  - Verify execution plans for `findPopularCities` use `idx_shops_status_city`.

### 15.3 Target Measurable Performance Metric
- **Query Count:** Exactly **1 query** for paginated shop results + **1 count query**, regardless of page size (10, 20, or 50).
- **Latency Target:** 95th percentile (P95) response time $< 50\text{ms}$ under local benchmark conditions on a warm JVM.

---

## 16. FILES TO MODIFY & PRESERVE

### Files to Modify:
1. `backend/src/main/resources/db/migration/V18__location_indexes_and_spatial_search.sql` [NEW]
2. `backend/src/main/java/com/cakeplatform/api/modules/shop/ShopRepository.java`
3. `backend/src/main/java/com/cakeplatform/api/modules/shop/ShopSpecification.java`
4. `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontController.java`
5. `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontService.java`
6. `backend/src/main/java/com/cakeplatform/api/modules/storefront/dto/StorefrontShopSummaryDTO.java` [NEW]
7. `backend/src/main/java/com/cakeplatform/api/modules/storefront/dto/PopularCityDTO.java` [NEW]
8. `frontend_v2/package.json` (Add `leaflet`, `react-leaflet`, `@types/leaflet`)
9. `frontend_v2/app/onboarding/page.tsx`
10. `frontend_v2/app/dashboard/owner/settings/page.tsx`
11. `frontend_v2/components/common/LocationMapPicker.tsx` [NEW]
12. `frontend_v2/components/common/LocationMapPickerClient.tsx` [NEW]
13. `frontend_v2/components/customer/marketplace/AdvancedLocationFilter.tsx`
14. `frontend_v2/components/customer/marketplace/BakeryCard.tsx`
15. `frontend_v2/app/explore/page.tsx`
16. `frontend_v2/lib/constants/indianLocations.ts`
17. `frontend_v2/lib/constants/indianAdministrativeHierarchy.json` [NEW]
18. `frontend_v2/lib/api/storefront.ts`
19. `frontend_v2/lib/hooks/useGeolocation.ts` [NEW]

### Files to Preserve (DO NOT TOUCH):
1. `backend/src/main/resources/db/migration/V1__init_schema.sql` through `V17__owner_identity_and_phone_uniqueness.sql`
2. `backend/src/main/java/com/cakeplatform/api/modules/payment/**`
3. `backend/src/main/java/com/cakeplatform/api/modules/subscription/**`
4. `backend/src/main/java/com/cakeplatform/api/security/ShopAccessValidator.java`
5. `backend/src/test/java/com/cakeplatform/api/modules/auth/RegistrationIdentityIntegrityTest.java`

---

## 17. DEPENDENCIES & ENVIRONMENT VARIABLES

### Frontend Dependencies:
- `leaflet` (`^1.9.4`)
- `react-leaflet` (`^4.2.1`)
- `@types/leaflet` (`^1.9.12`)

### Environment Variables:
- `NEXT_PUBLIC_MAP_TILE_URL`: Defaults to `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- `NEXT_PUBLIC_MAP_ATTRIBUTION`: Defaults to `&copy; OpenStreetMap contributors`
- `NEXT_PUBLIC_GEOCODING_PROVIDER`: Defaults to `nominatim`

---

## 18. RISKS & ROLLBACK STRATEGY

| Risk | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Next.js SSR Leaflet Window Crash** | Medium | High | Use `next/dynamic` with `ssr: false` for all Leaflet map client wrappers. |
| **Browser GPS Permission Denied** | High | Low | UI falls back seamlessly to cascading State/City dropdowns. |
| **Nominatim Public Rate Limiting** | Medium | Medium | Implement client-side 1-second debouncing, session caching, and fallback to manual pin placement. |
| **Trigonometric Precision Drift** | Low | Low | Wrap dot product in `least(1.0, greatest(-1.0, ...))` to prevent NaN in `acos`. |

### Rollback Strategy per Phase:
- **Phase 2.1:** Drop indexes created in `V18` (see Section 4.2).
- **Phase 2.2:** Revert `CustomerStorefrontController` and `CustomerStorefrontService` to standard specification queries.
- **Phase 2.4/2.5:** Fall back to text-based inputs if map rendering encounters client errors.

---

## 19. ACCEPTANCE CRITERIA PER PHASE

- **Phase 2.1:** Flyway migration `V18` applies cleanly; B-Tree and spatial indexes are created and verified.
- **Phase 2.2:** `StorefrontShopSummaryDTO` returns search results in a single query; Haversine bounding-box calculation accurately computes distance; popular cities endpoint returns real active bakery counts.
- **Phase 2.3:** Canonical Indian hierarchy prevents invalid State/District combinations.
- **Phase 2.4:** Onboarding Step 3 allows pin placement; saving stores exact `latitude` and `longitude`; Owner Settings allows location editing and displays coordinate backfill alert.
- **Phase 2.5:** "Use My GPS" triggers real browser geolocation; bakery cards display calculated distance; popular cities reflect database distribution; mock data completely pruned from search.
- **Phase 2.6:** Benchmark suite passes with P95 $< 50\text{ms}$ on local 1,000-shop dataset; all 321 existing backend tests pass.

---

## 20. IMPLEMENTATION ORDER & STOP BOUNDARY

Following the CakeStore controlled engineering loop:
$$\text{PLAN} \longrightarrow \mathbf{STOP\ (AWAIT\ APPROVAL)} \longrightarrow \text{PHASE 2.1} \longrightarrow \text{PHASE 2.2} \longrightarrow \dots \longrightarrow \text{PHASE 2.6}$$

**IMPLEMENTATION REMAINS STRICTLY STOPPED UNTIL THIS PLAN IS APPROVED.**
