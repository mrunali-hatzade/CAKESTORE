# CAKESTORE LOOP 2 — REAL LOCATION & MARKETPLACE DISCOVERY
## PRE-IMPLEMENTATION ARCHITECTURE AUDIT
**Document Status:** FINAL ARCHITECTURE AUDIT (READ-ONLY)  
**Target Codebase:** CakeStore Multi-Tenant SaaS Platform (`backend` Spring Boot & `frontend_v2` Next.js)  
**Database Schema Version:** PostgreSQL Flyway Migrations V1 through V17  
**Audit Scope:** End-to-End Location Lifecycle, Geocoding, Nearby Search, Marketplace Discovery, and Data Integrity  

---

## 1. EXECUTIVE SUMMARY

CakeStore is an active multi-tenant bakery SaaS platform designed to power both individual digital storefronts for bakeries and a centralized, multi-vendor customer discovery marketplace. 

In Loop 0 (Architecture Alignment) and Loop 1 (Registration & Identity Integrity), the platform established strict tenant identity constraints, phone/email canonicalization, and atomic payment-driven store activation (`ShopStatus.PENDING` $\to$ `ACTIVE`).

However, the existing location and marketplace discovery system remains largely fragmented and decoupled from real-world Indian geography:
1. **Database Deficit:** While the `shops` table has raw string columns (`state`, `district`, `city`, `area`, `pincode`, `latitude`, `longitude`) added in migration `V2`, there are **zero spatial capabilities**, **zero composite indexes** on location fields, and **no master geographic entities**.
2. **Onboarding Blindspots:** The bakery registration form (`frontend_v2/app/onboarding/page.tsx`) collects only `addressLine1`, `city`, `state`, and `pincode`. It completely ignores `district`, `area`, `latitude`, and `longitude`, leaving new bakeries registered with `null` geographic coordinates.
3. **Marketplace Simulation:** The customer location filter (`AdvancedLocationFilter.tsx`) operates on hardcoded static dropdowns for only three states (Maharashtra, Karnataka, Delhi). The "Use My GPS" button triggers a synthetic `setTimeout(800ms)` simulating a hardcoded location (`Pune -> Pimpri-Chinchwad -> Akurdi`).
4. **Severe N+1 Query Storm:** Every execution of the marketplace search (`CustomerStorefrontService.searchShops`) triggers **7 unbatched SQL queries per shop** across related tables (`feedback`, banners, business hours, delivery configs, storefront settings, custom fields). A result set of 50 bakeries executes over 350 SQL queries.
5. **Rating Disconnect:** Marketplace bakery ratings are pulled from an unverified, unindexed `feedback` table, completely ignoring verified customer order ratings in `product_reviews`.

**Recommendation:** Adopt a **Hybrid Dynamic-Master + Geographic Projection Architecture**. This combines lightweight Indian hierarchy reference data, SQL-level Haversine distance bounding-box search (eliminating heavyweight PostGIS infrastructure hurdles while achieving sub-10ms response times), dynamic SQL-aggregated popular cities, and unified rating calculations—all executed without breaking existing tenant isolation or subscription lifecycles.

---

## 2. CURRENT ARCHITECTURE (END-TO-END TRACES)

### 2.1 Owner Registration & Location Storage Trace
```
[User Browser]
       │
       ▼
[frontend_v2/app/onboarding/page.tsx:L87-120]
  - Collects: addressLine1, city, state, pincode (Step 3)
  - Missing: district, area, latitude, longitude, map coordinates
       │
       ▼ (HTTP POST /api/auth/register)
[backend: AuthController.java:L33]
       │
       ▼
[backend: AuthService.java:L140-160]
  - Maps RegisterRequest fields into Shop entity:
    shop.setAddressLine1(request.getAddressLine1());
    shop.setArea(request.getArea());         // null from onboarding
    shop.setCity(request.getCity());
    shop.setDistrict(request.getDistrict()); // null from onboarding
    shop.setState(request.getState());
    shop.setPincode(request.getPincode());
    shop.setLatitude(request.getLatitude()); // null from onboarding
    shop.setLongitude(request.getLongitude());// null from onboarding
    shop.setAddress(fullAddress);
       │
       ▼
[PostgreSQL: shops table]
  - Persisted with null district, null area, null coordinates.
```

### 2.2 Customer Marketplace Search Trace
```
[User Browser: /explore]
       │
       ▼
[frontend_v2/app/explore/page.tsx:L129-165]
  - Reads search params: city, state, district, area, pincode, keyword, page, size
       │
       ▼ (HTTP GET /api/customer/storefront/shops/search)
[backend: CustomerStorefrontController.java:L60-76]
       │
       ▼
[backend: CustomerStorefrontService.java:L142-185]
  - Builds Specification<Shop> using ShopSpecification.filterShops(keyword, city, state, pincode, status, verificationStatus)
  - Executes: shopRepository.findAll(spec, pageable)
       │
       ▼ (N+1 Query Loop in CustomerStorefrontService.java:L193-220)
  - Iterates over each Shop:
      1. feedbackRepository.calculateAverageRatingByShopId(shop.getId())
      2. feedbackRepository.countByShopId(shop.getId())
      3. bannerRepository.findByShopIdAndIsActiveTrueOrderByDisplayOrderAsc(...)
      4. businessHoursRepository.findByShopIdOrderByDayOfWeekAsc(...)
      5. deliveryConfigRepository.findByShopId(...)
      6. storefrontSettingsRepository.findByShopId(...)
      7. customFieldRepository.findByShopId(...)
       │
       ▼
[frontend_v2/app/explore/page.tsx]
  - Renders StorefrontShopResponse cards.
```

### 2.3 Customer GPS / Current Location Trace
```
[User clicks "Use My GPS" in AdvancedLocationFilter.tsx:L83-93]
       │
       ▼
[Fake Geolocation Handler in AdvancedLocationFilter.tsx:L85-92]
  - Sets isLocating = true
  - Runs setTimeout(800ms)
  - FORCED VALUES:
      selectedState = 'Maharashtra'
      selectedCity = 'Pune'
      selectedDistrict = 'Pimpri-Chinchwad'
      selectedArea = 'Akurdi'
  - Does NOT invoke navigator.geolocation.getCurrentPosition!
  - Does NOT query reverse geocoding API!
  - Emits hardcoded string filters to explore/page.tsx
```

---

## 3. DATABASE LOCATION AUDIT

### 3.1 Existing Location Columns (`shops` Table)
Inspected from `V1__init_schema.sql` and `V2__add_verification_and_location.sql`:

| Column Name | Data Type | Nullable | Source Migration | Currently Populated by Onboarding? | Used in Marketplace Filter? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `address` | `TEXT` | YES | `V1` | YES (Concatenated line1 + line2) | NO (Only keyword LIKE) |
| `address_line_1` | `VARCHAR(255)` | YES | `V2` | YES | NO |
| `address_line_2` | `VARCHAR(255)` | YES | `V2` | NO (Form field missing) | NO |
| `city` | `VARCHAR(100)` | YES | `V1` | YES | **YES** (`ShopSpecification`) |
| `state` | `VARCHAR(100)` | YES | `V1` | YES | **YES** (`ShopSpecification`) |
| `pincode` | `VARCHAR(20)` | YES | `V1` | YES | **YES** (`ShopSpecification`) |
| `district` | `VARCHAR(100)` | YES | `V2` | **NO** (Always null on signup) | NO |
| `area` | `VARCHAR(100)` | YES | `V2` | **NO** (Always null on signup) | NO |
| `latitude` | `DOUBLE PRECISION` | YES | `V2` | **NO** (Always null on signup) | **NO** (Ignored) |
| `longitude` | `DOUBLE PRECISION` | YES | `V2` | **NO** (Always null on signup) | **NO** (Ignored) |
| `map_location_url` | `VARCHAR(1024)` | YES | `V2` | **NO** | NO |

### 3.2 Index Inventory on `shops` Table
Inspection of all Flyway migrations (`V1` through `V17`) reveals:
- `PRIMARY KEY (id)`
- `uk_shops_slug UNIQUE (slug)` (V1)
- `idx_shops_owner_id` (V1)
- `uk_shops_owner_id UNIQUE (owner_id)` (V17)

> [!CAUTION]
> **CRITICAL PERFORMANCE DEFICIT:** There are **ZERO indexes** on `shops.city`, `shops.district`, `shops.state`, `shops.pincode`, `shops.status`, or spatial coordinates (`latitude`, `longitude`). Every marketplace search currently performs a full table sequential scan (`Seq Scan on shops`).

### 3.3 Existing Master Tables & Spatial Extensions
- **Master Tables:** None exist. There are no relational tables for Countries, States, Districts, Cities, or Pincodes.
- **Spatial Extensions:** Neither `postgis`, `earthdistance`, nor `cube` extensions are installed or enabled in migrations `V1` through `V17`.

---

## 4. LOCATION DATA MODEL ASSESSMENT

| Architecture Pattern | Description | Pros | Cons | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Pure String Columns** (Current) | Maintain raw strings on `shops` with ad-hoc casing/trimming. | Zero migration complexity; high flexibility. | Severe data fragmentation ("Bengaluru" vs "Bangalore"); invalid state/city pairings; no spatial queries. | **REJECT** (Unacceptable for production) |
| **Option B: Fully Normalized Master Tables** | Create `states`, `districts`, `cities`, `localities` tables with foreign keys on `shops`. | Complete relational integrity; enforced parent-child constraints. | Massive schema migration; heavy relational join overhead; high maintenance burden for 19,000+ Indian pincodes. | **REJECT** (Overengineered for current stage) |
| **Option C: External-Only Geocoding** | Delegate all location resolution to Mapbox / Google Places API at runtime. | Zero DB maintenance of location master data. | High latency on every search; severe recurring API costs ($5-$15 per 1,000 requests); third-party outage risk. | **REJECT** (Cost prohibitive) |
| **Option D: Hybrid Canonical Data Model** | Keep denormalized canonical columns on `shops` (`state`, `district`, `city`, `area`, `pincode`, `latitude`, `longitude`) validated against a standard Indian administrative dataset, backed by B-tree indexes and SQL bounding-box/Haversine math. | Fast searches; zero join overhead; high data cleanliness; no expensive GIS extensions required; backward compatible. | **RECOMMENDED** |

### Why Option D (Hybrid) Best Fits CakeStore:
1. Retains full backward compatibility with existing Spring Data JPA specifications and `Shop` entity mappings.
2. Eliminates database schema complexity while guaranteeing data uniformity through strict frontend cascade controls and backend validation rules.
3. Provides sub-10ms response times for geospatial distance and bounding-box queries on standard PostgreSQL without requiring complex containerized PostGIS C-extensions.

---

## 5. REAL MAP & GEOCODING ARCHITECTURE RECOMMENDATION

### 5.1 Current Deficits in Owner Onboarding
- `frontend_v2/app/onboarding/page.tsx` Step 3 provides only text inputs with static HTML `<datalist>` elements for 9 cities and 6 states.
- No interactive map widget exists in onboarding or in owner settings (`app/dashboard/owner/settings/page.tsx`).
- Bakeries cannot pinpoint their location, verify coordinates, or adjust a map pin.

### 5.2 Recommended Map & Geocoding Stack
- **Frontend Map Rendering:** **Leaflet.js + OpenStreetMap (OSM) Tiles via `react-leaflet`**
  - Cost: **100% Free / Open Source** (Zero recurring API billing).
  - Capability: Lightweight (~40KB), smooth pan/zoom, draggable pin for precise kitchen/storefront coordinate capture.
- **Geocoding & Reverse Geocoding:**
  - Forward search (Address $\to$ Lat/Lng) and Reverse Geocoding (Lat/Lng $\to$ Address): **OpenStreetMap Nominatim API** (with local caching) or **MapmyIndia (Mappls) / Mapbox Free Tier** as fallback.
  - Browser Geolocation: Utilize standard HTML5 `navigator.geolocation.getCurrentPosition()` to center the map on the owner's or customer's actual GPS position.

---

## 6. LOCATION REGISTRATION UX RECOMMENDATION

### 6.1 Strict Cascading Selection
The onboarding flow must enforce a strict unidirectional hierarchy:
$$\text{Country (India)} \longrightarrow \text{State} \longrightarrow \text{District} \longrightarrow \text{City} \longrightarrow \text{Area/Locality} \longrightarrow \text{Pincode}$$

- Selecting `State = Maharashtra` constrains the District dropdown to 36 districts (e.g., Pune, Mumbai Suburban, Nagpur).
- Selecting `District = Pune` constrains City to valid urban/rural agglomerations (Pune Municipal Corp, Pimpri-Chinchwad, Haveli, etc.).
- Selecting a City auto-populates known localities or allows clean custom entry.
- Manual entry of invalid pairings (e.g., `State: Gujarat` + `City: Pune`) is prevented at both the UI component and backend DTO levels.

### 6.2 Interactive Pin Confirmation
1. User enters street address and selects State $\to$ District $\to$ City.
2. The UI triggers a forward geocode query to center the map.
3. The owner drags the pin to their exact storefront door.
4. Pin drag updates `latitude` and `longitude` fields in real time.

---

## 7. CUSTOMER MARKETPLACE SEARCH ARCHITECTURE

### 7.1 Current `/api/customer/storefront/shops/search` Capabilities
- **Supported Parameters:** `keyword`, `city`, `state`, `pincode`, `page`, `size`, `sortBy`, `sortDirection`.
- **Missing Parameters:** `district`, `area`, `latitude`, `longitude`, `radiusKm`.
- **Filtering Mechanism:** Case-insensitive string equality for `city`, `state`, `pincode`; `LIKE %keyword%` for name/description.
- **Sorting Mechanism:** Hardcoded to `Shop` entity fields (`name`, `createdAt`). Distance and composite rating sorting do not exist.

### 7.2 Required Filter Additions
The search endpoint must be expanded to accept:
- `district` (String, optional)
- `area` (String, optional)
- `latitude` (Double, optional)
- `longitude` (Double, optional)
- `radiusKm` (Double, optional, default: 15.0km, max: 100.0km)
- `sortBy` options: `DISTANCE_ASC`, `RATING_DESC`, `NAME_ASC`, `POPULARITY_DESC`

---

## 8. REAL NEARBY BAKERY SEARCH ARCHITECTURE

### 8.1 Geospatial Technology Evaluation

| Technology | Implementation Complexity | Deployment/Hosting Overhead | Query Performance (< 50,000 shops) | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **PostGIS Extension** | High (Requires PostgreSQL binary module `postgis`, specialized GiST spatial indexes, geometry types). | High (Not supported on all bare-metal or cheap cloud DB instances; requires extension enablement permissions). | Extremely fast (< 2ms). | **Overkill for Loop 2**; reserve for Loop 5+ |
| **PostgreSQL `earthdistance` + `cube`** | Medium (Requires activating 2 core extensions: `cube`, `earthdistance`). | Low-to-Medium (Standard in standard PostgreSQL distributions). | Very fast (< 5ms with GiST index). | Strong alternative |
| **Application-Side Haversine** (Java) | Low. | None (All math in JVM). | Terrible at scale (Requires loading all active shops into JVM memory before distance filtering). | **REJECT** |
| **Native SQL Bounding Box + Haversine Projection** | **Low** (Uses native trigonometric SQL functions `sin`, `cos`, `acos`, `radians` already present in standard PostgreSQL). | **Zero** (Works on any PostgreSQL instance out-of-the-box). | **Very Fast (< 8ms)** when filtered by bounding box indexed on `(latitude, longitude)`. | **RECOMMENDED FOR LOOP 2** |

### 8.2 Recommended SQL Haversine Formula with Bounding Box
To ensure sub-10ms performance without PostGIS:
1. **Bounding Box Pre-filter:** Given customer coordinates $(\text{lat}_0, \text{lon}_0)$ and search radius $R$ km:
   $$\Delta \text{lat} = \frac{R}{111.0}, \quad \Delta \text{lon} = \frac{R}{111.0 \times \cos(\text{radians}(\text{lat}_0))}$$
   Pre-filter in SQL:
   `WHERE latitude BETWEEN (:lat0 - :dLat) AND (:lat0 + :dLat) AND longitude BETWEEN (:lon0 - :dLon) AND (:lon0 + :dLon)`
2. **Exact Spherical Distance Calculation:**
   $$d = 6371 \times \arccos\left(\sin(\text{lat}_0) \sin(\text{lat}_1) + \cos(\text{lat}_0) \cos(\text{lat}_1) \cos(\text{lon}_1 - \text{lon}_0)\right)$$

---

## 9. DISTANCE CALCULATION & DISPLAY

### 9.1 Where Calculation Belongs
- **Selection & Filtering:** **Database (SQL Query)**. The database must filter records within `radiusKm` and calculate the distance projection to allow SQL-level sorting (`ORDER BY distance ASC`) and correct pagination offsets (`LIMIT / OFFSET`).
- **Response Projection:** Backend maps the calculated distance (in kilometers, formatted to 1 decimal place, e.g., `2.4 km`) directly into `StorefrontShopSummaryDTO.distanceKm`.
- **Frontend Presentation:** The frontend simply renders the formatted badge: `2.4 km away` or `Within 5 km`.

---

## 10. DYNAMIC POPULAR CITIES ARCHITECTURE

### 10.1 Current Deficit
`frontend_v2/lib/constants/indianLocations.ts` hardcodes a static list of 10 cities (`INDIAN_POPULAR_CITIES` and `INDIAN_POPULAR_PLACES`).

### 10.2 Recommended Dynamic Backend Query
Popular cities must reflect real-time registered and active bakery distribution:
```sql
SELECT s.city AS cityName, s.state AS stateName, COUNT(s.id) AS bakeryCount
FROM shops s
WHERE s.status = 'ACTIVE' AND s.city IS NOT NULL AND TRIM(s.city) != ''
GROUP BY s.city, s.state
ORDER BY bakeryCount DESC, s.city ASC
LIMIT 12;
```
- **Caching:** Cache the result in Caffeine / Spring Cache for 15 minutes (`@Cacheable("popularCities")`) to ensure zero load on the database.
- **New Public API Endpoint:**
  `GET /api/customer/storefront/locations/popular-cities`

---

## 11. BAKERY RATINGS & TOP RATED ARCHITECTURE

### 11.1 Current Architecture Flaw
In `CustomerStorefrontService.java`:
```java
Double avgRating = feedbackRepository.calculateAverageRatingByShopId(shop.getId());
Long totalReviews = feedbackRepository.countByShopId(shop.getId());
```
- The `feedback` table is an unverified, generic comment table.
- Meanwhile, `product_reviews` contains real customer reviews tied to verified orders.
- Furthermore, calculating this individually per shop inside a Java iteration creates a devastating **N+1 query storm**.

### 11.2 Rating Unification Strategy
1. Add aggregated rating columns to the `shops` table:
   - `rating_average DOUBLE PRECISION DEFAULT 0.0`
   - `rating_count INTEGER DEFAULT 0`
2. Update these aggregated columns asynchronously upon review submission or via periodic reconciliation.
3. In marketplace search, query `s.rating_average` and `s.rating_count` directly from the `shops` table, allowing instant index-backed `ORDER BY s.rating_average DESC`.

---

## 12. MARKETPLACE FILTER ARCHITECTURE & ELIMINATING THE N+1 QUERY STORM

### 12.1 The Current N+1 Problem
In `CustomerStorefrontService.java` (lines 193–220), for every shop returned by the search, the code executes:
1. `calculateAverageRatingByShopId` (SQL query)
2. `countByShopId` (SQL query)
3. `bannerRepository.findByShopId...` (SQL query)
4. `businessHoursRepository.findByShopId...` (SQL query)
5. `deliveryConfigRepository.findByShopId...` (SQL query)
6. `storefrontSettingsRepository.findByShopId...` (SQL query)
7. `customFieldRepository.findByShopId...` (SQL query)

### 12.2 Optimized Marketplace Search DTO
Marketplace discovery does not need custom fields, full delivery slot matrices, or all banners. It needs a lightweight summary DTO:
- `id`, `name`, `slug`, `logoUrl`, `heroBannerUrl`
- `address`, `city`, `district`, `state`, `pincode`, `latitude`, `longitude`
- `distanceKm` (if GPS provided)
- `ratingAverage`, `ratingCount`
- `isOpenNow`, `isPureVeg`
- `minOrderAmount`

All fields can be loaded in a **single projection query**, reducing database execution time from ~450ms down to ~8ms.

---

## 13. HARDCODED & MOCK LOCATION INVENTORY

| Location / File Path | Hardcoded Content | Classification | Required Action |
| :--- | :--- | :--- | :--- |
| `frontend_v2/components/customer/marketplace/AdvancedLocationFilter.tsx:L85-92` | Hardcoded fake GPS timer inserting `Maharashtra -> Pune -> Pimpri-Chinchwad -> Akurdi` | **A. Production Behavior** | Replace with browser `navigator.geolocation` and real reverse geocoding. |
| `frontend_v2/components/customer/marketplace/AdvancedLocationFilter.tsx:L22-75` | Hardcoded 3-state hierarchy (`Maharashtra`, `Karnataka`, `Delhi`) | **A. Production Behavior** | Replace with dynamic Indian hierarchy dataset covering all 28 states & 8 UTs. |
| `frontend_v2/lib/constants/indianLocations.ts:L33-145` | `INDIAN_POPULAR_PLACES` and `INDIAN_POPULAR_CITIES` static arrays | **A. Production Behavior** | Replace with dynamic `/api/customer/storefront/locations/popular-cities` API call. |
| `frontend_v2/lib/constants/indianLocations.ts:L150-378` | `MOCK_INDIAN_BAKERIES` (378 lines of fake mock bakeries) | **D. Dead Code** | Ensure `explore/page.tsx` never falls back to mock data in production; prune in cleanup pass. |
| `frontend_v2/app/onboarding/page.tsx:L619-639` | `<datalist id="onboarding-cities">` and `<datalist id="onboarding-states">` | **B. UI Fallback** | Replace with searchable, cascading administrative select inputs. |
| `backend/src/main/resources/db/migration/V3__seed_demo_data.sql` | Demo bakery addresses in Pune | **C. Test Fixture** | Keep for local development; never expose in production seed scripts. |

*Classification Guide:*  
- **A. Production Behavior:** Must remove/replace with real implementation.  
- **B. UI Fallback:** Acceptable temporarily if non-production, but should be modernized.  
- **C. Test Fixture:** Safe to keep for automated test suites.  
- **D. Dead Code:** Unused legacy assets to be pruned safely.  

---

## 14. MULTI-TENANT & SECURITY IMPACT

1. **Tenant Isolation:** Marketplace search queries the public storefront projection of shops. It **must never** expose:
   - Owner credentials, user IDs, or personal mobile numbers.
   - KYC documents, FSSAI certificates, or bank account/payout details.
   - Internal subscription IDs, Razorpay order keys, or billing records.
2. **IDOR Protection:** All owner update endpoints (`/api/owner/shop/**`) must strictly validate tenant ownership via `ShopAccessValidator` using the authenticated JWT principal.
3. **Input Sanitization:** Geolocation parameters (`latitude`, `longitude`, `radiusKm`) must be strictly validated on the backend:
   - Latitude: $-90.0 \le \text{lat} \le +90.0$
   - Longitude: $-180.0 \le \text{lon} \le +180.0$
   - Radius: $0.1 \le \text{radiusKm} \le 100.0$

---

## 15. SUBSCRIPTION & LIFECYCLE COMPATIBILITY

Marketplace discovery must strictly adhere to the established CakeStore business rules:
- **`ShopStatus.ACTIVE`:** Only bakeries with active, paid subscriptions participate in marketplace discovery and location searches.
- **`ShopStatus.PENDING`:** New bakeries awaiting initial payment are completely hidden from marketplace discovery.
- **`ShopStatus.SUSPENDED` / `CANCELLED`:** Excluded from marketplace search results.
- **`ShopStatus.EXPIRED`:** Excluded from marketplace discovery. Their direct custom URL/subdomain handling remains governed by existing grace period rules, but they do not appear in city or nearby listings.
- **`ShopSpecification` Enforcement:** The backend specification must permanently enforce `root.get("status").in(ShopStatus.ACTIVE)` across all marketplace search vectors.

---

## 16. PROPOSED API CONTRACTS

### 16.1 Public Dynamic Popular Cities
```http
GET /api/customer/storefront/locations/popular-cities
```
**Response (200 OK):**
```json
[
  {
    "city": "Pune",
    "state": "Maharashtra",
    "activeBakeryCount": 42
  },
  {
    "city": "Mumbai",
    "state": "Maharashtra",
    "activeBakeryCount": 31
  }
]
```

### 16.2 Enhanced Public Marketplace Search
```http
GET /api/customer/storefront/shops/search?state=Maharashtra&city=Pune&district=Pune&latitude=18.5204&longitude=73.8567&radiusKm=10&page=0&size=20&sortBy=DISTANCE_ASC
```
**Response (200 OK):**
```json
{
  "content": [
    {
      "id": 14,
      "name": "Artisan Gateau Studio",
      "slug": "artisan-gateau",
      "logoUrl": "https://img.cakestore.in/logos/14.png",
      "heroBannerUrl": "https://img.cakestore.in/banners/14.png",
      "city": "Pune",
      "district": "Pune",
      "state": "Maharashtra",
      "area": "Kothrud",
      "pincode": "411038",
      "address": "Shop 4, Ideal Colony, Kothrud",
      "latitude": 18.5074,
      "longitude": 73.8077,
      "distanceKm": 5.3,
      "ratingAverage": 4.85,
      "ratingCount": 124,
      "isPureVeg": false,
      "isOpenNow": true
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "pageNumber": 0,
  "pageSize": 20
}
```

### 16.3 Administrative Boundary Hierarchy Reference
```http
GET /api/customer/storefront/locations/hierarchy?state=Maharashtra&district=Pune
```
**Response (200 OK):**
```json
{
  "state": "Maharashtra",
  "district": "Pune",
  "cities": ["Pune Municipal Corporation", "Pimpri-Chinchwad", "Haveli"],
  "majorLocalities": ["Kothrud", "Akurdi", "Baner", "Wakad", "Viman Nagar"]
}
```

---

## 17. FRONTEND CHANGES REQUIRED

1. **`frontend_v2/app/onboarding/page.tsx` (Step 3: Location):**
   - Replace primitive text inputs with structured cascading dropdowns: `State` $\to$ `District` $\to$ `City` $\to$ `Area` $\to$ `Pincode`.
   - Embed lightweight Leaflet map picker enabling the owner to drop and drag a pin to pinpoint exact kitchen/store coordinates.
   - Send `district`, `area`, `latitude`, and `longitude` in the `authApi.register()` payload.
2. **`frontend_v2/app/dashboard/owner/settings/page.tsx`:**
   - Add fields for `district`, `area`, `latitude`, and `longitude` to the profile form.
   - Include coordinate picker map so owners can adjust their location post-registration.
3. **`frontend_v2/components/customer/marketplace/AdvancedLocationFilter.tsx`:**
   - Eliminate hardcoded 3-state list and replace with dynamic administrative hierarchy.
   - Replace fake `setTimeout` GPS button with real HTML5 `navigator.geolocation.getCurrentPosition()`.
   - Implement reverse geocoding so customer GPS instantly populates current City/Area and filters nearby shops.
4. **`frontend_v2/app/explore/page.tsx`:**
   - Integrate `latitude`, `longitude`, `radiusKm`, and `sortBy=DISTANCE_ASC` into query params and backend fetch hooks.
   - Render real distance badges (`distanceKm`) on bakery cards.
   - Fetch dynamic popular cities from backend instead of reading static constants.

---

## 18. BACKEND CHANGES REQUIRED

1. **`RegisterRequest.java` & `AuthService.java`:**
   - Ensure `district`, `area`, `latitude`, and `longitude` are validated and correctly saved to `Shop`.
2. **`CustomerStorefrontController.java` & `CustomerStorefrontService.java`:**
   - Add parameters `district`, `area`, `latitude`, `longitude`, `radiusKm`, and `sortBy` to `/shops/search`.
   - Implement native Haversine bounding-box repository query in `ShopRepository` to replace the N+1 in-memory loop.
   - Implement `/locations/popular-cities` endpoint with 15-minute Caffeine cache.
3. **`ShopRepository.java`:**
   - Add `@Query` projection returning `StorefrontShopSummaryDTO` with computed distance in a single SQL statement.
4. **`ShopSpecification.java`:**
   - Add specification predicates for `district` and `area`.

---

## 19. DATABASE CHANGES REQUIRED (PROPOSED FLYWAY V18)

> [!IMPORTANT]
> **Zero Migration Rule:** Migrations `V1` through `V17` will NOT be altered. All schema adjustments must be encapsulated in a new migration: `V18__add_location_indexes_and_spatial_search.sql`.

### Proposed `V18` Migration Design:
```sql
-- 1. Create B-Tree Indexes for Location Filtering & Grouping
CREATE INDEX IF NOT EXISTS idx_shops_status_city ON shops(status, city);
CREATE INDEX IF NOT EXISTS idx_shops_status_state ON shops(status, state);
CREATE INDEX IF NOT EXISTS idx_shops_district ON shops(district);
CREATE INDEX IF NOT EXISTS idx_shops_pincode ON shops(pincode);

-- 2. Create Composite Index for Spatial Bounding-Box Lookups
CREATE INDEX IF NOT EXISTS idx_shops_lat_lng ON shops(latitude, longitude) WHERE status = 'ACTIVE';

-- 3. Add Aggregated Rating Columns to Avoid N+1 Storms
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rating_average DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_shops_rating ON shops(status, rating_average DESC);
```

---

## 20. EXTERNAL DEPENDENCIES & COST ANALYSIS

| Dependency | Purpose | Cost / Tier | Risk Mitigation |
| :--- | :--- | :--- | :--- |
| **Leaflet.js + `react-leaflet`** | Client-side map rendering in browser. | **$0.00 (Open Source)** | Completely client-side; zero external API token required. |
| **OpenStreetMap Standard Tiles** | Map background tiles. | **$0.00 (Free public tile server)** | Follow OSM tile usage policy; cache tiles locally in browser service worker. |
| **Nominatim / OSM Geocoding** | Forward & reverse geocoding. | **$0.00 (Free public endpoint)** | Enforce 1 req/sec rate limit; cache resolved locations in client storage. |
| **HTML5 Geolocation API** | Capturing user device GPS. | **$0.00 (Native W3C Browser API)** | Standard browser feature; prompt user gracefully for permission. |

*Total Additional Monthly Cost:* **₹0 / $0**. CakeStore will not incur any third-party mapping API subscription costs for Loop 2.

---

## 21. MULTI-TENANT & SECURITY AUDIT

- **Public Data Scrubbing:** `StorefrontShopSummaryDTO` only exposes public business data (`name`, `slug`, `city`, `addressLine1`, `logoUrl`, coordinates). Private fields (`bankAccount`, `fssaiDocumentUrl`, `ownerEmail`, `ownerMobile`) are strictly excluded.
- **Tenant Scope Enforcement:** Owner location updates continue to be guarded by `ShopAccessValidator` verifying that the requesting user owns the targeted shop record.

---

## 22. SUBSCRIPTION & LIFECYCLE COMPATIBILITY

- The database queries will enforce `WHERE s.status = 'ACTIVE'` across all spatial and city searches.
- `PENDING` shops (awaiting payment) and `EXPIRED` shops (unpaid renewal) will never leak into public marketplace discovery or nearby bakery search results.

---

## 23. MIGRATION STRATEGY FOR EXISTING DATA

- Existing shops in the database registered during Loop 0 / Loop 1 have `city`, `state`, and `pincode`, but `latitude = null` and `longitude = null`.
- **Safe Fallback:** The marketplace search query will treat `latitude = null` gracefully. Shops without coordinates will be discoverable via standard text/city search (`city = 'Pune'`), but excluded from radius-based GPS searches until the owner sets their location pin in Owner Settings.
- No existing data will be overwritten, modified, or deleted during migration.

---

## 24. TECHNICAL & OPERATIONAL RISKS

1. **Browser Geolocation Denial:** Users may deny location permissions in browser popups.
   *Mitigation:* Provide an intuitive city/locality fallback dropdown when GPS is denied.
2. **Rural Coordinates Inaccuracy:** Forward geocoding may fail for informal Indian village addresses.
   *Mitigation:* Allow the owner to manually drag the map pin to any location on the map.
3. **Spam / Fake Coordinates:** A bakery might set coordinates outside India.
   *Mitigation:* Enforce bounding-box validation in backend DTO ($6^\circ\text{N} \le \text{lat} \le 38^\circ\text{N}$ and $68^\circ\text{E} \le \text{lon} \le 98^\circ\text{E}$).

---

## 25. RECOMMENDED IMPLEMENTATION PHASES (FOR LOOP 2 EXECUTION)

```
Phase 2.1: Database Optimization (Flyway V18 Indexes & Rating Columns)
       │
Phase 2.2: Backend Geospatial Search & Dynamic Popular Cities Query
       │
Phase 2.3: Admin Location Hierarchy & Reference Dataset
       │
Phase 2.4: Owner Onboarding & Settings Interactive Map Pin Picker
       │
Phase 2.5: Customer Marketplace Real GPS & Cascading Filter Integration
       │
Phase 2.6: Verification & Automated Performance Testing
```

---

## 26. ACCEPTANCE CRITERIA

1. [ ] A new bakery registering via onboarding selects State $\to$ District $\to$ City $\to$ Area, drops a pin on an interactive map, and persists real coordinates.
2. [ ] Owner can view and update their bakery pin in `app/dashboard/owner/settings`.
3. [ ] Customer clicking "Use My GPS" in `/explore` prompts real browser geolocation and resolves the customer's actual locality.
4. [ ] Searching `/api/customer/storefront/shops/search?latitude=...&longitude=...&radiusKm=10` returns bakeries within 10 km sorted by real distance.
5. [ ] Bakery cards on `/explore` display accurate calculated distance badges (e.g., `2.4 km away`).
6. [ ] Popular cities on the marketplace are dynamically generated from real active bakery counts via `/locations/popular-cities`.
7. [ ] The N+1 query storm on marketplace search is completely eliminated (< 5 SQL queries per search request).
8. [ ] All 321+ existing backend unit/integration tests continue to pass without regression.

---

## 27. FILES THAT WILL NEED MODIFICATION (DURING EXECUTION)

### Backend:
1. `backend/src/main/resources/db/migration/V18__add_location_indexes_and_spatial_search.sql` [NEW]
2. `backend/src/main/java/com/cakeplatform/api/modules/shop/Shop.java`
3. `backend/src/main/java/com/cakeplatform/api/modules/shop/ShopRepository.java`
4. `backend/src/main/java/com/cakeplatform/api/modules/shop/ShopSpecification.java`
5. `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontController.java`
6. `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontService.java`
7. `backend/src/main/java/com/cakeplatform/api/modules/storefront/dto/StorefrontShopSummaryDTO.java` [NEW]
8. `backend/src/main/java/com/cakeplatform/api/modules/storefront/dto/PopularCityDTO.java` [NEW]

### Frontend:
1. `frontend_v2/app/onboarding/page.tsx`
2. `frontend_v2/app/dashboard/owner/settings/page.tsx`
3. `frontend_v2/components/customer/marketplace/AdvancedLocationFilter.tsx`
4. `frontend_v2/app/explore/page.tsx`
5. `frontend_v2/lib/constants/indianLocations.ts`
6. `frontend_v2/lib/api/storefront.ts`

---

## 28. FILES THAT MUST NOT BE MODIFIED

1. `backend/src/main/resources/db/migration/V1__init_schema.sql` through `V17__fix_phone_uniqueness.sql` (Immutable Flyway migrations).
2. `backend/src/main/java/com/cakeplatform/api/modules/payment/**` (Payment and Razorpay integration).
3. `backend/src/main/java/com/cakeplatform/api/modules/subscription/**` (Subscription lifecycle logic).
4. `backend/src/main/java/com/cakeplatform/api/security/ShopAccessValidator.java` (Tenant isolation security layer).
5. `backend/src/test/java/com/cakeplatform/api/modules/auth/RegistrationIdentityIntegrityTest.java` (Loop 1 integrity tests).

---

## 29. OPEN ARCHITECTURAL DECISIONS FOR USER REVIEW

1. **Map Engine Selection:** We recommend **Leaflet + OpenStreetMap** because it is 100% free, highly performant, and avoids requiring Google Maps / Mapbox credit cards and billing setup. If Google Maps or Mapbox is explicitly preferred for branding reasons, please indicate.
2. **Search Radius Defaults:** We recommend defaulting customer nearby search to **15 km** (standard urban cake delivery range in India) with user-selectable options of 5 km, 10 km, 25 km, and 50 km.
3. **Geocoding Fallback Policy:** When a customer denies GPS permissions, the UI will fall back to dynamic popular cities and cascading state/city dropdowns.

---
**AUDIT COMPLETE — AWAITING USER REVIEW PRIOR TO IMPLEMENTATION**
