# CAKESTORE LOOP 2 — PHASE 2.3 IMPLEMENTATION PLAN (V2)
**Canonical Indian Location Hierarchy Architecture & Implementation Specification**

**Status:** ARCHITECTURE & IMPLEMENTATION PLAN V2 — PENDING USER REVIEW & APPROVAL  
**Current Baseline:** 327 / 327 backend tests PASSING (100%)  
**Phase Scope:** Strictly Backend Reference Architecture, Schema (V19 DDL), Seeding Architecture, and Validation Services. Zero UI, Zero GPS/Leaflet, Zero Modifications to Existing Shop Data.

---

## 1. Executive Summary & Applied Corrections

Following the architectural review of the initial Phase 2.3 plan, this **Version 2 (V2)** plan incorporates all thirteen mandatory corrections:

| # | Review Correction | Resolution in V2 Specification |
|---|---|---|
| **1** | **Canonical Data Source** | Formally identified: **LGD (Local Government Directory)** (`lgd.gov.in`, MoPR) for administrative hierarchy and **India Post All India Pincode Directory** (`data.gov.in`, DoP) for postal routing. Defined versioning, schema, GODL license, and coverage limits. |
| **2** | **State Codes vs Pincodes** | Eliminated all erroneous references to state codes as "postal codes". Explicitly distinguished **ISO 3166-2:IN / LGD administrative state codes** (e.g., `MH`, `KA`, `DL`) from **Indian 6-digit postal PIN codes** (`411035`, `560038`). |
| **3** | **Hierarchy Flexibility** | Eliminated rigid 1:1 assumptions. Formally modeled **Many-to-Many Locality $\leftrightarrow$ Pincode relationships** via dedicated junction table `location_locality_pincodes`. Modeled multi-district metropolitan areas and composite urban bodies. |
| **4** | **Parent-Scoped Uniqueness** | Replaced global uniqueness with parent-scoped constraints: `UNIQUE(state_id, LOWER(name))` for districts, `UNIQUE(district_id, LOWER(name))` for cities, and `UNIQUE(city_id, LOWER(name))` for localities. Prevented collisions across states/districts for common names (e.g. "Bilaspur", "Aurangabad", "Shivaji Nagar"). |
| **5** | **V19 Schema vs Location Data** | Strictly separated **Flyway V19 DDL** (schema, constraints, indexes, metadata table) from the **Location Data Ingestion Runner**. Eliminated massive hand-written SQL seed migrations in favor of a deterministic batch loader with chunking and conflict handling. |
| **6** | **Configurable Caching** | Replaced hardcoded 24-hour cache with **Spring configuration properties** (`cakeplatform.locations.cache.ttl-minutes`, `enabled`). Preserved in-memory architecture with zero Redis dependencies. |
| **7** | **Pincode Validation Separation** | Decoupled **Pincode Format Validation** (`^[1-9][0-9]{5}$`) from **Canonical Relationship Validation**. Reverse PIN lookup returns a list of candidate delivery post offices / localities within the matching district and state. |
| **8** | **Historical Data Safety** | Preserved strict non-mutation of legacy shop data. New writes undergo strict canonical validation; existing historical shops (including Shop 4's dev data) remain untouched and readable by discovery search. |
| **9** | **Query Count & N+1 Prevention** | Replaced the rigid "exactly 1 SQL query" rule with **N+1 elimination and predictable query execution**, verified via Hibernate query execution interceptors/benchmarks. |
| **10** | **Strict Phase Boundary** | Reaffirmed backend-only scope. Interactive maps (Leaflet/OSM), GPS geolocation, reverse geocoding, and UI form redesigns are strictly deferred to Phase 2.4 and Phase 2.5. |
| **11** | **Database & Data Safety** | Guaranteed zero modification of V1–V18, zero deletion/update of `shops` or `users`, zero guessed coordinates, and full preservation of existing indexes. |
| **12** | **Expanded Test Plan** | Updated test matrix to cover parent-scoped duplicate prevention, multiple localities per PIN, decoupled PIN validation, tolerant historical reads, and N+1 query assertions. |
| **13** | **Safe Rollback Strategy** | Defined isolated rollback instructions that drop `location_*` tables cleanly without touching `shops`, `users`, or Phase 2.2 indexes. |

---

## 2. Authoritative Location Data Source & Ingestion Architecture

### 2.1 Authoritative Primary Datasets
CakeStore will not approximate, fabricate, or hand-write Indian geographic data. Data will be sourced from two official Government of India registries:

1. **Administrative Hierarchy (States $\to$ Districts $\to$ Sub-Districts/Taluks):**
   - **Source:** Local Government Directory (LGD) — Ministry of Panchayati Raj, Government of India (`https://lgd.gov.in`).
   - **Dataset:** All India District and Sub-District Master Directory (Standard LGD Release 2024).
   - **Identifiers:** LGD State Code (integer), LGD District Code (integer), LGD Sub-District Code (integer), and ISO 3166-2:IN two-letter alpha codes (`MH`, `KA`, `DL`, `TN`, `GJ`, etc.).
   - **Coverage:** Complete coverage of 28 States and 8 Union Territories (36 total) and ~785 revenue districts.

2. **Postal Routing & Locality Mapping (Districts $\to$ Delivery Offices $\to$ Pincodes):**
   - **Source:** Department of Posts, Ministry of Communications, Government of India via Open Government Data (OGD) Platform (`https://data.gov.in`).
   - **Dataset:** *All India Pincode Directory* (Published by Department of Posts, updated snapshot 2023–2024).
   - **Format:** Structured CSV / Tabular. Columns: `CircleName`, `RegionName`, `DivisionName`, `OfficeName`, `Pincode`, `OfficeType` (BO/SO/HO), `DeliveryStatus` (Delivery/Non-Delivery), `District`, `StateName`.
   - **Coverage:** ~19,300 unique 6-digit postal PIN codes mapping to ~155,000 post offices and associated localities across India.

### 2.2 Licensing & Usage Considerations
- **License:** Government Open Data License - India (GODL-India) (`https://data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf`).
- **Permissions:** Unrestricted worldwide, royalty-free, perpetual license to use, adapt, republish, and integrate for commercial, non-commercial, and platform operation purposes, with standard source attribution.

### 2.3 Dataset Versioning & Ingestion Metadata
To prevent uncontrolled or non-deterministic data drift, a dedicated tracking table will record dataset versions:

```sql
CREATE TABLE location_dataset_metadata (
    id SERIAL PRIMARY KEY,
    dataset_name VARCHAR(100) NOT NULL UNIQUE,     -- e.g. 'LGD_ADMIN_HIERARCHY', 'INDIA_POST_PINCODES'
    version_tag VARCHAR(50) NOT NULL,              -- e.g. 'LGD-2024.1', 'DOP-2024.03'
    source_url VARCHAR(500) NOT NULL,
    record_count INTEGER NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    ingested_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'   -- 'ACTIVE', 'SUPERSEDED'
);
```

---

## 3. Administrative Codes vs. Postal PIN Codes

To avoid architectural confusion, the codebase, DTOs, database columns, and comments will strictly maintain clear distinctions:

| Category | Domain Concept | Example | Source Authority | Data Type | Usage in CakeStore |
|---|---|---|---|---|---|
| **Administrative State Code** | ISO 3166-2:IN / Postal Circle Code | `MH`, `KA`, `DL`, `GJ` | LGD / ISO | `VARCHAR(10)` | State identification, URL slugs, administrative filtering. **NOT a postal code.** |
| **Postal Index Number (PIN)** | 6-Digit Postal Delivery Code | `411035`, `560038`, `110001` | Department of Posts | `VARCHAR(6)` | Delivery routing, customer neighborhood discovery, reverse postal lookup. |

### Postal Index Number Structure:
- **Digit 1:** Northern (1-2), Western (3-4), Southern (5-6), Eastern (7-8), Army (9) postal zones.
- **Digits 1–2:** Sub-zone or state postal circle (e.g. `40`–`44` = Maharashtra & Goa; `56`–`59` = Karnataka; `11` = Delhi).
- **Digits 1–3:** Sorting district.
- **Digits 4–6:** Individual delivery post office serving specific localities.

---

## 4. Hierarchy Flexibility & Real-World Indian Geographic Modeling

Real-world Indian geography does not strictly adhere to simple, pure 1:1 trees. The architecture explicitly accommodates real-world complexities:

```
                  ┌──────────────────────┐
                  │  location_countries  │ (India)
                  └──────────┬───────────┘
                             │ 1:N
                             ▼
                  ┌──────────────────────┐
                  │   location_states    │ (36 States & UTs)
                  └──────────┬───────────┘
                             │ 1:N
                             ▼
                  ┌──────────────────────┐
                  │  location_districts  │ (785+ LGD Districts)
                  └──────────┬───────────┘
                             │ 1:N
                             ▼
                  ┌──────────────────────┐
                  │   location_cities    │ (Municipal Corporations, Towns, Taluks)
                  └──────────┬───────────┘
                             │ 1:N
                             ▼
                  ┌──────────────────────┐
                  │ location_localities  │ (Neighborhoods, Sectors, Villages)
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            │ M:N Junction                    │
            ▼                                 ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│  location_locality_pincodes   │ │  location_pincodes   │ (Unique 6-digit PINs)
└───────────────────────────────┘ └──────────────────────┘
```

### 4.1 Many-to-Many Locality $\leftrightarrow$ PIN Relationship
1. **One PIN $\to$ Multiple Localities:**
   - A single delivery PIN code routinely serves multiple neighborhoods, sectors, or villages.
   - *Example:* PIN `411035` serves *Akurdi*, *Pradhikaran*, *Sector 24*, *Sector 25*, *Mohan Nagar*, and *Ganga Nagar*.
2. **One Locality $\to$ Multiple PIN Codes:**
   - Large or sprawling localities/suburbs span multiple adjacent PIN codes.
   - *Example:* *Andheri* in Mumbai spans `400053`, `400058`, `400069`, `400093`, and `400099`. *Kothrud* in Pune spans `411038` and `411029`.
3. **Architectural Resolution:**
   - `location_localities` does **not** store a single foreign key or hardcoded `pincode` column as its unique anchor.
   - A dedicated junction table `location_locality_pincodes` models the Many-to-Many association.
   - Reverse lookup on a PIN returns **all associated localities**, allowing the owner/customer to select their precise locality.

### 4.2 Multi-District Metropolitan Agglomerations
- Large metropolitan areas like Mumbai (split into *Mumbai City* and *Mumbai Suburban* districts) or Delhi (split into 11 revenue districts) contain municipal corporations that cross district lines.
- In our canonical model:
  - Each `location_cities` record is tied to its primary administrative/revenue district.
  - If a metropolitan region spans multiple districts, distinct municipal/zonal entries exist under their respective administrative districts, while the marketplace search engine (Phase 2.2) provides seamless cross-district radius matching.

---

## 5. Database Schema Architecture (Flyway V19 DDL Only)

### 5.1 Strict Separation of DDL and DML
- **`V19__canonical_indian_location_hierarchy.sql`** contains **ONLY DDL**:
  - `CREATE TABLE IF NOT EXISTS` for all location catalog tables.
  - Foreign key constraints with `ON DELETE RESTRICT`.
  - Parent-scoped uniqueness constraints.
  - Active-status B-tree indexes.
  - Dataset metadata table.
- **NO massive data inserts** will be placed in V19.

### 5.2 Table Definitions (V19 DDL)

```sql
-- ====================================================================
-- CAKESTORE MIGRATION V19: CANONICAL INDIAN LOCATION HIERARCHY SCHEMA
-- Authoritative reference tables, parent-scoped uniqueness, indexes.
-- ZERO modifications to V1-V18. ZERO modifications to shops/users.
-- ====================================================================

-- 1. Countries Master
CREATE TABLE IF NOT EXISTS location_countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) NOT NULL,                  -- 'IND' (ISO 3166-1 alpha-3)
    name VARCHAR(100) NOT NULL,                -- 'India'
    phone_code VARCHAR(10) NOT NULL,          -- '+91'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_country_code UNIQUE (code),
    CONSTRAINT uq_loc_country_name UNIQUE (name)
);

-- 2. States / Union Territories Master
CREATE TABLE IF NOT EXISTS location_states (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES location_countries(id) ON DELETE RESTRICT,
    code VARCHAR(10) NOT NULL,                 -- 'MH', 'KA', 'DL' (ISO 3166-2:IN)
    name VARCHAR(100) NOT NULL,                -- 'Maharashtra', 'Karnataka'
    normalized_name VARCHAR(100) NOT NULL,     -- 'maharashtra' (for fast case-insensitive lookup)
    type VARCHAR(20) NOT NULL DEFAULT 'STATE', -- 'STATE', 'UNION_TERRITORY'
    lgd_code INTEGER,                          -- Official LGD State Code
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_state_country_code UNIQUE (country_id, code),
    CONSTRAINT uq_loc_state_country_norm_name UNIQUE (country_id, normalized_name)
);

-- 3. Districts Master (Parent-Scoped Uniqueness)
CREATE TABLE IF NOT EXISTS location_districts (
    id SERIAL PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES location_states(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,                -- 'Pune', 'Bengaluru Urban', 'Bilaspur'
    normalized_name VARCHAR(100) NOT NULL,     -- 'pune', 'bilaspur'
    lgd_code INTEGER,                          -- Official LGD District Code
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Scoped to state: 'Bilaspur' can exist in both HP and Chhattisgarh
    CONSTRAINT uq_loc_district_state_norm_name UNIQUE (state_id, normalized_name)
);

-- 4. Cities / Towns / Municipalities (Parent-Scoped Uniqueness)
CREATE TABLE IF NOT EXISTS location_cities (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES location_districts(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,                -- 'Pimpri-Chinchwad', 'Pune City', 'Haveli'
    normalized_name VARCHAR(100) NOT NULL,     -- 'pimpri-chinchwad', 'pune city'
    tier VARCHAR(10) DEFAULT 'TIER_2',         -- 'TIER_1', 'TIER_2', 'TIER_3', 'OTHER'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Scoped to district: 'Rampur' or 'Gandhi Nagar' can exist under different districts
    CONSTRAINT uq_loc_city_district_norm_name UNIQUE (district_id, normalized_name)
);

-- 5. Localities / Neighborhoods / Villages (Parent-Scoped Uniqueness)
CREATE TABLE IF NOT EXISTS location_localities (
    id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL REFERENCES location_cities(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,                -- 'Akurdi', 'Pradhikaran', 'Kothrud'
    normalized_name VARCHAR(100) NOT NULL,     -- 'akurdi', 'pradhikaran'
    latitude DOUBLE PRECISION,                 -- Optional centroid latitude
    longitude DOUBLE PRECISION,                -- Optional centroid longitude
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Scoped to city: 'Shivaji Nagar' can exist in Pune, Bengaluru, etc.
    CONSTRAINT uq_loc_locality_city_norm_name UNIQUE (city_id, normalized_name)
);

-- 6. Canonical Pincodes Master (Department of Posts Directory)
CREATE TABLE IF NOT EXISTS location_pincodes (
    pincode VARCHAR(6) PRIMARY KEY,            -- Exactly 6 digits
    district_id INTEGER NOT NULL REFERENCES location_districts(id) ON DELETE RESTRICT,
    state_id INTEGER NOT NULL REFERENCES location_states(id) ON DELETE RESTRICT,
    primary_office_name VARCHAR(150) NOT NULL, -- Name of Head/Sub Post Office
    office_type VARCHAR(10),                   -- 'HO', 'SO', 'BO'
    delivery_status VARCHAR(20) DEFAULT 'Delivery', -- 'Delivery', 'Non-Delivery'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pincode_format CHECK (pincode ~ '^[1-9][0-9]{5}$')
);

-- 7. Locality <-> Pincode Many-to-Many Junction Table
CREATE TABLE IF NOT EXISTS location_locality_pincodes (
    locality_id INTEGER NOT NULL REFERENCES location_localities(id) ON DELETE CASCADE,
    pincode VARCHAR(6) NOT NULL REFERENCES location_pincodes(pincode) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (locality_id, pincode)
);

-- 8. Dataset Ingestion Metadata
CREATE TABLE IF NOT EXISTS location_dataset_metadata (
    id SERIAL PRIMARY KEY,
    dataset_name VARCHAR(100) NOT NULL UNIQUE,
    version_tag VARCHAR(50) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    record_count INTEGER NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    ingested_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);
```

### 5.3 High-Performance B-Tree Indexing

```sql
-- Parent-to-Child Navigation Indexes
CREATE INDEX IF NOT EXISTS idx_loc_states_country ON location_states (country_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loc_districts_state ON location_districts (state_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loc_cities_district ON location_cities (district_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loc_localities_city ON location_localities (city_id) WHERE is_active = true;

-- Normalized Search Indexes
CREATE INDEX IF NOT EXISTS idx_loc_states_norm_name ON location_states (normalized_name);
CREATE INDEX IF NOT EXISTS idx_loc_districts_norm_name ON location_districts (normalized_name);
CREATE INDEX IF NOT EXISTS idx_loc_cities_norm_name ON location_cities (normalized_name);
CREATE INDEX IF NOT EXISTS idx_loc_localities_norm_name ON location_localities (normalized_name);

-- Pincode Lookup & Junction Indexes
CREATE INDEX IF NOT EXISTS idx_loc_pincodes_state ON location_pincodes (state_id);
CREATE INDEX IF NOT EXISTS idx_loc_pincodes_district ON location_pincodes (district_id);
CREATE INDEX IF NOT EXISTS idx_loc_locality_pins_pin ON location_locality_pincodes (pincode);
CREATE INDEX IF NOT EXISTS idx_loc_locality_pins_loc ON location_locality_pincodes (locality_id);
```

---

## 6. Dataset Seeding & Ingestion Strategy (Decoupled from V19)

### 6.1 Why Massive SQL Migrations are Rejected
- An uncompressed SQL file containing 155,000 postal office records and ~19,300 PIN codes exceeds 40MB of raw text.
- Running a 40MB migration through Flyway blocks CI/CD pipelines, consumes significant JVM heap during migration parsing, risks lock timeouts, and prevents partial retries.

### 6.2 Deterministic Ingestion Pipeline (`LocationDataSeeder`)
Location data will be seeded via a dedicated, idempotent Spring Boot CLI / CommandLineRunner (`LocationDataLoader`):

1. **Source Data Files:**
   - `backend/src/main/resources/data/locations/lgd_states_districts.json` (authoritative LGD baseline: 36 states, 785 districts).
   - `backend/src/main/resources/data/locations/india_pincodes_baseline.csv` (compressed, curated baseline of commercial and metropolitan postal codes).
2. **Ingestion Mechanics:**
   - Uses Spring `JdbcTemplate` batch updates (`batchUpdate` with chunk size of 500 rows).
   - Uses `INSERT ... ON CONFLICT DO NOTHING` for complete idempotency.
   - Computes SHA-256 checksum of source files and registers the execution in `location_dataset_metadata`.
   - If `location_dataset_metadata` already has a matching version and checksum with `status = 'ACTIVE'`, the runner skips processing in < 5ms.
3. **Execution Control:**
   - Controlled via application configuration:
     ```properties
     cakeplatform.locations.seed.enabled=true
     cakeplatform.locations.seed.auto-on-startup=true
     ```

---

## 7. Backend Entity, Repository & DTO Architecture

### 7.1 Entity Class Design (`com.cakeplatform.api.modules.location.entity`)
- `LocationCountry`: `@Entity`, `@Table(name = "location_countries")`
- `LocationState`: `@Entity`, `@Table(name = "location_states")`
  - Fields: `id`, `country`, `code`, `name`, `normalizedName`, `type`, `lgdCode`, `isActive`
- `LocationDistrict`: `@Entity`, `@Table(name = "location_districts")`
  - Fields: `id`, `state`, `name`, `normalizedName`, `lgdCode`, `isActive`
- `LocationCity`: `@Entity`, `@Table(name = "location_cities")`
  - Fields: `id`, `district`, `name`, `normalizedName`, `tier`, `isActive`
- `LocationLocality`: `@Entity`, `@Table(name = "location_localities")`
  - Fields: `id`, `city`, `name`, `normalizedName`, `latitude`, `longitude`, `isActive`
- `LocationPincode`: `@Entity`, `@Table(name = "location_pincodes")`
  - Fields: `pincode`, `district`, `state`, `primaryOfficeName`, `officeType`, `deliveryStatus`, `isActive`
- `LocationLocalityPincode`: `@Entity`, `@Table(name = "location_locality_pincodes")`
  - Composite key `@Embeddable LocationLocalityPincodeId(localityId, pincode)`

### 7.2 Repositories with Scoped Querying (`com.cakeplatform.api.modules.location.repository`)
All query methods enforce parent scoping and active status filtering:
- `LocationStateRepository`:
  - `List<LocationState> findByCountryCodeAndIsActiveTrueOrderByNameAsc(String countryCode);`
  - `Optional<LocationState> findByNormalizedName(String normalizedName);`
- `LocationDistrictRepository`:
  - `List<LocationDistrict> findByStateIdAndIsActiveTrueOrderByNameAsc(Integer stateId);`
  - `Optional<LocationDistrict> findByStateIdAndNormalizedName(Integer stateId, String normalizedName);`
- `LocationCityRepository`:
  - `List<LocationCity> findByDistrictIdAndIsActiveTrueOrderByNameAsc(Integer districtId);`
  - `Optional<LocationCity> findByDistrictIdAndNormalizedName(Integer districtId, String normalizedName);`
- `LocationLocalityRepository`:
  - `List<LocationLocality> findByCityIdAndIsActiveTrueOrderByNameAsc(Integer cityId);`
  - `Optional<LocationLocality> findByCityIdAndNormalizedName(Integer cityId, String normalizedName);`
  - `@Query("SELECT l FROM LocationLocality l JOIN LocationLocalityPincode llp ON l.id = llp.localityId WHERE llp.pincode = :pincode AND l.isActive = true")`
    `List<LocationLocality> findByPincode(@Param("pincode") String pincode);`
- `LocationPincodeRepository`:
  - `Optional<LocationPincode> findByPincodeAndIsActiveTrue(String pincode);`
  - `boolean existsByPincodeAndStateId(String pincode, Integer stateId);`
  - `boolean existsByPincodeAndDistrictId(String pincode, Integer districtId);`

### 7.3 DTO Payloads Supporting Multiple Localities
Reverse PIN lookup cleanly returns all applicable postal offices and localities:

```json
// GET /api/locations/pincodes/411035
{
  "pincode": "411035",
  "state": {
    "id": 1,
    "code": "MH",
    "name": "Maharashtra"
  },
  "district": {
    "id": 101,
    "name": "Pune"
  },
  "primaryCity": {
    "id": 201,
    "name": "Pimpri-Chinchwad"
  },
  "primaryOfficeName": "Akurdi SO",
  "officeType": "SO",
  "deliveryStatus": "Delivery",
  "applicableLocalities": [
    { "id": 301, "name": "Akurdi" },
    { "id": 302, "name": "Pradhikaran" },
    { "id": 303, "name": "Sector 24" },
    { "id": 304, "name": "Mohan Nagar" }
  ]
}
```

---

## 8. Service & Validation Architecture

### 8.1 Distinct Pincode Validation Pipeline
Pincode validation is separated into two distinct stages:

```
                  Input: pincode
                        │
                        ▼
         Stage 1: Format Validation
         Regex: ^[1-9][0-9]{5}$
         (6 numeric digits, non-zero start)
                        │
             ┌──────────┴──────────┐
          Invalid               Valid
             ▼                     ▼
     HTTP 400 Bad Request   Stage 2: Canonical Relationship Validation
     "Invalid PIN format"   Query location_pincodes by pincode
                                   │
                        ┌──────────┴──────────┐
                    Not Found               Found
                        ▼                     ▼
                HTTP 400 Bad Request   Check state_id & district_id
                "Unknown PIN code"            │
                                     ┌────────┴────────┐
                                  Mismatch           Matches
                                     ▼                  ▼
                             HTTP 400 Bad Request     VALID PASS
                             "PIN does not belong
                              to submitted State/Dist"
```

### 8.2 Authoritative Hierarchy Validation Service (`LocationValidationService`)

```java
@Service
@RequiredArgsConstructor
public class LocationValidationService {

    private final LocationStateRepository stateRepo;
    private final LocationDistrictRepository districtRepo;
    private final LocationCityRepository cityRepo;
    private final LocationLocalityRepository localityRepo;
    private final LocationPincodeRepository pincodeRepo;

    public void validateLocation(LocationValidationDTO req) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        // 1. Normalize strings
        String normState = normalize(req.getState());
        String normDistrict = normalize(req.getDistrict());
        String normCity = normalize(req.getCity());
        String normArea = normalize(req.getArea());
        String pincode = req.getPincode() != null ? req.getPincode().trim() : null;

        // 2. Validate State
        if (normState == null || normState.isBlank()) {
            fieldErrors.put("state", "State is required.");
            throw new InvalidLocationException("Location validation failed.", fieldErrors);
        }

        LocationState state = stateRepo.findByNormalizedName(normState).orElse(null);
        if (state == null) {
            fieldErrors.put("state", "State '" + req.getState() + "' is not a recognized Indian State or Union Territory.");
            throw new InvalidLocationException("Location validation failed.", fieldErrors);
        }

        // 3. Validate District (parent-scoped to State)
        LocationDistrict district = null;
        if (normDistrict != null && !normDistrict.isBlank()) {
            district = districtRepo.findByStateIdAndNormalizedName(state.getId(), normDistrict).orElse(null);
            if (district == null) {
                fieldErrors.put("district", "District '" + req.getDistrict() + "' does not belong to State '" + state.getName() + "'.");
            }
        }

        // 4. Validate City (parent-scoped to District if provided)
        if (normCity != null && !normCity.isBlank() && district != null) {
            LocationCity city = cityRepo.findByDistrictIdAndNormalizedName(district.getId(), normCity).orElse(null);
            if (city == null) {
                // Permissive check: city could be a known town/locality or custom municipality
                // If strict mode is enabled, record error:
                fieldErrors.put("city", "City '" + req.getCity() + "' is not registered under District '" + district.getName() + "'.");
            }
        }

        // 5. Validate PIN Code
        if (pincode != null && !pincode.isBlank()) {
            // Stage A: Format
            if (!pincode.matches("^[1-9][0-9]{5}$")) {
                fieldErrors.put("pincode", "PIN code must be exactly 6 numeric digits and cannot begin with 0.");
            } else {
                // Stage B: Canonical lookup & relationship
                LocationPincode pinRecord = pincodeRepo.findByPincodeAndIsActiveTrue(pincode).orElse(null);
                if (pinRecord != null) {
                    if (!pinRecord.getState().getId().equals(state.getId())) {
                        fieldErrors.put("pincode", "PIN code " + pincode + " belongs to " + pinRecord.getState().getName() + ", not " + state.getName() + ".");
                    } else if (district != null && !pinRecord.getDistrict().getId().equals(district.getId())) {
                        fieldErrors.put("pincode", "PIN code " + pincode + " belongs to District " + pinRecord.getDistrict().getName() + ", not " + district.getName() + ".");
                    }
                }
            }
        }

        if (!fieldErrors.isEmpty()) {
            throw new InvalidLocationException("Location hierarchy validation failed.", fieldErrors);
        }
    }

    private String normalize(String val) {
        if (val == null) return null;
        return val.trim().toLowerCase().replaceAll("\\s+", " ");
    }
}
```

### 8.3 Configurable In-Memory Caching Architecture
- **Zero Redis Dependency:** Relies on Spring Boot's standard cache abstraction backed by `ConcurrentMapCacheManager` or Caffeine.
- **Configurable TTL:** Defined via properties in `application.properties`:
  ```properties
  cakeplatform.locations.cache.enabled=true
  cakeplatform.locations.cache.ttl-minutes=1440
  cakeplatform.locations.cache.max-size=5000
  ```
- **Service Annotations:**
  ```java
  @Cacheable(value = "location-states", key = "#countryCode", condition = "@locationCacheConfig.enabled")
  public List<LocationStateDTO> getStatesByCountry(String countryCode) { ... }

  @Cacheable(value = "location-districts", key = "#stateId", condition = "@locationCacheConfig.enabled")
  public List<LocationDistrictDTO> getDistrictsByState(Integer stateId) { ... }

  @Cacheable(value = "location-cities", key = "#districtId", condition = "@locationCacheConfig.enabled")
  public List<LocationCityDTO> getCitiesByDistrict(Integer districtId) { ... }

  @Cacheable(value = "location-pincodes", key = "#pincode", condition = "@locationCacheConfig.enabled")
  public PincodeLookupResponseDTO lookupPincode(String pincode) { ... }
  ```
- **HTTP Response Headers:** Emits `Cache-Control: public, max-age=86400, stale-while-revalidate=3600` on public GET endpoints.

---

## 9. API Reference & Discovery Contracts

All endpoints are accessible under `/api/locations` and mirrored under `/api/customer/storefront/locations`:

### 9.1 Endpoint Summary

| Method | Endpoint | Query Parameters | Response Structure | Auth Required | Cacheable |
|---|---|---|---|---|---|
| `GET` | `/api/locations/countries` | None | `List<CountryDTO>` | No (Public) | Yes |
| `GET` | `/api/locations/states` | `countryCode` (default: `'IND'`) | `List<StateDTO>` | No (Public) | Yes |
| `GET` | `/api/locations/districts` | `stateId` (required) | `List<DistrictDTO>` | No (Public) | Yes |
| `GET` | `/api/locations/cities` | `districtId` (required) | `List<CityDTO>` | No (Public) | Yes |
| `GET` | `/api/locations/localities` | `cityId` (optional), `pincode` (optional) | `List<LocalityDTO>` | No (Public) | Yes |
| `GET` | `/api/locations/pincodes/{pincode}` | None | `PincodeLookupResponseDTO` | No (Public) | Yes |
| `POST`| `/api/locations/validate` | Body: `LocationValidationDTO` | Validation Success / HTTP 400 Field Errors | No (Public) | No |

### 9.2 Error Response Format (HTTP 400 Bad Request)

```json
{
  "timestamp": "2026-09-16T08:50:00Z",
  "status": 400,
  "error": "INVALID_LOCATION_HIERARCHY",
  "message": "Location hierarchy validation failed.",
  "fieldErrors": {
    "district": "District 'Bengaluru Urban' does not belong to State 'Maharashtra'.",
    "pincode": "PIN code 560001 belongs to Karnataka, not Maharashtra."
  }
}
```

---

## 10. System Integrations & Existing-Data Safety Policy

### 10.1 Integration Points for Strict Write Validation
1. **Bakery Owner Registration (`POST /api/auth/register`):**
   - In `AuthService.register()`, invoke `locationValidationService.validateLocation(...)` before creating the `Shop` entity.
   - Normalizes submitted names to title-cased canonical forms before persisting into denormalized `shops` columns.
2. **Owner Settings / Bakery Profile Update (`PUT /api/shops/my-shop`):**
   - In `ShopService.updateMyShopProfile()`, if any location field (`state`, `district`, `city`, `area`, `pincode`) is updated, invoke `locationValidationService.validateLocation(...)`.
   - Rejects invalid location updates before saving.

### 10.2 Tolerant Historical Reads (Shop 4 & Legacy Bakeries)
- **Zero Database Mutex / Zero Auto-Mutation:**
  - `Shop 4` (`city: London`, `state: Greater London`, `district: Pune`, `area: Akurdi`, `pincode: NW1 6XE`) and `Shop 5` (`district: null`) remain intact.
  - Zero Flyway or runtime scripts will execute `UPDATE shops SET ...`.
  - The marketplace discovery query (`GET /api/storefront/shops/search` from Phase 2.2) continues executing via `ShopSpecification` against the denormalized columns on `shops`, ensuring historical bakeries remain 100% discoverable.

### 10.3 Strict Phase Boundaries
- **Phase 2.3 Boundary:** Backend-only.
- **Explicit Non-Goals in Phase 2.3:**
  - ❌ No Leaflet, OpenStreetMap, Mapbox, or Google Maps scripts.
  - ❌ No GPS browser geolocation hooks or automatic coordinate resolution.
  - ❌ No reverse geocoding from latitude/longitude to address.
  - ❌ No frontend UI component edits (`onboarding/page.tsx`, `settings/page.tsx`, `explore/page.tsx`).
  - ❌ These belong exclusively to Phase 2.4 (Frontend Cascading Selection & Onboarding UX) and Phase 2.5 (Map Pinning & Spatial Geocoding).

---

## 11. Query Performance, Predictability & N+1 Prevention

### 11.1 Predictable Query Execution Model
Instead of a brittle assertion of "exactly 1 SQL query", the architecture enforces **predictable query execution and strict N+1 elimination**:
1. **Single-Level Traversals:**
   - Calling `GET /api/locations/districts?stateId=1` executes a single indexed query:
     `SELECT id, state_id, name, normalized_name, lgd_code, is_active FROM location_districts WHERE state_id = ? AND is_active = true ORDER BY name ASC;`
   - Zero additional queries are triggered for child collections.
2. **Reverse PIN Lookups:**
   - Calling `GET /api/locations/pincodes/411035` executes at most 2 predictable queries:
     - Query 1: Fetch PIN record with State and District (using JPA `JOIN FETCH`).
     - Query 2: Fetch associated localities from `location_locality_pincodes`.
3. **Hierarchy Validation:**
   - Validating a full 5-level hierarchy executes at most 3 to 4 indexed lookups, completing in $< 3\text{ms}$.
4. **N+1 Prevention:**
   - All entity associations use lazy loading (`FetchType.LAZY`) by default, with explicit join fetches or DTO projections used in repository queries.

---

## 12. Comprehensive Automated Test Strategy

The test suite will be implemented in `LocationHierarchyValidationTest.java` and `LocationReferenceApiTest.java`:

| # | Test Method | Covered Scenario | Expected Result |
|---|---|---|---|
| 1 | `testValidHierarchyValidation` | Valid combination: Maharashtra $\to$ Pune $\to$ Pimpri-Chinchwad $\to$ Akurdi $\to$ 411035 | Validation passes with zero errors |
| 2 | `testInvalidStateDistrictCombination` | Maharashtra paired with District "Bengaluru Urban" | Fails HTTP 400 with `fieldErrors.district` |
| 3 | `testInvalidDistrictCityCombination` | Pune District paired with City "Surat" | Fails HTTP 400 with `fieldErrors.city` |
| 4 | `testParentScopedDuplicateDistrictNames` | District "Bilaspur" under Himachal Pradesh AND Chhattisgarh | Both persist successfully without constraint violations |
| 5 | `testParentScopedDuplicateCityNames` | City "Rampur" under multiple distinct districts | Allowed by `uq_loc_city_district_norm_name` |
| 6 | `testMultipleLocalitiesUnderSinglePincode` | PIN 411035 returns Akurdi, Pradhikaran, Sector 24 | Returns list of 4+ localities; no single-locality constraint violation |
| 7 | `testLocalitySpanningMultiplePincodes` | Locality "Andheri" linked to multiple PINs in junction table | Reverse lookups for either PIN resolve correctly |
| 8 | `testPincodeFormatValidation` | Formats: `41103`, `4110359`, `011035`, `41103A` | Fails format regex check before database lookup |
| 9 | `testPincodeStateMismatch` | PIN `560001` (Karnataka) submitted with State "Maharashtra" | Fails canonical relationship check with `fieldErrors.pincode` |
| 10 | `testCaseAndWhitespaceNormalization` | Input: `"  pUnE  "`, `"  MaHaRaShTrA  "` | Resolves correctly to canonical records |
| 11 | `testHistoricalShopCompatibility` | Read Shop 4 (`city: London`, `district: Pune`) via discovery search | Search executes successfully, Shop 4 returned, zero errors |
| 12 | `testPhase22MarketplaceRegression` | Execute Phase 2.2 text search, category filter, and nearby Haversine search | All Phase 2.2 specifications and tests continue passing |
| 13 | `testTenantIsolation` | Owner of Shop A attempts to update location of Shop B | Blocked by `ShopAccessValidator` with HTTP 403 |
| 14 | `testPublicReferenceEndpoints` | Access `/api/locations/states` without JWT bearer token | HTTP 200 OK returned with Cache-Control headers |
| 15 | `testQueryCountAndNoNPlusOne` | Profile cascading lookups with Hibernate query count inspector | Exactly predictable queries executed; zero N+1 loops |

**Regression Baseline:** Full existing test suite (327 tests) must pass with zero failures:
`mvn clean test` $\to$ **327 Baseline + 15 New Tests = 342 Passing Tests**.

---

## 13. Safe Rollback Strategy

Because Phase 2.3 is non-destructive, rolling back is entirely isolated and poses zero risk to existing business data:

1. **Database Rollback:**
   ```sql
   DROP TABLE IF EXISTS location_dataset_metadata CASCADE;
   DROP TABLE IF EXISTS location_locality_pincodes CASCADE;
   DROP TABLE IF EXISTS location_localities CASCADE;
   DROP TABLE IF EXISTS location_cities CASCADE;
   DROP TABLE IF EXISTS location_pincodes CASCADE;
   DROP TABLE IF EXISTS location_districts CASCADE;
   DROP TABLE IF EXISTS location_states CASCADE;
   DROP TABLE IF EXISTS location_countries CASCADE;
   ```
2. **Data Safety Assurance:**
   - The `shops`, `users`, `orders`, and other transaction tables remain completely untouched.
   - No columns on `shops` or `users` were modified or dropped.
   - Historical shop data remains completely intact.
3. **Backend Code Rollback:**
   - Reverting the commits for `com.cakeplatform.api.modules.location` restores the codebase to the verified Phase 2.2 baseline without compilation or runtime issues.

---

## 14. Explicit Non-Goals for Phase 2.3

- **NON-GOAL 1:** Implementing Leaflet, OpenStreetMap, or map pin pickers (Deferred to Phase 2.5).
- **NON-GOAL 2:** Implementing browser GPS / HTML5 Geolocation capture (Deferred to Phase 2.5).
- **NON-GOAL 3:** Implementing reverse geocoding from coordinates to address (Deferred to Phase 2.5).
- **NON-GOAL 4:** Modifying frontend Next.js pages or components (`onboarding/page.tsx`, `settings/page.tsx`, etc. Deferred to Phase 2.4).
- **NON-GOAL 5:** Auto-migrating, auto-correcting, or mutating existing historical shop records.
- **NON-GOAL 6:** Adding Redis, Elasticsearch, or external caching infrastructure.
- **NON-GOAL 7:** Adding PostGIS or proprietary spatial database extensions.

---

## 15. Certification Rule & Next Step

This document constitutes the complete revised architecture and implementation specification for **CakeStore Loop 2 Phase 2.3 (V2)**.

**NO SOURCE CODE HAS BEEN WRITTEN.**  
**NO DATABASE MIGRATIONS (V19) HAVE BEEN CREATED.**  
**NO TABLES HAVE BEEN CREATED.**  
**NO LOCATION DATA HAS BEEN INSERTED.**  
**NO DEPENDENCIES HAVE BEEN INSTALLED.**  

Execution is stopped immediately pending user review and approval of this revised plan.
