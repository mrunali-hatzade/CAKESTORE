# CAKESTORE LOOP 2 — PHASE 2.2 FINAL VERIFICATION & PERFORMANCE AUDIT
**Backend Location & Marketplace Discovery Certification**

**Date:** September 16, 2026  
**Status Classification:** 🟢 **PASS**  
**Regression Baseline:** **327 / 327 tests PASSING (100%)** (321 legacy + 6 Phase 2.2 tests, 0 failures, 0 errors, 0 skipped)  

---

## 1. Implementation Verification

The Phase 2.2 backend marketplace discovery and location search implementation was verified across the following components:

1. **Lightweight Card Summary Projection & DTO**:
   - [`StorefrontShopSummaryDTO`](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/storefront/dto/StorefrontShopSummaryDTO.java): Provides only shop card summary fields (`id`, `businessName`, `description`, `businessType`, `businessCategory`, `logoUrl`, `coverImageUrl`, `address`, `addressLine1`, `addressLine2`, `area`, `city`, `district`, `state`, `pincode`, `country`, `latitude`, `longitude`, `distanceKm`, `status`, `verificationStatus`, `averageRating`, `totalReviews`, `isPureVeg`).
   - [`ShopSummaryProjection`](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/modules/storefront/dto/ShopSummaryProjection.java): Native SQL interface projection mapped by Spring Data JPA directly from column aliases.
2. **Elimination of Eager Payloads**:
   - During marketplace discovery searches, banners, full business hours, delivery configurations, storefront settings, and custom cake form fields are **not** queried or loaded.
3. **Structured Hierarchy & Keyword Filtering**:
   - Supports `country`, `state`/UT, `district`, `city`/town, `area`/locality, `pincode`, `businessType`, `search` keyword, and legacy `location` parameter.
4. **Nearby GPS Search (Haversine + Bounding Box)**:
   - Evaluates a spherical bounding box in Java and applies indexed range pre-filtering on `(latitude, longitude)`.
   - Calculates spherical distance via Haversine formula directly in PostgreSQL with `LEAST(1.0, GREATEST(-1.0, ...))` bounding clamps to prevent float precision NaN anomalies.
   - Filters `distance_km <= :radiusKm` and sorts by `distance_km ASC` (or requested `sortBy`).
5. **Strict ACTIVE Filtering & NULL-Coordinate Semantics**:
   - `s.status = 'ACTIVE'` is strictly enforced in all search paths (`PENDING`, `SUSPENDED`, `INACTIVE` excluded).
   - Radius-based GPS searches exclude shops with `NULL` coordinates.
   - Text and hierarchy browse searches retain shops with `NULL` coordinates (`distanceKm = null`).
6. **Dynamic Popular Cities Endpoint**:
   - Exposes dynamic active shop counts grouped by city and state.
   - Protected by a thread-safe 15-minute in-memory cache (`15 * 60 * 1000L` ms). Zero mock data.
7. **Security & Route Permutations**:
   - [`SecurityConfig.java`](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/main/java/com/cakeplatform/api/security/SecurityConfig.java) permits `/api/customer/storefront/**` and `/api/storefront/**` publicly without JWT tokens.

---

## 2. Exact Query Count Evidence

A customer marketplace search request executes:
- **1 paginated discovery data query** (computes shop card fields + aggregate rating and total reviews via `LEFT JOIN feedback`)
- **1 count query** (computes total matching records for pagination metadata)

**Constant SQL Round-Trip Count:** **EXACTLY 2 SQL QUERIES** ($O(1)$ database round-trips).

### Unit & Integration Verification:
In [`StorefrontLocationDiscoveryTest.java`](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/test/java/com/cakeplatform/api/modules/storefront/StorefrontLocationDiscoveryTest.java) (`testZeroNPlusOneQueries`):
```java
verify(shopRepository, times(1)).findActiveShopsWithSummary(any(), any(), any(), any(), any(), any(), any(), any(), any(), anyInt(), anyInt());
verify(shopRepository, times(1)).countActiveShops(any(), any(), any(), any(), any(), any(), any(), any());
```
Both invocations verified with Mockito `times(1)`.

---

## 3. N+1 Elimination Verification

In the legacy implementation, `searchShops` called `mapToStorefrontShopResponse` in a per-shop loop, issuing 7 additional SQL queries per shop ($1 + 7N$ queries):
- `calculateAverageRatingByShopId(shop.getId())`
- `countApprovedByShopId(shop.getId())`
- `shopBannerRepository.findByShopId...`
- `shopBusinessHoursRepository.findByShopId...`
- `shopDeliveryConfigRepository.findByShopId...`
- `shopStorefrontSettingsRepository.findByShopId...`
- `shopCustomFormFieldRepository.findByShopId...`

In Phase 2.2, zero per-shop repository calls are issued. In [`StorefrontLocationDiscoveryTest.java`](file:///d:/PROJECTS/CAKE%20SAAs1/backend/src/test/java/com/cakeplatform/api/modules/storefront/StorefrontLocationDiscoveryTest.java):
```java
verifyNoInteractions(shopBannerRepository);
verifyNoInteractions(shopBusinessHoursRepository);
verifyNoInteractions(shopDeliveryConfigRepository);
verifyNoInteractions(shopStorefrontSettingsRepository);
verifyNoInteractions(shopCustomFormFieldRepository);
verifyNoInteractions(feedbackRepository);
```
All assertions pass. Per-shop N+1 queries are completely eliminated.

---

## 4. Benchmark Methodology & Dataset

### 4.1 Safe Isolated Environment
- Created a separate isolated benchmark database: `cake_benchmark_test` on PostgreSQL 18.
- Cloned the exact production DDL for `users`, `shops`, `feedback`, foreign keys, and all 6 V18 indexes.
- **Data Safety**: `cake_platform` (dev/production database) was untouched. Zero fake or test records were inserted into business data.
- The isolated database was dropped after benchmark execution, leaving the PostgreSQL environment clean.

### 4.2 Benchmark Dataset Size
- **Total Synthetic ACTIVE Shops:** **1,000 shops**
- **Geographic Distribution:**
  - **Maharashtra:** ~600 shops across Pune, Mumbai, Nagpur, Nashik, Thane (realistic coordinates, districts, localities, and pincodes)
  - **Karnataka:** ~400 shops across Bengaluru, Mysuru, Mangaluru, Hubballi
  - **Null Coordinate Controls:** 50 shops with `NULL` coordinates to verify exclusion from GPS radius searches and inclusion in text browse searches
- **Synthetic Feedback Reviews:** **4,636 approved feedback reviews** linked to shops with ratings 3–5.
- Executed `ANALYZE shops; ANALYZE feedback;` prior to benchmarking to provide full optimizer statistics.

### 4.3 Execution Parameters
- **Tool:** PostgreSQL microsecond timer via `EXPLAIN (ANALYZE, BUFFERS)` executed through automated test runner.
- **Iterations:** **50 measured iterations** per scenario (+ 3 unmeasured warmup executions).
- **Total Measured Query Executions:** **450 executions** across 9 scenarios.

---

## 5. Benchmark Performance Results (P50, P95, Max)

| Scenario | Iterations | Dataset Size | Min Exec | P50 (Median) | **P95 Measured** | Max Exec | Avg Planning | Target | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **A. City Search (Pune)** | 50 | 1,000 shops | 1.558 ms | 1.982 ms | **3.047 ms** | 3.455 ms | 7.723 ms | < 50 ms | 🟢 PASS |
| **B. State Search (Maharashtra)** | 50 | 1,000 shops | 4.810 ms | 6.463 ms | **10.625 ms** | 13.874 ms | 8.073 ms | < 50 ms | 🟢 PASS |
| **C. District Search (Bengaluru Urban)** | 50 | 1,000 shops | 1.735 ms | 1.991 ms | **3.627 ms** | 3.968 ms | 7.455 ms | < 50 ms | 🟢 PASS |
| **D. Pincode Search (411005)** | 50 | 1,000 shops | 1.313 ms | 1.562 ms | **2.521 ms** | 2.641 ms | 7.851 ms | < 50 ms | 🟢 PASS |
| **E. Nearby Search 5 km (Pune)** | 50 | 1,000 shops | 0.508 ms | 0.569 ms | **1.064 ms** | 1.593 ms | 7.756 ms | < 50 ms | 🟢 PASS |
| **F. Nearby Search 15 km (Pune)** | 50 | 1,000 shops | 1.135 ms | 1.357 ms | **2.650 ms** | 3.252 ms | 8.175 ms | < 50 ms | 🟢 PASS |
| **G. Nearby Search 50 km (Pune)** | 50 | 1,000 shops | 1.163 ms | 1.354 ms | **2.369 ms** | 2.986 ms | 7.913 ms | < 50 ms | 🟢 PASS |
| **H. Distance Sorting (15 km)** | 50 | 1,000 shops | 1.174 ms | 1.445 ms | **2.443 ms** | 3.283 ms | 7.990 ms | < 50 ms | 🟢 PASS |
| **I. Pagination (Page 2, Offset 20)** | 50 | 1,000 shops | 1.637 ms | 2.064 ms | **3.294 ms** | 3.454 ms | 8.052 ms | < 50 ms | 🟢 PASS |

### Performance Analysis:
- **Fastest Scenario (5 km Nearby GPS):** P50 = **0.569 ms**, P95 = **1.064 ms**.
- **Broadest Scenario (Maharashtra State Search):** P50 = **6.463 ms**, P95 = **10.625 ms** (scanning 600 shops + joining ~2,800 feedback records).
- **All 9 scenarios achieved P95 < 11 ms**, well within the required **P95 < 50 ms** local benchmark threshold.

---

## 6. EXPLAIN (ANALYZE, BUFFERS) Plan Verification

### 6.1 Representative Nearby Search Plan (Scenario F: 15 km Radius)
```
Limit  (cost=106.96..106.97 rows=4 width=1827) (actual time=1.433..1.435 rows=20.00 loops=1)
  Buffers: shared hit=289
  ->  Sort  (cost=106.96..106.97 rows=4 width=1827) (actual time=1.432..1.433 rows=20.00 loops=1)
        Sort Key: ((6371 * acos(LEAST(1, GREATEST(-1, ...)))))
        Sort Method: top-N heapsort  Memory: 40kB
        Buffers: shared hit=289
        ->  GroupAggregate  (cost=106.52..106.92 rows=4 width=1827) (actual time=1.077..1.262 rows=84.00 loops=1)
              Group Key: s.id
              Buffers: shared hit=286
              ->  Sort  (cost=106.52..106.57 rows=19 width=1791) (actual time=1.063..1.078 rows=449.00 loops=1)
                    Sort Key: s.id
                    Sort Method: quicksort  Memory: 141kB
                    Buffers: shared hit=286
                    ->  Nested Loop Left Join  (cost=5.67..106.12 rows=19 width=1791) (actual time=0.119..0.789 rows=449.00 loops=1)
                          Buffers: shared hit=283
                          ->  Bitmap Heap Scan on shops s  (cost=5.39..35.40 rows=4 width=1779) (actual time=0.103..0.280 rows=84.00 loops=1)
                                Recheck Cond: ((latitude >= 18.3852) AND (latitude <= 18.6555) AND (longitude >= 73.7146) AND (longitude <= 73.9987) AND (status = 'ACTIVE'))
                                Filter: ((6371 * acos(...)) <= 15)
                                Heap Blocks: exact=36
                                Buffers: shared hit=43
                                ->  Bitmap Index Scan on idx_shops_active_lat_lng  (cost=0.00..5.38 rows=13 width=0) (actual time=0.057..0.057 rows=84.00 loops=1)
                                      Index Cond: ((latitude >= 18.3852) AND (latitude <= 18.6555) AND (longitude >= 73.7146) AND (longitude <= 73.9987))
                                      Index Searches: 1
                                      Buffers: shared hit=7
                          ->  Index Scan using idx_feedback_shop_approved on feedback f  (cost=0.28..17.61 rows=7 width=20) (actual time=0.003..0.004 rows=5.10 loops=84)
                                Index Cond: ((shop_id = s.id) AND (is_approved = true))
                                Index Searches: 84
                                Buffers: shared hit=240
Planning:
  Buffers: shared hit=382
Planning Time: 10.020 ms
Execution Time: 1.635 ms
```

### Plan Checklist Verification:
1. **Bounding-box predicates applied:** `Recheck Cond: ((latitude >= 18.3852) AND (latitude <= 18.6555) AND (longitude >= 73.7146) AND (longitude <= 73.9987) AND (status = 'ACTIVE'))` — **VERIFIED**.
2. **Spatial index utilized:** `Bitmap Index Scan on idx_shops_active_lat_lng` (`Index Searches: 1, Buffers: shared hit=7`) — **VERIFIED**.
3. **Haversine filtering occurs:** `Filter: ((6371 * acos(...)) <= 15)` applied directly during heap scan before aggregation — **VERIFIED**.
4. **No full storefront/config loading:** Zero scans or joins on `shop_banners`, `shop_business_hours`, `shop_delivery_configs`, `shop_storefront_settings`, `shop_custom_form_fields` — **VERIFIED**.
5. **Aggregation behavior:** `Nested Loop Left Join` on `idx_feedback_shop_approved` with `GroupAggregate` on `s.id` calculating `avg(f.rating)` and `count(f.id)` — **VERIFIED**.
6. **Zero disk reads:** All pages hit in shared memory buffers (`Buffers: shared hit=289`).

---

## 7. Popular Cities Route Verification

Audit of route usage across `backend` and `frontend_v2`:

1. **Current Route Usages**:
   - `GET /api/customer/storefront/locations/popular-cities`: This is the newly approved canonical customer endpoint.
   - `GET /api/storefront/shops/locations/popular-cities`: Legacy alias exposed to guarantee that any client querying under `/api/storefront/shops/**` receives identical data.
2. **Frontend Inspection**:
   - `frontend_v2/components/customer/marketplace/IndianCityPills.tsx` currently renders static city names imported from `@/lib/constants/indianLocations.ts`.
   - Neither frontend client nor legacy endpoints currently call `GET /api/storefront/shops/locations/popular-cities`.
   - The frontend will be hooked up to `GET /api/customer/storefront/locations/popular-cities` in Phase 2.4/2.5.
3. **Recommendation**:
   - Both endpoints are currently active via Spring's dual `@RequestMapping({"/api/storefront/shops", "/api/customer/storefront"})`.
   - `GET /api/storefront/shops/locations/popular-cities` is completely safe and harmless, but is identified as an **optional cleanup candidate** for a future controlled loop. It is not removed now to prevent unintended breakages and preserve scope control.

---

## 8. Full Regression Test Execution

Executed clean maven test suite against the backend:
```bash
mvn clean test
```

### Output:
```
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.cakeplatform.api.modules.storefront.StorefrontLocationDiscoveryTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 3.523 s
...
[INFO] Results:
[INFO] 
[INFO] Tests run: 327, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  32.578 s
```

- **All Existing Tests:** 321 passing
- **Phase 2.2 Tests:** 6 passing
- **Total Tests:** **327 passing** (0 failures, 0 errors, 0 skipped)

---

## 9. Known Limitations

1. **Flyway V17 Development History State**:
   - As documented in the Phase 2.1 audit, local `cake_platform` has pre-existing duplicate mobile numbers in seed development data that prevent re-running V17 from scratch without data cleanup. The six V18 indexes are physically active on `cake_platform` and were physically verified on the isolated benchmark database.
2. **In-Memory Cache Single-Node Scope**:
   - The 15-minute popular cities cache uses JVM-local thread-safe memory. In a distributed multi-pod Kubernetes deployment, each pod maintains its own 15-minute cache window. If multi-instance synchronization is required in the future, Redis can be introduced.

---

## 10. Final Classification & Certification

| Requirement | Target | Result | Status |
|---|---|---|---|
| Core Implementation | Fully functional location marketplace | Complete & Verified | 🟢 PASS |
| SQL Round-Trip Count | 1 data query + 1 count query | Verified (2 queries) | 🟢 PASS |
| N+1 Elimination | Zero per-shop queries | Verified | 🟢 PASS |
| EXPLAIN ANALYZE | Index used, bounding box + Haversine | Verified (`idx_shops_active_lat_lng`) | 🟢 PASS |
| Safe 1,000-Shop Benchmark | Isolated dataset, 0 prod mutation | 1,000 shops in `cake_benchmark_test` | 🟢 PASS |
| Performance Target | P95 < 50 ms | **Measured P95: 1.06 ms – 10.63 ms** | 🟢 PASS |
| Regression Test Suite | 327+ tests passing | 327 / 327 passing | 🟢 PASS |

### Final Classification: 🟢 **PASS**

Phase 2.2 is certified as fully complete. Execution is stopped. Phase 2.3 has not been started.
