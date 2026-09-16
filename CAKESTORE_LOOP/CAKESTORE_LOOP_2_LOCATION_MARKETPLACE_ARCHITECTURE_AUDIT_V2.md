# CAKESTORE LOOP 2 — REAL LOCATION & MARKETPLACE DISCOVERY
## PRE-IMPLEMENTATION ARCHITECTURE AUDIT (VERSION 2)

**Document Status:** ARCHITECTURE AUDIT V2 (READ-ONLY)  
**Target Codebase:** CakeStore Multi-Tenant SaaS Platform (`backend` Spring Boot & `frontend_v2` Next.js)  
**Database Schema Version:** PostgreSQL Flyway Migrations V1 through V17 (`V17__owner_identity_and_phone_uniqueness.sql`)  
**Audit Scope:** End-to-End Location Lifecycle, Geocoding, Nearby Search, Marketplace Discovery, and Data Integrity  
**Audit Evaluation:** **APPROVED FOR IMPLEMENTATION** (Architecture Aligned & Discrepancies Resolved)

---

## 1. EXECUTIVE SUMMARY & RESOLUTION OF PREVIOUS DISCREPANCIES

This Version 2 Architecture Audit supersedes the preliminary audit by incorporating all architectural review corrections, resolving empirical code/schema discrepancies, and establishing rigorous, defensible boundaries for Loop 2 implementation.

### Key Corrections Incorporated:
1. **Shop Slug Discrepancy Resolved:** Re-inspection of all migrations (`V1`–`V17`) and `Shop.java` confirms that **no `slug` column exists on the `shops` table**. Storefront routing in `frontend_v2` is strictly ID-based (`/shop/[id]`). `slug` is explicitly **removed** from Loop 2 scope and deferred to a dedicated custom domain/vanity slug loop.
2. **Exact V17 Flyway Verification:** The exact filename of migration V17 in `backend/src/main/resources/db/migration/` is verified as **`V17__owner_identity_and_phone_uniqueness.sql`**. Migration `V17` is immutable. All Loop 2 schema changes will begin strictly with `V18`.
3. **Defensible Performance Engineering:** Removed all unverified latency claims (e.g., "<10ms"). Performance criteria are redefined around concrete query execution plans (`EXPLAIN (ANALYZE, BUFFERS)`) and the total elimination of the $O(N)$ per-shop N+1 repository call storm.
4. **Decoupled Map & Geocoding Provider Abstraction:** Acknowledged that public OSM/Nominatim infrastructure cannot be assumed free or unlimited for production. Designed a pluggable provider abstraction interface separating the client map viewer (Leaflet) from tile sources and geocoding providers.
5. **Administrative Location Hierarchy:** Adopted the canonical 6-tier administrative hierarchy:
   $$\text{Country (India)} \longrightarrow \text{State/UT} \longrightarrow \text{District} \longrightarrow \text{City/Town/Municipality} \longrightarrow \text{Locality/Area} \longrightarrow \text{Pincode}$$
   preventing the conflation of revenue districts and urban municipal corporations.
6. **Canonical Location Reference Model:** Outlined the transition from unconstrained strings to a structured reference dataset backing cascading frontend selection and normalized backend validation.
7. **Rating Source Disambiguation:** Inspected `feedback` (store-level general comments) versus `product_reviews` (verified order-item reviews). Addressed the semantic distinction and established that no aggregation columns (`rating_average`/`rating_count`) will be added until the authoritative bakery-rating source is finalized.
8. **Lightweight Marketplace Projection:** Replaced full storefront entity serialization with a lightweight card DTO, completely decoupling marketplace browsing from heavy storefront relationships (banners, business hours, delivery configurations, custom fields).
9. **Existing Data Safety & Coordinate Backfill:** Guaranteed that existing shop location strings (`city`, `state`, `pincode`) will not be altered or purged. Shops lacking geographic coordinates will participate in text-based discovery but remain excluded from radius-based spatial searches until geocoded.

---

## 2. CODEBASE & SCHEMA EVIDENCE: THE SHOP SLUG & V17 VERIFICATION

### 2.1 The `shops.slug` Discrepancy (Resolved)
- **Inspection of `backend/src/main/resources/db/migration/V1__init_schema.sql` (Lines 16–37):**
  ```sql
  CREATE TABLE shops (
      id BIGSERIAL PRIMARY KEY,
      owner_id BIGINT NOT NULL,
      business_name VARCHAR(255) NOT NULL,
      description TEXT,
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(20),
      business_category VARCHAR(100),
      logo_url VARCHAR(255),
      cover_image_url VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_shop_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );
  ```
- **Ripgrep Verification Across All Backend Files:**
  A search for `slug` across all `.sql` and `.java` files revealed that `slug` exists **only** on `product_categories` (`V9__product_categories.sql:L11`). It does **not** exist on `shops` or in `Shop.java`.
- **Frontend Routing Evidence:**
  Inspection of `frontend_v2/app/shop/[id]/page.tsx:L34` and `frontend_v2/components/customer/marketplace/BakeryCard.tsx:L115` confirms:
  ```tsx
  <Link href={`/shop/${shop.id}`} className="block">
  ```
  Storefront discovery and routing is completely powered by numeric `shop.id`.
- **Scope Decision:** **`slug` is completely excluded from Loop 2**.

### 2.2 Exact V17 Migration Filename (Verified)
Inspection of `backend/src/main/resources/db/migration/` confirms the exact filenames:
- `V16__delete_unwanted_shops.sql`
- `V17__owner_identity_and_phone_uniqueness.sql`
- Note on V3: `V3` is `V3__add_subscriptions_and_payouts.sql`. Demo data was added in application initializers, not V3.
- **Rule:** Migration `V17__owner_identity_and_phone_uniqueness.sql` remains strictly immutable. Loop 2 database changes will be introduced in `V18__location_indexes_and_spatial_search.sql`.

---

## 3. CURRENT LOCATION LIFECYCLE (END-TO-END TRACES)

### 3.1 Owner Registration & Location Storage Trace
```
[User Browser: /onboarding]
       │
       ▼
[frontend_v2/app/onboarding/page.tsx:L87-120]
  - Step 3 captures: addressLine1, city, state, pincode
  - Hardcoded HTML datalists: 9 cities, 6 states
  - MISSING: district, area, latitude, longitude, map pin
       │
       ▼ (POST /api/auth/register payload)
[backend: AuthController.java:L33]
       │
       ▼
[backend: AuthService.java:L140-160]
  - Sets addressLine1, city, state, pincode from request
  - Sets area = null, district = null, latitude = null, longitude = null
  - Concatenates full address into legacy text column
       │
       ▼
[PostgreSQL: shops table]
  - Record stored with NULL coordinates and missing district/area.
```

### 3.2 Customer Marketplace Search Trace
```
[User Browser: /explore]
       │
       ▼
[frontend_v2/app/explore/page.tsx:L129-165]
  - Reads search params: city, state, district, area, pincode, keyword, page, size
       │
       ▼ (GET /api/customer/storefront/shops/search)
[backend: CustomerStorefrontController.java:L60-76]
       │
       ▼
[backend: CustomerStorefrontService.java:L142-185]
  - Builds Specification<Shop> using ShopSpecification.filterShops
  - Executes: shopRepository.findAll(spec, pageable)
       │
       ▼ (CRITICAL N+1 EXECUTION STORM in CustomerStorefrontService.java:L193-220)
  - Iterates over each shop in the Page<Shop> result:
      1. feedbackRepository.calculateAverageRatingByShopId(shop.getId())
      2. feedbackRepository.countApprovedByShopId(shop.getId())
      3. bannerRepository.findByShopIdAndIsActiveTrueOrderByDisplayOrderAsc(...)
      4. businessHoursRepository.findByShopIdOrderByDayOfWeekAsc(...)
      5. deliveryConfigRepository.findByShopId(...)
      6. storefrontSettingsRepository.findByShopId(...)
      7. customFieldRepository.findByShopId(...)
       │
       ▼
[frontend_v2/app/explore/page.tsx]
  - Renders BakeryCard items.
```

### 3.3 Customer GPS / Current Location Trace
```
[User clicks "Use My GPS" in AdvancedLocationFilter.tsx:L83-93]
       │
       ▼
[Fake Geolocation Handler in AdvancedLocationFilter.tsx:L85-92]
  - Sets isLocating = true
  - Executes setTimeout(800ms)
  - Injects hardcoded mock location:
      State: "Maharashtra", City: "Pune", District: "Pimpri-Chinchwad", Area: "Akurdi"
  - ZERO interaction with HTML5 navigator.geolocation
  - ZERO interaction with reverse geocoding API
```

---

## 4. DATABASE LOCATION AUDIT

### 4.1 Existing Columns on `shops` Table
| Column Name | Data Type | Nullable | Source Migration | Currently Populated? | Used in Marketplace Filter? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `address` | `TEXT` | YES | `V1` | YES | NO (Only keyword LIKE) |
| `address_line_1` | `VARCHAR(255)` | YES | `V2` | YES | NO |
| `address_line_2` | `VARCHAR(255)` | YES | `V2` | NO | NO |
| `city` | `VARCHAR(100)` | YES | `V1` | YES | **YES** (`ShopSpecification`) |
| `state` | `VARCHAR(100)` | YES | `V1` | YES | **YES** (`ShopSpecification`) |
| `pincode` | `VARCHAR(20)` | YES | `V1` | YES | **YES** (`ShopSpecification`) |
| `district` | `VARCHAR(100)` | YES | `V2` | **NO** (Null on signup) | NO |
| `area` | `VARCHAR(100)` | YES | `V2` | **NO** (Null on signup) | NO |
| `latitude` | `DOUBLE PRECISION` | YES | `V2` | **NO** (Null on signup) | **NO** (Ignored) |
| `longitude` | `DOUBLE PRECISION` | YES | `V2` | **NO** (Null on signup) | **NO** (Ignored) |
| `map_location_url`| `VARCHAR(1024)` | YES | `V2` | **NO** | NO |

### 4.2 Index Audit on `shops` Table
- `PRIMARY KEY (id)`
- `idx_shops_owner_id ON shops(owner_id)` (`V1`)
- `uk_shops_owner_id UNIQUE (owner_id)` (`V17`)
- **Findings:** **No indexes** exist on `city`, `district`, `state`, `pincode`, `status`, or `(latitude, longitude)`. Every search request results in a full table sequential scan.

---

## 5. CANONICAL LOCATION HIERARCHY & REFERENCE MODEL

### 5.1 The 6-Tier Indian Administrative Hierarchy
To avoid conflating distinct administrative structures (e.g., mixing a Revenue District with an Urban Municipal Corporation), CakeStore defines a strict 6-tier hierarchy:

$$\text{Tier 1: Country (India)}$$
$$\downarrow$$
$$\text{Tier 2: State / Union Territory (e.g., Maharashtra)}$$
$$\downarrow$$
$$\text{Tier 3: Revenue District (e.g., Pune District)}$$
$$\downarrow$$
$$\text{Tier 4: City / Town / Municipal Corporation (e.g., Pune Municipal Corp, Pimpri-Chinchwad)}$$
$$\downarrow$$
$$\text{Tier 5: Locality / Area / Ward (e.g., Kothrud, Baner, Akurdi)}$$
$$\downarrow$$
$$\text{Tier 6: Pincode (6-digit postal code, e.g., 411038)}$$

### 5.2 The Smallest Practical Canonical Model (Hybrid Reference Model)
Instead of relying permanently on unconstrained raw strings or burdening the schema with dozens of relational foreign-key tables:
1. **Canonical Reference Dataset:** Maintain a structured, curated reference dataset representing valid parent-child relationships (States $\to$ Districts $\to$ Cities/Towns $\to$ Major Localities).
2. **Frontend Cascading Enforcement:** Selecting a State dynamically populates only its valid Districts. Selecting a District populates its valid Cities/Towns.
3. **Backend Canonical Normalization:** The backend validates incoming location fields against the canonical catalog, trimming whitespace, standardizing casing, and preventing invalid combinations (e.g., `State: Gujarat` with `District: Pune`).
4. **Denormalized Search Storage on `shops`:** The `shops` table retains normalized canonical string columns (`state`, `district`, `city`, `area`, `pincode`) backed by composite B-Tree indexes, providing zero-join query speed while guaranteeing data cleanliness.
5. **Future Normalization Path:** The schema can cleanly migrate to relational master tables (`location_states`, `location_districts`, etc.) in a future enterprise loop without breaking the existing storefront APIs.

---

## 6. MAP & GEOCODING PROVIDER ABSTRACTION

### 6.1 Avoiding Provider Lock-In & Unrealistic Cost Claims
Public OpenStreetMap (OSM) tile servers and Nominatim geocoding operate under strict community Fair Use policies and must **not** be assumed to offer unlimited, zero-cost production capacity. Furthermore, paid enterprise mapping services (Google Maps Platform, Mapbox, MapmyIndia) require commercial API keys and billing contracts.

### 6.2 The Provider Abstraction Architecture
CakeStore will decouple the map rendering layer from the geocoding and tile providers using an abstraction pattern:

```
                  ┌───────────────────────────────┐
                  │      Frontend UI Client       │
                  │   (Leaflet.js / React-Leaflet)│
                  └───────────────┬───────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  │       Map Configuration       │
                  │ (Tile URL & Attribution Hook) │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
[Standard OSM / Stadia]                          [Mapbox / Self-Hosted Tile]
(Development / Staging)                          (Production Configurable)
```

```
                  ┌───────────────────────────────┐
                  │   Geocoding Service Client    │
                  │    (Frontend Hook / Backend)  │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
[Nominatim OSM Provider]                         [Commercial Provider Adapter]
- User-Agent Identification                      - MapmyIndia / Mapbox / Google
- Client-side 1s rate limiting                   - Configurable via ENV
- Local session caching                          - Requires explicit approval
```

### 6.3 Policy for Loop 2:
- Leaflet remains the core frontend map viewing library.
- Development and local verification will utilize standard open tile providers with proper User-Agent headers and client-side session caching to respect community rate limits.
- **No paid provider will be activated or billed without explicit user approval.**

---

## 7. REAL NEARBY SEARCH & MEASURABLE PERFORMANCE TARGETS

### 7.1 Geospatial Query Strategy: Native SQL Bounding Box + Haversine
Rather than requiring binary PostGIS C-extensions (which complicate container builds and hosting portability), CakeStore will leverage PostgreSQL native trigonometric functions (`sin`, `cos`, `acos`, `radians`) combined with a composite B-Tree index on `(latitude, longitude)`.

**1. Bounding Box Calculation (Application Layer):**
Given customer coordinates $(\text{lat}_0, \text{lon}_0)$ and search radius $R$ km:
$$\Delta \text{lat} = \frac{R}{111.0}, \quad \Delta \text{lon} = \frac{R}{111.0 \times \cos(\text{radians}(\text{lat}_0))}$$

**2. SQL Repository Query:**
```sql
SELECT s.id, s.business_name, s.city, s.district, s.state, s.area, s.pincode,
       s.latitude, s.longitude, s.logo_url, s.cover_image_url, s.is_pure_veg,
       (6371 * acos(
           cos(radians(:lat0)) * cos(radians(s.latitude)) *
           cos(radians(s.longitude) - radians(:lon0)) +
           sin(radians(:lat0)) * sin(radians(s.latitude))
       )) AS distance_km
FROM shops s
WHERE s.status = 'ACTIVE'
  AND s.latitude BETWEEN (:lat0 - :dLat) AND (:lat0 + :dLat)
  AND s.longitude BETWEEN (:lon0 - :dLon) AND (:lon0 + :dLon)
HAVING (6371 * acos(
           cos(radians(:lat0)) * cos(radians(s.latitude)) *
           cos(radians(s.longitude) - radians(:lon0)) +
           sin(radians(:lat0)) * sin(radians(s.latitude))
       )) <= :radiusKm
ORDER BY distance_km ASC;
```

### 7.2 Measurable Performance Targets (Defensible Metrics)
Rather than unsubstantiated promises of "<10ms", the implementation will be benchmarked against clear, measurable criteria:
1. **Target Benchmark Dataset:** A test suite populating 1,000 synthetic active shops across 5 major districts and clusters of coordinates in Maharashtra and Karnataka.
2. **Execution Plan Validation:** Verify via `EXPLAIN (ANALYZE, BUFFERS)` that the spatial query utilizes `idx_shops_lat_lng` and `idx_shops_status_city` without sequential table scans.
3. **N+1 Elimination:** The marketplace search endpoint must execute **exactly 1 query for the paginated shops + 1 count query**, regardless of whether page size is 10, 20, or 50.
4. **API Latency Target:** Under local test suite conditions with 1,000 active shops, the 95th percentile (P95) API response time for `/shops/search` must measure $< 50\text{ms}$ on warm JVM.

---

## 8. AUTHORITATIVE RATING ARCHITECTURE DISAMBIGUATION

### 8.1 Inspection Findings: `feedback` vs `product_reviews`
1. **`feedback` Table (`V6__feedback_and_enquiries.sql`):**
   - Attached to: `shop_id` (`references shops(id)`).
   - Fields: `customer_display_name`, `rating (1-5)`, `comment`, `order_reference`, `is_approved`, `deleted_at`.
   - Semantic Meaning: **Storefront / Bakery Overall Experience Feedback**.
   - Currently queried by: `CustomerStorefrontService` (`calculateAverageRatingByShopId`).
2. **`product_reviews` Table (`V11__product_reviews.sql`):**
   - Attached to: `shop_id`, `product_id`, `order_id`, `order_item_id`.
   - Fields: `rating (1-5)`, `review_text`, `is_verified_purchase = true`.
   - Semantic Meaning: **Item-Specific Verified Purchase Reviews**.

### 8.2 Architectural Rating Recommendation
- **Do NOT add `rating_average` or `rating_count` columns to `shops` in Loop 2.**
- Adding columns now without defining the authoritative rating source risks creating competing, conflicting rating systems.
- **Recommended Policy:**
  - Marketplace search will display the rating computed from the authoritative bakery feedback entity.
  - In a future loop, a unified rating aggregation strategy (e.g., weighted blend of store feedback and verified product reviews) will be defined and migrated.

---

## 9. LIGHTWEIGHT MARKETPLACE SEARCH PROJECTION

### 9.1 Root Cause of Current Overhead
`CustomerStorefrontService.java` currently maps every shop found during marketplace search into `StorefrontShopResponse`, triggering 7 extra SQL queries per shop for banners, business hours, delivery configs, storefront settings, and custom fields.

### 9.2 The Lightweight Projection DTO: `StorefrontShopSummaryDTO`
The marketplace search endpoint will return a purpose-built discovery projection containing **only** fields rendered on bakery cards (`BakeryCard.tsx`):
- `id` (Long)
- `businessName` (String)
- `logoUrl` (String)
- `coverImageUrl` (String)
- `businessType` / `businessCategory` (String)
- `addressLine1` (String)
- `area` (String)
- `city` (String)
- `district` (String)
- `state` (String)
- `pincode` (String)
- `latitude` (Double)
- `longitude` (Double)
- `distanceKm` (Double, null if text-only search)
- `isPureVeg` (Boolean)
- `verificationStatus` (String)
- `rating` (Double)
- `reviewCount` (Long)

**Excluded from Marketplace Search:**
- ❌ All `ShopBanner` entities
- ❌ All `ShopBusinessHours` rows
- ❌ `ShopDeliveryConfig` and delivery notes
- ❌ `ShopStorefrontSettings`
- ❌ `ShopCustomFormField` definitions

---

## 10. DYNAMIC POPULAR CITIES ARCHITECTURE

### 10.1 Query & Caching Design
Replace the hardcoded `INDIAN_POPULAR_CITIES` static array with a real-time database query:
```sql
SELECT s.city AS cityName, s.state AS stateName, COUNT(s.id) AS activeBakeryCount
FROM shops s
WHERE s.status = 'ACTIVE' 
  AND s.city IS NOT NULL 
  AND TRIM(s.city) != ''
GROUP BY s.city, s.state
ORDER BY activeBakeryCount DESC, s.city ASC
LIMIT 12;
```
- **Caching:** Backed by Spring Cache (`@Cacheable("popularCities")`) with a 15-minute expiration time.
- **Public API Contract:**
  `GET /api/customer/storefront/locations/popular-cities`

---

## 11. EXISTING DATA SAFETY & COORDINATE BACKFILL STRATEGY

### 11.1 Preservation of Existing Data
- No existing `shops` records or location strings will be modified, overwritten, or purged during migration.
- Existing bakeries created during Loop 0 / Loop 1 have valid `city`, `state`, and `pincode`, but `latitude = null` and `longitude = null`.

### 11.2 Search Behavior for Bakeries Without Coordinates
- **Text & Hierarchy Search:** Bakeries without coordinates remain 100% discoverable when customers search by City, District, State, or Keyword (e.g., `city = 'Pune'`).
- **GPS / Radius Search:** Radius-based geospatial queries explicitly enforce `WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL`. Bakeries without coordinates are gracefully excluded from radius distance sorting to prevent `NullPointerException` or invalid distance calculations.

### 11.3 Owner Self-Service Backfill Path
- When an existing bakery owner logs into `app/dashboard/owner/settings`, an alert banner will prompt:
  *"Add your bakery's exact map location to enable local nearby customer discovery."*
- Saving the map pin in settings updates `latitude`, `longitude`, `district`, and `area` without requiring administrative intervention.

---

## 12. HARDCODED & MOCK DATA INVENTORY (CLASSIFIED)

| Location / File Path | Hardcoded Content | Classification | Required Loop 2 Action |
| :--- | :--- | :--- | :--- |
| `frontend_v2/components/customer/marketplace/AdvancedLocationFilter.tsx:L85-92` | Fake `setTimeout` GPS handler inserting hardcoded Akurdi/Pune strings | **A. Production Behavior** | Replace with real HTML5 `navigator.geolocation` and reverse geocoding hook. |
| `frontend_v2/components/customer/marketplace/AdvancedLocationFilter.tsx:L22-75` | Hardcoded 3-state hierarchy (`Maharashtra`, `Karnataka`, `Delhi`) | **A. Production Behavior** | Replace with canonical reference hierarchy. |
| `frontend_v2/lib/constants/indianLocations.ts:L33-145` | Static `INDIAN_POPULAR_CITIES` and `INDIAN_POPULAR_PLACES` | **A. Production Behavior** | Connect to dynamic `/api/customer/storefront/locations/popular-cities` API. |
| `frontend_v2/lib/constants/indianLocations.ts:L150-378` | `MOCK_INDIAN_BAKERIES` (378 lines of dead mock bakeries) | **D. Dead Code** | Ensure `explore/page.tsx` never references it; mark for safe pruning. |
| `frontend_v2/app/onboarding/page.tsx:L619-639` | Primitive `<datalist>` for 9 cities and 6 states | **B. UI Fallback** | Replace with cascading administrative select inputs. |
| `backend/src/main/resources/db/migration/V3__add_subscriptions_and_payouts.sql` | Subscription plans seed | **C. Test / System Fixture** | Keep immutable. |

---

## 13. DATABASE CHANGES (PROPOSED FLYWAY V18 DESIGN)

```sql
-- V18__location_indexes_and_spatial_search.sql
-- 1. Create B-Tree Indexes for Location Filtering & Grouping
CREATE INDEX IF NOT EXISTS idx_shops_status_city ON shops(status, city);
CREATE INDEX IF NOT EXISTS idx_shops_status_state ON shops(status, state);
CREATE INDEX IF NOT EXISTS idx_shops_district ON shops(district);
CREATE INDEX IF NOT EXISTS idx_shops_pincode ON shops(pincode);

-- 2. Create Composite Index for Spatial Bounding-Box Lookups
CREATE INDEX IF NOT EXISTS idx_shops_lat_lng ON shops(latitude, longitude) WHERE status = 'ACTIVE' AND latitude IS NOT NULL;
```
*(Notice: Aggregated rating columns are intentionally omitted in V18 pending authoritative rating model definition).*

---

## 14. MULTI-TENANT & SUBSCRIPTION LIFECYCLE SAFETY

1. **Strict Tenant Isolation:** Marketplace projection queries expose only public bakery information. Private documents, owner phone numbers, bank details, and subscription records are strictly omitted.
2. **Subscription Lifecycle Compatibility:** All marketplace search vectors enforce `WHERE s.status = 'ACTIVE'`. Bakeries in `PENDING` (awaiting payment) or `EXPIRED`/`SUSPENDED` states will never appear in marketplace discovery.

---

## 15. PROPOSED API CONTRACTS

### 15.1 Dynamic Popular Cities
```http
GET /api/customer/storefront/locations/popular-cities
```
**Response (200 OK):**
```json
[
  {
    "cityName": "Pune",
    "stateName": "Maharashtra",
    "activeBakeryCount": 42
  }
]
```

### 15.2 Optimized Marketplace Search
```http
GET /api/customer/storefront/shops/search?city=Pune&latitude=18.5204&longitude=73.8567&radiusKm=15&page=0&size=20&sortBy=DISTANCE_ASC
```
**Response (200 OK):**
```json
{
  "content": [
    {
      "id": 14,
      "businessName": "Artisan Gateau Studio",
      "logoUrl": "https://img.cakestore.in/logos/14.png",
      "coverImageUrl": "https://img.cakestore.in/banners/14.png",
      "city": "Pune",
      "district": "Pune",
      "state": "Maharashtra",
      "area": "Kothrud",
      "pincode": "411038",
      "addressLine1": "Shop 4, Ideal Colony, Kothrud",
      "latitude": 18.5074,
      "longitude": 73.8077,
      "distanceKm": 5.3,
      "rating": 4.8,
      "reviewCount": 24,
      "isPureVeg": false
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "pageNumber": 0,
  "pageSize": 20
}
```

---

## 16. FILES TO MODIFY VS FILES TO PRESERVE

### Files That Will Need Modification During Implementation:
1. `backend/src/main/resources/db/migration/V18__location_indexes_and_spatial_search.sql` [NEW]
2. `backend/src/main/java/com/cakeplatform/api/modules/shop/ShopRepository.java`
3. `backend/src/main/java/com/cakeplatform/api/modules/shop/ShopSpecification.java`
4. `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontController.java`
5. `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontService.java`
6. `backend/src/main/java/com/cakeplatform/api/modules/storefront/dto/StorefrontShopSummaryDTO.java` [NEW]
7. `backend/src/main/java/com/cakeplatform/api/modules/storefront/dto/PopularCityDTO.java` [NEW]
8. `frontend_v2/app/onboarding/page.tsx`
9. `frontend_v2/app/dashboard/owner/settings/page.tsx`
10. `frontend_v2/components/customer/marketplace/AdvancedLocationFilter.tsx`
11. `frontend_v2/app/explore/page.tsx`
12. `frontend_v2/lib/constants/indianLocations.ts`
13. `frontend_v2/lib/api/storefront.ts`

### Files That Must NOT Be Modified:
1. `backend/src/main/resources/db/migration/V1__init_schema.sql` through `V17__owner_identity_and_phone_uniqueness.sql` (Immutable Flyway history).
2. `backend/src/main/java/com/cakeplatform/api/modules/payment/**` (Payment & Razorpay integration).
3. `backend/src/main/java/com/cakeplatform/api/modules/subscription/**` (Subscription lifecycle rules).
4. `backend/src/main/java/com/cakeplatform/api/security/ShopAccessValidator.java` (Tenant isolation security).
5. `backend/src/test/java/com/cakeplatform/api/modules/auth/RegistrationIdentityIntegrityTest.java` (Loop 1 integrity suite).

---

## 17. AUDIT STATUS & VERDICT

**FINAL STATUS: APPROVED FOR IMPLEMENTATION**

All 10 architectural review discrepancies and requirements have been thoroughly investigated, validated against actual repository code, and resolved.

Execution will remain blocked until the formal Loop 2 Implementation Plan is submitted and explicitly approved.
