# CAKESTORE LOOP 2 — PHASE 2.3 IMPLEMENTATION PLAN
**Canonical Indian Location Hierarchy Architecture & Implementation Specification**

**Status:** ARCHITECTURE & IMPLEMENTATION PLAN ONLY — PENDING USER APPROVAL  
**Current Baseline:** 327 / 327 backend tests PASSING (100%)  
**Target Migration:** `V19__canonical_indian_location_hierarchy.sql`  

---

## 1. Current-State Findings

A complete inspection of the current database, backend services, and frontend applications reveals the following architecture:

### 1.1 Database State
- **`shops` Table:**
  - Location attributes are stored entirely as unvalidated, denormalized strings or raw floating-point numbers:
    - `address_line_1` (`VARCHAR(255)`), `address_line_2` (`VARCHAR(255)`), `address` (`TEXT`)
    - `city` (`VARCHAR(100)`), `state` (`VARCHAR(100)`), `district` (`VARCHAR(100)`), `area` (`VARCHAR(100)`), `pincode` (`VARCHAR(20)`)
    - `latitude` (`DOUBLE PRECISION`), `longitude` (`DOUBLE PRECISION`), `map_location_url` (`VARCHAR(1000)`)
  - No foreign keys connect `shops` to any location master table.
  - No master location tables exist in the database (verified via PostgreSQL table catalog audit: 35 total tables, 0 location catalog tables).
- **Physical Indexes on `shops` (from V18):**
  - `idx_shops_active_lat_lng` (`latitude, longitude WHERE status = 'ACTIVE' AND latitude IS NOT NULL AND longitude IS NOT NULL`)
  - `idx_shops_status_state` (`status, state WHERE state IS NOT NULL`)
  - `idx_shops_status_city` (`status, city WHERE city IS NOT NULL`)
  - `idx_shops_district` (`district WHERE district IS NOT NULL`)
  - `idx_shops_area` (`area WHERE area IS NOT NULL`)
  - `idx_shops_pincode` (`pincode WHERE pincode IS NOT NULL`)
- **Existing `shops` Records:**
  - `Shop 4` ("John's Premium Cakes"): `city = 'London'`, `state = 'Greater London'`, `district = 'Pune'`, `area = 'Akurdi'`, `pincode = 'NW1 6XE'`, `latitude = 18.65`, `longitude = 73.78`. (Mixed seed data: UK city/state/pincode paired with Indian Pune district, Akurdi area, and Pune coordinates).
  - `Shop 5` ("Mruns bakery"): `city = 'Pune'`, `state = 'Maharashtra'`, `district = NULL`, `area = NULL`, `pincode = '411035'`, coordinates `NULL`.
  - `Shop 17` ("Sweet Delight Bakery"): `city = 'Mumbai'`, `state = 'Maharashtra'`, `district = NULL`, `area = NULL`, `pincode = '400001'`, coordinates `NULL`.

---

## 2. Existing Location Model

| Attribute | Storage Type | Constraint / Validation | Current Reality |
|---|---|---|---|
| `country` | Implicit ("India") | None | Not stored in `shops` table. Implicitly returned as "India" in DTOs. |
| `state` | `VARCHAR(100)` | `@NotBlank` on Register | Plain string. Any value accepted (e.g. "Greater London", "Maharashtra", "Gujarat"). |
| `district` | `VARCHAR(100)` | Optional | Plain string. Often `NULL` in existing shops. |
| `city` | `VARCHAR(100)` | `@NotBlank` on Register | Plain string. No link to state or district. |
| `area` | `VARCHAR(100)` | Optional | Plain string. Often `NULL` in existing shops. |
| `pincode` | `VARCHAR(20)` | `@NotBlank` on Register | Plain string. No format or regex check. Accepts alphanumeric (e.g. "NW1 6XE"). |
| `latitude` | `DOUBLE PRECISION` | Optional | Plain float. Not validated against city/state bounding box. |
| `longitude` | `DOUBLE PRECISION` | Optional | Plain float. Not validated against city/state bounding box. |

### Architectural Deficiencies of the Current Model:
1. **Zero Relationship Validation:** An owner can register with `state = "Gujarat"`, `city = "Pune"`, `district = "Bengaluru Urban"`, and `pincode = "110001"`. The backend accepts this without error.
2. **Missing Hierarchy in Forms:** The owner onboarding form (`onboarding/page.tsx`) collects only `addressLine1`, `city`, `state`, and `pincode`. `district` and `area` are completely missing from the UI, resulting in `NULL` values in the database.
3. **Free-Text Entry & Typos:** Owners can enter "pune", "Pune ", "Poona", "PUNE CITY", preventing standardized aggregation and accurate marketplace filtering.

---

## 3. Hardcoded Location Inventory

Inspection of `frontend_v2` identified four separate hardcoded location sources:

1. **`frontend_v2/components/customer/marketplace/AdvancedLocationFilter.tsx`:**
   - Contains a hardcoded `LOCATION_HIERARCHY` object:
     - Maharashtra: Pune (Pune City, Pimpri-Chinchwad), Mumbai (Mumbai City, Mumbai Suburban), Nagpur (Nagpur Urban), Bhandara (Bhandara City)
     - Karnataka: Bengaluru Urban (Bengaluru)
     - Delhi: New Delhi (Delhi City)
   - *Status:* Limited to 3 states, 6 districts. Hardcoded, disconnected from backend. **Action:** Replace with dynamic cascading API calls in Phase 2.4.
2. **`frontend_v2/lib/constants/indianLocations.ts`:**
   - `INDIAN_POPULAR_PLACES`: 30 hardcoded places with city, state, area.
   - `INDIAN_POPULAR_CITIES`: 12 cities with popular areas.
   - `INDIAN_STATES`: 31 state strings.
   - `MOCK_INDIAN_BAKERIES`: 10 mock bakeries with static addresses.
   - *Status:* Static, prone to desynchronization. **Action:** Deprecate in favor of canonical reference APIs.
3. **`frontend_v2/app/onboarding/page.tsx`:**
   - `<datalist id="onboarding-cities">`: 9 hardcoded city options.
   - `<datalist id="onboarding-states">`: 6 hardcoded state options.
   - *Status:* Free-text input with browser datalist suggestions. **Action:** Upgrade to cascading dropdowns backed by canonical API in Phase 2.4.
4. **`frontend_v2/components/customer/marketplace/IndianCityPills.tsx`:**
   - Iterates over static `INDIAN_POPULAR_CITIES`.
   - *Status:* Already prepared for Phase 2.2 dynamic endpoint. **Action:** Wire to `GET /api/customer/storefront/locations/popular-cities`.

---

## 4. Proposed Architecture: The Hybrid Catalog Model

Three architectural options were evaluated:

- **Option A (Full Relational Normalization with Foreign Keys on `shops`):**
  - Replace `shops.city`, `shops.state`, etc. with `shops.city_id`, `shops.district_id`.
  - *Verdict:* **REJECTED.** Breaks all existing historical records, breaks existing queries, degrades marketplace search performance by forcing 5-table joins on every search request, and violates strict backward compatibility rules.
- **Option B (In-Memory / Static Code Reference Only):**
  - Store hierarchy solely in Java enums or JSON files in memory.
  - *Verdict:* **REJECTED.** Lacks database indexing, cannot be queried efficiently via SQL, makes dynamic updates impossible without code recompilation.
- **Option C (Approved Hybrid Catalog Architecture):**
  - **Canonical Reference Catalog in Database:** A set of dedicated reference tables (`location_countries`, `location_states`, `location_districts`, `location_cities`, `location_localities`, `location_pincodes`) establishing authoritative parent-child relationships.
  - **Authoritative Validation & Cascading APIs:** All cascading dropdowns and registration/profile validation queries the canonical catalog.
  - **Denormalized Strings Retained on `shops`:** The `shops` table continues storing `state`, `district`, `city`, `area`, `pincode`, `latitude`, `longitude` as denormalized strings.
  - **Why Option C is Superior:**
    1. Marketplace search queries (Phase 2.2) continue executing with single-table index scans without multi-table joins.
    2. Historical shop data remains 100% operational without data loss.
    3. New registrations and profile updates are strictly validated server-side.
    4. Clean separation of concerns between business transaction entities (`shops`) and geographic reference data (`locations`).

---

## 5. Database Design (V19 Schema)

The canonical Indian location hierarchy will be implemented in a dedicated table structure prefixed with `location_`:

```
location_countries (India)
       │ 1:N
       ▼
location_states (36 States & UTs)
       │ 1:N
       ▼
location_districts (780+ Districts)
       │ 1:N
       ▼
location_cities (Municipal Corporations, Municipalities, Major Towns)
       │ 1:N
       ▼
location_localities (Sub-localities, Neighborhoods, Villages)
       │ N:1
       ▼
location_pincodes (6-digit Indian PIN codes)
```

### Table Definitions:

```sql
-- 1. Countries
CREATE TABLE location_countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,       -- 'IND'
    name VARCHAR(100) NOT NULL UNIQUE,     -- 'India'
    phone_code VARCHAR(10) NOT NULL,       -- '+91'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. States / Union Territories
CREATE TABLE location_states (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES location_countries(id) ON DELETE RESTRICT,
    code VARCHAR(10) NOT NULL,              -- 'MH', 'KA', 'DL'
    name VARCHAR(100) NOT NULL,             -- 'Maharashtra'
    type VARCHAR(20) NOT NULL DEFAULT 'STATE', -- 'STATE' or 'UNION_TERRITORY'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_state_country_code UNIQUE (country_id, code),
    CONSTRAINT uq_loc_state_country_name UNIQUE (country_id, LOWER(name))
);

-- 3. Districts
CREATE TABLE location_districts (
    id SERIAL PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES location_states(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,             -- 'Pune', 'Bengaluru Urban'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_district_state_name UNIQUE (state_id, LOWER(name))
);

-- 4. Cities / Towns / Municipalities
CREATE TABLE location_cities (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES location_districts(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,             -- 'Pune', 'Pimpri-Chinchwad'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_city_district_name UNIQUE (district_id, LOWER(name))
);

-- 5. Localities / Areas / Neighborhoods
CREATE TABLE location_localities (
    id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL REFERENCES location_cities(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,             -- 'Akurdi', 'Kothrud', 'Indiranagar'
    pincode VARCHAR(6) NOT NULL,            -- '411035', '560038'
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_locality_city_name_pin UNIQUE (city_id, LOWER(name), pincode)
);

-- 6. Pincodes (Fast Verification & Reverse Lookup)
CREATE TABLE location_pincodes (
    pincode VARCHAR(6) PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES location_districts(id) ON DELETE RESTRICT,
    state_id INTEGER NOT NULL REFERENCES location_states(id) ON DELETE RESTRICT,
    office_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Strategic Indexes for Parent-Child Traversal:
```sql
CREATE INDEX idx_loc_states_country ON location_states (country_id) WHERE is_active = true;
CREATE INDEX idx_loc_districts_state ON location_districts (state_id) WHERE is_active = true;
CREATE INDEX idx_loc_cities_district ON location_cities (district_id) WHERE is_active = true;
CREATE INDEX idx_loc_localities_city ON location_localities (city_id) WHERE is_active = true;
CREATE INDEX idx_loc_localities_pincode ON location_localities (pincode) WHERE is_active = true;
CREATE INDEX idx_loc_pincodes_state ON location_pincodes (state_id);
CREATE INDEX idx_loc_pincodes_district ON location_pincodes (district_id);
```

---

## 6. V19 Migration Plan

1. **File Name:** `backend/src/main/resources/db/migration/V19__canonical_indian_location_hierarchy.sql`
2. **Execution Safety:**
   - Completely non-destructive: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
   - Zero `ALTER TABLE shops` or `ALTER TABLE users`.
   - Zero modifications to Flyway migrations V1–V18.
   - Does not touch pre-existing user or shop records.
3. **Repeatability:**
   - Runs seamlessly on fresh CI/CD test databases.
   - Safe in development and production environments.

---

## 7. Canonical Dataset Strategy

### 7.1 Authoritative Data Sources
Data will be compiled strictly from official Government of India open registries:
1. **LGD (Local Government Directory - `lgd.gov.in`):** Ministry of Panchayati Raj, Government of India. Canonical source for States, UTs, and 780+ Districts.
2. **India Post PIN Code Directory (`data.gov.in`):** Department of Posts, Ministry of Communications, Government of India. Authoritative mapping of all Indian PIN codes to delivery offices, talukas, districts, and states.

### 7.2 Staged Seeding Strategy
- **Seed Phase 1 (Baseline Ingest in V19):**
  - India country record (`IND`).
  - All **36 States and Union Territories** (28 States + 8 UTs) with official two-letter postal codes (`MH`, `KA`, `DL`, `TN`, etc.).
  - All **780+ official Districts** across all 36 States/UTs.
  - Major cities, municipal corporations, and initial commercial bakery hubs across Maharashtra, Karnataka, Delhi NCR, Tamil Nadu, Telangana, Gujarat, etc.
  - Official PIN code mappings for these jurisdictions.
- **Seed Phase 2 (Bulk Pincode Expansion):**
  - Idempotent seed runner script (`data/seed_india_pincodes.sql` or repeatable Flyway migration) capable of loading all 19,300+ Indian PIN codes without blocking application startup.

---

## 8. Backend API Design

All location reference endpoints will be grouped under `/api/locations` and mirrored under `/api/customer/storefront/locations` for customer marketplace consistency:

### 8.1 API Endpoints Specification

| Method | Path | Query Params | Description | Auth | Cache TTL | Query Count |
|---|---|---|---|---|---|---|
| `GET` | `/api/locations/countries` | None | Returns active countries | Public | 24 Hours | 1 SQL query |
| `GET` | `/api/locations/states` | `countryCode` (default: 'IND') | Returns all 36 States & UTs | Public | 24 Hours | 1 SQL query |
| `GET` | `/api/locations/districts` | `stateId` (or `stateName`) | Returns districts in state | Public | 24 Hours | 1 SQL query |
| `GET` | `/api/locations/cities` | `districtId` (or `districtName`) | Returns cities in district | Public | 24 Hours | 1 SQL query |
| `GET` | `/api/locations/localities` | `cityId`, `pincode` (optional) | Returns localities in city | Public | 24 Hours | 1 SQL query |
| `GET` | `/api/locations/pincodes/{pincode}` | None | Reverse lookup for 6-digit PIN | Public | 24 Hours | 1 SQL query |
| `POST`| `/api/locations/validate` | Body: `LocationValidationRequest` | Validates full hierarchy | Public | No Cache | 1–2 SQL queries |

### 8.2 DTO Payloads (Lightweight Representation)

```json
// GET /api/locations/states?countryCode=IND
[
  { "id": 1, "code": "MH", "name": "Maharashtra", "type": "STATE" },
  { "id": 2, "code": "KA", "name": "Karnataka", "type": "STATE" },
  { "id": 3, "code": "DL", "name": "Delhi", "type": "UNION_TERRITORY" }
]

// GET /api/locations/districts?stateId=1
[
  { "id": 101, "name": "Pune", "stateId": 1 },
  { "id": 102, "name": "Mumbai Suburban", "stateId": 1 },
  { "id": 103, "name": "Nagpur", "stateId": 1 }
]

// GET /api/locations/pincodes/411035
{
  "pincode": "411035",
  "stateId": 1,
  "stateName": "Maharashtra",
  "districtId": 101,
  "districtName": "Pune",
  "cityId": 201,
  "cityName": "Pimpri-Chinchwad",
  "localities": [
    { "id": 301, "name": "Akurdi" },
    { "id": 302, "name": "Pradhikaran" }
  ]
}
```

---

## 9. Backend Validation Strategy

### 9.1 Server-Side Enforcement Rules
The backend will introduce `LocationValidationService` to execute strict authoritative validation:

```java
@Service
public class LocationValidationService {
    public void validateHierarchy(String state, String district, String city, String area, String pincode) {
        // 1. State must exist in location_states
        LocationState s = stateRepository.findByNameIgnoreCase(state)
            .orElseThrow(() -> new InvalidLocationException("state", "State '" + state + "' is not a recognized Indian State/UT."));

        // 2. District must exist under state
        if (district != null && !district.isBlank()) {
            LocationDistrict d = districtRepository.findByNameIgnoreCaseAndStateId(district, s.getId())
                .orElseThrow(() -> new InvalidLocationException("district", "District '" + district + "' does not belong to State '" + state + "'."));

            // 3. City must exist under district
            if (city != null && !city.isBlank()) {
                LocationCity c = cityRepository.findByNameIgnoreCaseAndDistrictId(city, d.getId())
                    .orElseThrow(() -> new InvalidLocationException("city", "City '" + city + "' does not belong to District '" + district + "'."));
            }
        }

        // 4. Pincode validation
        if (pincode != null && !pincode.isBlank()) {
            validatePincode(pincode, s.getId());
        }
    }
}
```

### 9.2 HTTP Status & Error Contract
When validation fails:
- **HTTP Status:** `400 Bad Request`
- **Response Body:**
  ```json
  {
    "status": 400,
    "error": "INVALID_LOCATION_HIERARCHY",
    "message": "Location hierarchy validation failed.",
    "fieldErrors": {
      "city": "City 'Pune' does not belong to State 'Gujarat'."
    }
  }
  ```

---

## 10. Pincode Strategy

1. **Format Validation:**
   - Must match regex: `^[1-9][0-9]{5}$` (exactly 6 numeric digits, cannot begin with '0').
2. **Geographic Cardinality:**
   - **Many-to-One Locality:** Multiple localities map to a single PIN code (e.g. 411035 covers Akurdi, Pradhikaran, and Sector 24).
   - **One-to-Many City:** A large city contains multiple PIN codes (e.g. Pune contains 411001 to 411062).
   - **District/State Consistency:** The first 2 digits of the PIN code must match the state's postal prefix range (e.g. Maharashtra: 40–44; Karnataka: 56–59; Delhi: 11).
3. **Pincode Autofill:**
   - When an owner enters a valid 6-digit PIN, the frontend can call `GET /api/locations/pincodes/{pincode}` to automatically populate and restrict State, District, and City options.

---

## 11. Existing-Data Strategy

1. **Zero Silent Mutation:**
   - Existing shop rows will **not** be modified, deleted, geocoded, or relocated.
   - Development shop 4 (`city: London`, `state: Greater London`, `district: Pune`) will remain operational.
2. **Dual Validation Policy:**
   - **Strict Enforcement for New Writes:**
     - `POST /api/auth/register` (Bakery Registration)
     - `PUT /api/shops/my-shop` (Owner Profile Location Update)
   - **Permissive Mode for Legacy Reads:**
     - Marketplace search (`GET /api/storefront/shops/search`) continues matching existing string values, preserving visibility for historical bakeries.
3. **Future Voluntary Audit / Correction Flag:**
   - A nullable boolean column `location_verified` can be added in a future phase.
   - Bakery owners with unverified historical locations can be prompted in their dashboard: *"Please confirm your canonical district and city to increase local marketplace visibility."*

---

## 12. Cache Strategy

Geographic location master data is effectively immutable:
1. **Application-Level In-Memory Caching:**
   - Uses Spring `@Cacheable(value = "locations", key = "...")` or ConcurrentHashMap.
   - Cache TTL: **24 Hours**.
   - No external Redis infrastructure required.
2. **HTTP Cache-Control Headers:**
   - Public GET endpoints will emit `Cache-Control: public, max-age=86400, stale-while-revalidate=3600`.
   - Eliminates unnecessary network traffic between client browsers and server.

---

## 13. Performance Strategy

1. **Constant Query Count per Cascading Level:**
   - `GET /states`: **1 query**
   - `GET /districts`: **1 query**
   - `GET /cities`: **1 query**
   - `GET /localities`: **1 query**
   - `GET /pincodes/{pincode}`: **1 query**
   - **Query count is exactly 1 per request**, with zero N+1 database traversals.
2. **B-Tree Index Backing:**
   - All foreign keys and lookup columns (`country_id`, `state_id`, `district_id`, `city_id`, `pincode`) are covered by active B-tree indexes.
   - Anticipated execution time on PostgreSQL: **< 1.0 ms** per reference lookup.

---

## 14. Security

1. **Access Tiers:**
   - **Public (Unauthenticated):**
     - `GET /api/locations/**` (reference lookups for registration, customers, search)
     - `POST /api/locations/validate`
   - **Authenticated (Shop Owner):**
     - Updating shop location (`PUT /api/shops/my-shop`)
   - **Admin Only:**
     - Adding/updating canonical reference data (`POST /api/admin/locations/**`)
2. **Zero Information Disclosure:**
   - Location master tables contain zero user, tenant, revenue, or private shop data. Master tables are purely geographic.

---

## 15. Multi-Tenancy

- Canonical location reference data is **global** (shared across all tenants and marketplace customers).
- Shop location records remain **tenant-scoped** within the `shops` table.
- Existing tenant isolation enforced by `ShopAccessValidator` is preserved: an owner can only modify the location of their own shop (`owner_id = userDetails.getId()`).

---

## 16. Frontend Integration Plan (Phase 2.4/2.5 — Planning Only)

### 16.1 Cascading Dropdown Behavior
The frontend forms (Registration, Onboarding, Owner Settings, Advanced Filter) will implement sequential selection:

```
[Select State] (Loaded on mount from /api/locations/states)
       │ User selects 'Maharashtra'
       ▼
[Select District] (Loaded dynamically from /api/locations/districts?stateId=1)
       │ User selects 'Pune'
       ▼
[Select City / Town] (Loaded dynamically from /api/locations/cities?districtId=101)
       │ User selects 'Pimpri-Chinchwad'
       ▼
[Select Locality] (Loaded dynamically from /api/locations/localities?cityId=201)
       │ User selects 'Akurdi'
       ▼
[Enter Pincode] (Autofilled or validated as '411035')
```

### 16.2 Reverse Pincode Flow
If the user types a 6-digit PIN code first:
- Debounce 400ms -> Call `GET /api/locations/pincodes/411035`.
- Automatically lock and populate State = "Maharashtra", District = "Pune", City = "Pimpri-Chinchwad".
- Present a dropdown of matching localities (e.g. "Akurdi", "Pradhikaran").

---

## 17. Testing Strategy

The test suite for Phase 2.3 will include 20 specific automated test scenarios:

1. **`testCountryLookup`:** Returns India ('IND') as active country.
2. **`testStateLookup`:** Returns all 36 Indian States and Union Territories.
3. **`testDistrictLookupByState`:** Returns districts belonging strictly to the requested state.
4. **`testCityLookupByDistrict`:** Returns cities belonging strictly to the requested district.
5. **`testLocalityLookupByCity`:** Returns localities belonging strictly to the requested city.
6. **`testPincodeLookup`:** Resolves a 6-digit PIN to its canonical state, district, city, and localities.
7. **`testValidHierarchy`:** Valid combination (e.g. Maharashtra -> Pune -> Pune City) passes validation.
8. **`testInvalidStateCityCombination`:** Gujarat -> Pune fails with HTTP 400.
9. **`testInvalidStateDistrictCombination`:** Maharashtra -> Bengaluru Urban fails with HTTP 400.
10. **`testInvalidDistrictCityCombination`:** Pune District -> Mumbai City fails with HTTP 400.
11. **`testInvalidCityLocalityCombination`:** Pune City -> Bandra West fails with HTTP 400.
12. **`testInvalidPincodeFormat`:** 5-digit or alphanumeric pincode fails format check.
13. **`testInvalidPincodeStateMismatch`:** 560001 (Karnataka) paired with Maharashtra fails with HTTP 400.
14. **`testCaseAndWhitespaceNormalization`:** "  pUnE  " correctly resolves to "Pune".
15. **`testExistingHistoricalShopReads`:** Existing shops with missing district/area remain discoverable.
16. **`testPhase22MarketplaceCompatibility`:** Marketplace nearby search and text search continue functioning without degradation.
17. **`testPublicAccessToLocationEndpoints`:** Location reference APIs accessible without JWT.
18. **`testTenantIsolation`:** Owner cannot alter another owner's shop location.
19. **`testDuplicateMasterDataPrevention`:** Database constraints prevent duplicate state/district/city names.
20. **`testQueryCountConstant`:** Cascading lookups execute in exactly 1 SQL query each.

**Regression Requirement:** All 327 existing backend tests must pass with zero failures.

---

## 18. Implementation Sequence

The implementation of Phase 2.3 will be executed across the following sub-phases:

```
Phase 2.3.1: Database Schema & Migration (V19 Flyway script)
      ↓
Phase 2.3.2: Canonical Dataset Seeding (LGD & Postal Directory Ingest)
      ↓
Phase 2.3.3: Backend Entity & Repository Layer (Spring Data JPA)
      ↓
Phase 2.3.4: Location Service & Reference Controller (APIs + Caching)
      ↓
Phase 2.3.5: Authoritative Hierarchy Validation Service
      ↓
Phase 2.3.6: Wire Validation into Registration & Shop Profile Update
      ↓
Phase 2.3.7: Automated Unit, Integration & Performance Verification
```

---

## 19. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Incomplete locality coverage for rural bakeries | Owner cannot find their village | Allow structured fallback: State -> District -> City/Taluk must be canonical; Locality/Village accepts custom string if not yet in catalog. |
| Spelling variations in Indian town names | Owner searches "Bengaluru" vs "Bangalore" | Store canonical names with alternative aliases/synonyms. Implement case-insensitive normalized search. |
| Flyway migration bloat with 19,000 PIN codes | Slow migration in CI/CD | Split into V19 (core structure + States/Districts/Major Cities) and repeatable seed runner for full pincodes. |
| Historical shop breakages | Existing shops become uneditable | Validation applies only to modified fields on new updates. Missing historical fields are backfilled voluntarily. |

---

## 20. Rollback Strategy

1. **Database Rollback:**
   - Drop newly created tables:
     ```sql
     DROP TABLE IF EXISTS location_localities CASCADE;
     DROP TABLE IF EXISTS location_cities CASCADE;
     DROP TABLE IF EXISTS location_districts CASCADE;
     DROP TABLE IF EXISTS location_pincodes CASCADE;
     DROP TABLE IF EXISTS location_states CASCADE;
     DROP TABLE IF EXISTS location_countries CASCADE;
     ```
   - `shops` and `users` tables remain untouched throughout.
2. **Code Rollback:**
   - Revert new controller and validation service commits.
   - Phase 2.2 discovery code remains fully isolated and continues operating normally.

---

## 21. Explicit Non-Goals for Phase 2.3

- **NON-GOAL 1:** Modifying frontend UI or Next.js components (deferred to Phase 2.4/2.5).
- **NON-GOAL 2:** Introducing Leaflet, OpenStreetMap, or interactive map pickers (deferred to Phase 2.5).
- **NON-GOAL 3:** Normalizing `shops` table columns into foreign keys (denormalized strings are preserved).
- **NON-GOAL 4:** Modifying historical shop data or auto-geocoding existing shops.
- **NON-GOAL 5:** Adding Redis or external caching infrastructure.
- **NON-GOAL 6:** Adding PostGIS or proprietary spatial extensions.

---

## 22. Certification Rule & Next Step

This document constitutes the complete architecture and implementation plan for **Phase 2.3**.

**NO SOURCE CODE OR MIGRATION FILES HAVE BEEN CREATED.**  
Execution is stopped pending user review and approval of this plan.
