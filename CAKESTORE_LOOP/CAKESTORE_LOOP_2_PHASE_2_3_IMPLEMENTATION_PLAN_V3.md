# CAKESTORE LOOP 2 — PHASE 2.3 IMPLEMENTATION PLAN (V3)
**Canonical Indian Location Hierarchy Architecture & Implementation Specification**

**Status:** ARCHITECTURE & IMPLEMENTATION PLAN V3 — PENDING USER REVIEW & APPROVAL  
**Current Baseline:** 327 / 327 backend tests PASSING (100%)  
**Phase Scope:** Strictly Backend Reference Architecture, Schema (V19 DDL), Seeding & Reconciliation Pipeline, and Validation Services. Zero UI, Zero GPS/Leaflet, Zero External Runtime APIs, Zero Modifications to Existing Shop Data.

---

## 1. Executive Summary & Applied V3 Corrections

This **Version 3 (V3)** plan expands upon V2 by incorporating all mandatory corrections required to achieve production readiness and complete architectural determinism:

| # | V3 Review Correction | Architectural Resolution in V3 Specification |
|---|---|---|
| **1** | **Explicit Data Source for Every Level** | Established a comprehensive source matrix for all 6 tiers: Country (ISO), State/UT (LGD), District (LGD), City/Town/Municipality (LGD Urban Local Bodies & Census Towns), Locality/Village (India Post Delivery Offices & LGD Wards), and Pincode (Department of Posts). Defined canonical reconciliation rules between LGD and India Post. |
| **2** | **Reconciliation Engine (Insert, Update, Deprecate)** | Transformed the data loader from an `ON CONFLICT DO NOTHING` inserter into a complete **Dataset Reconciliation Engine**: `NEW` $\to$ `INSERT`, `UNCHANGED` $\to$ `KEEP`, `CHANGED` $\to$ `UPDATE`, `REMOVED/DEPRECATED` $\to$ mark `is_active = false` (soft deprecation). Guaranteed zero automatic modification to `shops`, `users`, `orders`, `products`, or historical location strings. |
| **3** | **Dataset Versioning & Active State Tracking** | Structured `location_dataset_metadata` with explicit lifecycle statuses: `LOADING`, `READY`, `FAILED`, `SUPERSEDED`. Tracks dataset name, source, source version, timestamp, checksum, record counts, and loader results. |
| **4** | **Startup & Readiness Safety (Fail-Closed Gate)** | Established strict operational sequencing: Flyway V19 DDL $\to$ Dataset Verification/Reconciliation $\to$ Integrity & Count Checks $\to$ Mark `READY`. Introduced `LocationReadinessState` gate: any location write attempted while not `READY` **fails closed** with `HTTP 503 Service Unavailable`, preventing partial-catalog validation failures or silent bypasses. |
| **5** | **Explicit Persistence Strategy per Table** | Explicitly defined persistence mechanism for each table: JPA Entity + Spring Data Repository for hierarchical querying and DTO projections; hybrid `JdbcTemplate` for high-throughput batch reconciliation without Hibernate entity-state overhead; specialized handling for `location_locality_pincodes` and `location_dataset_metadata`. |
| **6** | **Preservation of Existing Architecture** | Strictly prohibited PostGIS, Redis, external runtime geocoding APIs, and unnecessary ORM frameworks. Kept within Spring Data JPA, `JdbcTemplate`, and PostgreSQL standard B-tree indexing. |
| **7** | **Historical Shop Data Rule** | Reaffirmed absolute preservation: existing shops (including Shop 4's dev data) remain untouched and readable. Zero auto-mutation, repair, or geocoding. Strict canonical validation applies only to new writes. |
| **8** | **Phase Boundary** | Strictly backend-only. UI dropdowns, GPS, Leaflet, and search UI remain in Phase 2.4 and Phase 2.5. |

---

## 2. Comprehensive Location Data Source Matrix

CakeStore will not approximate, synthesize, or manually invent location records. Every single geographic tier maps to an authoritative official Government of India registry:

### 2.1 Exhaustive Tier-by-Tier Source Matrix

| Hierarchy Tier | Authoritative Primary Source | Source Version / Release | Identifier / Code | Parent Relationship | Update & Maintenance Process |
|---|---|---|---|---|---|
| **1. Country** | ISO 3166-1 / Survey of India | ISO 3166-1:2020 | ISO Alpha-3: `IND`, Alpha-2: `IN`, Dialing: `+91` | Root Tier (No parent) | Static configuration; rarely changes. |
| **2. State / Union Territory** | Local Government Directory (LGD), Ministry of Panchayati Raj (MoPR) | LGD Master Release 2024.1 | LGD State Code (Integer) + ISO 3166-2:IN (`MH`, `KA`, `DL`, `TN`, etc.) | References `location_countries.id` | Semi-annual review against official Gazettes of India. |
| **3. District** | Local Government Directory (LGD), Ministry of Panchayati Raj (MoPR) | LGD Master Release 2024.1 | LGD District Code (Integer, e.g. `492` for Pune, `505` for Bengaluru Urban) | References `location_states.id` | Reconciled against MoPR state-level district reorganizations. |
| **4. City / Town / Municipality** | MoHUA Urban Local Bodies (ULB) Directory & Census of India Statutory Towns | MoHUA / LGD ULB Master 2024 | LGD ULB Code (e.g. Municipal Corporation, Municipality, Town Panchayat) or Sub-District/Taluk Code | References `location_districts.id` | Ingested via official municipal corporation and taluk master lists. |
| **5. Locality / Area / Village** | Department of Posts (DoP) Delivery Post Offices Directory & LGD Wards | India Post Directory 2024 via `data.gov.in` | Post Office Name / Sub-Office Code + LGD Ward Code | References `location_cities.id` | Updated quarterly from India Post delivery office updates. |
| **6. Pincode / Postal Area** | Department of Posts (DoP), Ministry of Communications | All India Pincode Directory (DoP 2024 snapshot via `data.gov.in`) | 6-Digit Postal Index Number (PIN) (e.g. `411035`) | References `district_id` & `state_id`, mapped to Localities via junction | Updated on new post office / PIN circulars published by India Post. |

### 2.2 Canonical Source Reconciliation (LGD $\leftrightarrow$ India Post)
Because administrative districts and postal circles are managed by two distinct government bodies (Ministry of Panchayati Raj vs. Department of Posts), boundary and naming differences exist. CakeStore reconciles these datasets using the following deterministic protocol:

```
[LGD Master Directory]                [India Post Pincode Directory]
(Authoritative for States/Districts)   (Authoritative for Delivery Offices/PINs)
          │                                      │
          ▼                                      ▼
[Canonical States & Districts]         [Raw Postal Records: State, District, PIN, Office]
          │                                      │
          └──────────────────┬───────────────────┘
                             ▼
               [District Name Normalizer]
       - Strip prefixes/suffixes: "District", "Urban", "Rural"
       - Known Alias Mapping Table:
         * "Bangalore" / "Bengaluru" -> "Bengaluru Urban" (LGD: 505)
         * "Poona" / "Pune"          -> "Pune" (LGD: 492)
         * "Ahmednagar" / "Ahilyanagar" -> "Ahmednagar" (LGD: 490)
         * "Gurgaon" / "Gurugram"    -> "Gurugram" (LGD: 64)
                             │
                             ▼
         [Reconciled Canonical Graph in Database]
         - State & District anchor: LGD ID
         - Delivery Localities & PINs mapped to reconciled LGD District
```

- If an India Post record lists a historical or alternate name, the **Canonical LGD record** serves as the authoritative primary name, while alternate spellings are indexed in `location_aliases` for resilient matching.
- Under **NO circumstances** will implementation code invent, fake, or extrapolate unverified cities or localities.

---

## 3. Authoritative Reconciliation Engine (Not Just Insert)

The location data loader is a **full-lifecycle reconciliation engine**, not a naive one-off insert script:

### 3.1 Lifecycle Action State Machine

```
              Input: Canonical Source Record
                            │
                            ▼
          Compare against DB by Unique Natural Key
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    [Not in DB]         [In DB]           [In DB, Missing
         │                  │              from Source]
         ▼                  ▼                  ▼
    ACTION: INSERT     Compare Hashes    ACTION: DEPRECATE
    - New record       - Identical: KEEP - Soft deprecation
    - Set active=true  - Modified: UPDATE- Set active=false
                       - Refresh fields  - Preserve FK links
```

1. **NEW RECORD $\to$ INSERT:**
   - Record does not exist in the database table under its parent-scoped unique key.
   - Action: `INSERT INTO location_* (...) VALUES (...);` with `is_active = true`, `created_at = CURRENT_TIMESTAMP`.
2. **UNCHANGED RECORD $\to$ KEEP:**
   - Record exists and all attributes (casing, LGD code, tier, coordinates) match the incoming canonical source.
   - Action: No database write. Record remains untouched; `updated_at` is preserved.
3. **CHANGED CANONICAL RECORD $\to$ UPDATE:**
   - Record exists but canonical metadata has evolved (e.g. municipality elevated from `TIER_3` to `TIER_2`, official English transliteration adjusted, or centroid coordinates refined).
   - Action: `UPDATE location_* SET name = ?, tier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`.
   - Safe and backward-compatible: Does not break foreign keys.
4. **REMOVED / MERGED SOURCE RECORD $\to$ DEPRECATE (SOFT):**
   - Record exists in the database but is absent from the latest official government release (e.g. an old village panchayat merged into a municipal corporation).
   - Action: `UPDATE location_* SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`.
   - **NEVER DESTRUCTIVELY DELETE (`DELETE`)**: Prevents foreign key constraint violations and maintains relational stability for any existing referencing records.

### 3.2 Strict Data Isolation Boundaries
> [!CAUTION]
> **ABSOLUTE DATA PROTECTION RULE**:
> The location reconciliation engine applies **EXCLUSIVELY** to the canonical reference tables (`location_*`).
> 
> The reconciliation engine must **NEVER**:
> - Execute `UPDATE`, `DELETE`, or `ALTER` on `shops`.
> - Execute `UPDATE`, `DELETE`, or `ALTER` on `users`, `orders`, `products`, `subscriptions`, or `payments`.
> - Rewrite, normalize, or overwrite historical shop location strings (such as Shop 4's dev data).
> - Guess or auto-assign location IDs to existing shop records.

---

## 4. Dataset Versioning & Active State Tracking

### 4.1 Schema for `location_dataset_metadata`

```sql
CREATE TABLE IF NOT EXISTS location_dataset_metadata (
    id SERIAL PRIMARY KEY,
    dataset_name VARCHAR(100) NOT NULL UNIQUE,       -- 'LGD_ADMIN_HIERARCHY', 'INDIA_POST_PINCODES'
    source_authority VARCHAR(150) NOT NULL,          -- 'Ministry of Panchayati Raj (lgd.gov.in)'
    source_version VARCHAR(50) NOT NULL,             -- '2024.1'
    source_url VARCHAR(500) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    states_count INTEGER NOT NULL DEFAULT 0,
    districts_count INTEGER NOT NULL DEFAULT 0,
    cities_count INTEGER NOT NULL DEFAULT 0,
    localities_count INTEGER NOT NULL DEFAULT 0,
    pincodes_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'LOADING',   -- 'LOADING', 'READY', 'FAILED', 'SUPERSEDED'
    loader_summary TEXT,                             -- e.g. "Inserted: 785, Updated: 0, Deprecated: 0"
    started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITHOUT TIME ZONE
);
```

### 4.2 Lifecycle Status Transitions
- **`LOADING`**: Set atomically when reconciliation starts. Signifies catalog is in flux.
- **`READY`**: Set only after all records are ingested, foreign keys validated, and count assertions passed.
- **`FAILED`**: Set if checksum mismatch, parsing error, or count threshold failure occurs. Includes exception message in `loader_summary`.
- **`SUPERSEDED`**: Previous active dataset when a new verified dataset version is promoted.

---

## 5. Startup & Readiness Sequencing (Fail-Closed Gate)

To prevent partial-catalog validation failures (e.g. an owner attempting registration while cities are still loading, leading to false rejection of valid locations), CakeStore enforces a strict startup lifecycle:

### 5.1 Exact Startup Sequence

```
1. Spring Boot Bootstraps
       │
       ▼
2. Flyway Executes V19 Migration
   - Creates location_* tables, parent-scoped unique constraints, B-tree indexes
   - Idempotent: Skipped if already applied
       │
       ▼
3. LocationReadinessManager Evaluates State
   - Queries location_dataset_metadata WHERE status = 'READY'
   - Checks SHA-256 checksum of classpath seed files against metadata
       │
       ├────────────────────────────────────────┐
       ▼ [Checksum Matches & Status = 'READY']  ▼ [Missing, Outdated, or Failed]
   FAST STARTUP (<10ms)                    EXECUTE RECONCILIATION
   - Validate record counts:               - Set metadata status = 'LOADING'
     * states >= 36                        - Set LocationReadinessState = NOT_READY
     * districts >= 780                    - Run LocationDataReconciliationEngine
     * pincodes >= 15,000                  - Verify record count thresholds
   - Set LocationReadinessState = READY    - Set metadata status = 'READY'
                                           - Set LocationReadinessState = READY
                                           (If failed: status = 'FAILED', stay NOT_READY)
       │
       ▼
4. Application Serves Traffic
```

### 5.2 Fail-Closed Operational Gate (`LocationReadinessState`)

```java
@Component
public class LocationReadinessState {
    private final AtomicBoolean ready = new AtomicBoolean(false);

    public boolean isReady() {
        return ready.get();
    }

    public void setReady(boolean isReady) {
        this.ready.set(isReady);
    }
}
```

### 5.3 Fail-Closed Enforcement Rules:
1. Any location-dependent write or validation operation:
   - `POST /api/auth/register` (Owner Registration)
   - `PUT /api/shops/my-shop` (Owner Bakery Profile Update)
   - `POST /api/locations/validate` (Hierarchy Validation API)
   first calls `locationReadinessState.isReady()`.
2. **If `isReady() == false`**:
   - The operation **FAILS CLOSED** immediately.
   - Throws `LocationServiceUnavailableException`.
   - GlobalExceptionHandler returns `HTTP 503 Service Unavailable`:
     ```json
     {
       "timestamp": "2026-09-16T08:55:00Z",
       "status": 503,
       "error": "LOCATION_SERVICE_INITIALIZING",
       "message": "The canonical location catalog is currently initializing or undergoing verification. Please retry your request shortly."
     }
     ```
3. **Zero Silent Fallback**: The backend will **NEVER** bypass validation or silently accept unverified location data during startup.
4. **Independent Read Tolerance**: Public marketplace browsing (`GET /api/storefront/shops/search`) does not depend on `LocationReadinessState`, as it executes against indexed denormalized strings on `shops`. Existing discovery continues operating without disruption.

---

## 6. Database Schema Architecture (Flyway V19 DDL Only)

### 6.1 Strict DDL Isolation
- **`V19__canonical_indian_location_hierarchy.sql`** contains **strictly DDL**:
  - `CREATE TABLE IF NOT EXISTS` for all 7 location catalog tables and the metadata table.
  - Foreign key constraints with `ON DELETE RESTRICT` (preventing accidental parent cascade deletion).
  - Parent-scoped uniqueness constraints (preventing naming collisions).
  - Check constraints for format integrity.
  - Active-status B-tree indexes.
- **ZERO `INSERT` statements** exist in V19.

### 6.2 Complete V19 DDL Definition

```sql
-- ====================================================================
-- CAKESTORE FLYWAY MIGRATION V19: CANONICAL LOCATION SCHEMA (DDL ONLY)
-- Authoritative reference tables, parent-scoped uniqueness, indexes.
-- ZERO modifications to V1-V18. ZERO modifications to shops/users.
-- ====================================================================

-- 1. Countries
CREATE TABLE IF NOT EXISTS location_countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) NOT NULL,                  -- 'IND' (ISO 3166-1 alpha-3)
    name VARCHAR(100) NOT NULL,                -- 'India'
    phone_code VARCHAR(10) NOT NULL,          -- '+91'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_country_code UNIQUE (code),
    CONSTRAINT uq_loc_country_name UNIQUE (name)
);

-- 2. States / Union Territories (LGD Source)
CREATE TABLE IF NOT EXISTS location_states (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES location_countries(id) ON DELETE RESTRICT,
    code VARCHAR(10) NOT NULL,                 -- 'MH', 'KA', 'DL' (ISO 3166-2:IN)
    name VARCHAR(100) NOT NULL,                -- 'Maharashtra'
    normalized_name VARCHAR(100) NOT NULL,     -- 'maharashtra'
    type VARCHAR(20) NOT NULL DEFAULT 'STATE', -- 'STATE', 'UNION_TERRITORY'
    lgd_code INTEGER UNIQUE,                   -- Official LGD State Code
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_state_country_code UNIQUE (country_id, code),
    CONSTRAINT uq_loc_state_country_norm_name UNIQUE (country_id, normalized_name)
);

-- 3. Districts (LGD Source - Parent Scoped Uniqueness)
CREATE TABLE IF NOT EXISTS location_districts (
    id SERIAL PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES location_states(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,                -- 'Pune', 'Bengaluru Urban', 'Bilaspur'
    normalized_name VARCHAR(100) NOT NULL,     -- 'pune', 'bilaspur'
    lgd_code INTEGER UNIQUE,                   -- Official LGD District Code
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_district_state_norm_name UNIQUE (state_id, normalized_name)
);

-- 4. Cities / Towns / Municipalities (LGD ULB & Taluk Source - Parent Scoped)
CREATE TABLE IF NOT EXISTS location_cities (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES location_districts(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,                -- 'Pimpri-Chinchwad', 'Pune City', 'Haveli'
    normalized_name VARCHAR(100) NOT NULL,     -- 'pimpri-chinchwad'
    tier VARCHAR(10) NOT NULL DEFAULT 'TIER_2',-- 'TIER_1', 'TIER_2', 'TIER_3', 'OTHER'
    lgd_ulb_code INTEGER,                      -- Official Urban Local Body Code if applicable
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_city_district_norm_name UNIQUE (district_id, normalized_name)
);

-- 5. Localities / Areas / Villages (India Post & LGD Ward Source - Parent Scoped)
CREATE TABLE IF NOT EXISTS location_localities (
    id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL REFERENCES location_cities(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,                -- 'Akurdi', 'Pradhikaran', 'Kothrud'
    normalized_name VARCHAR(100) NOT NULL,     -- 'akurdi', 'pradhikaran'
    latitude DOUBLE PRECISION,                 -- Centroid coordinates
    longitude DOUBLE PRECISION,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_locality_city_norm_name UNIQUE (city_id, normalized_name)
);

-- 6. Canonical Pincodes Master (Department of Posts Directory)
CREATE TABLE IF NOT EXISTS location_pincodes (
    pincode VARCHAR(6) PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES location_districts(id) ON DELETE RESTRICT,
    state_id INTEGER NOT NULL REFERENCES location_states(id) ON DELETE RESTRICT,
    primary_office_name VARCHAR(150) NOT NULL, -- e.g. 'Akurdi SO'
    office_type VARCHAR(10) NOT NULL,          -- 'HO', 'SO', 'BO'
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'Delivery',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pincode_format CHECK (pincode ~ '^[1-9][0-9]{5}$')
);

-- 7. Locality <-> Pincode Junction Table (Many-to-Many Modeling)
CREATE TABLE IF NOT EXISTS location_locality_pincodes (
    locality_id INTEGER NOT NULL REFERENCES location_localities(id) ON DELETE CASCADE,
    pincode VARCHAR(6) NOT NULL REFERENCES location_pincodes(pincode) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (locality_id, pincode)
);

-- 8. Dataset Ingestion & Active State Metadata
CREATE TABLE IF NOT EXISTS location_dataset_metadata (
    id SERIAL PRIMARY KEY,
    dataset_name VARCHAR(100) NOT NULL UNIQUE,
    source_authority VARCHAR(150) NOT NULL,
    source_version VARCHAR(50) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    states_count INTEGER NOT NULL DEFAULT 0,
    districts_count INTEGER NOT NULL DEFAULT 0,
    cities_count INTEGER NOT NULL DEFAULT 0,
    localities_count INTEGER NOT NULL DEFAULT 0,
    pincodes_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'LOADING',
    loader_summary TEXT,
    started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITHOUT TIME ZONE
);

-- ====================================================================
-- STRATEGIC INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_loc_states_country ON location_states (country_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loc_districts_state ON location_districts (state_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loc_cities_district ON location_cities (district_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loc_localities_city ON location_localities (city_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_loc_states_norm ON location_states (normalized_name);
CREATE INDEX IF NOT EXISTS idx_loc_districts_norm ON location_districts (normalized_name);
CREATE INDEX IF NOT EXISTS idx_loc_cities_norm ON location_cities (normalized_name);
CREATE INDEX IF NOT EXISTS idx_loc_localities_norm ON location_localities (normalized_name);

CREATE INDEX IF NOT EXISTS idx_loc_pincodes_state ON location_pincodes (state_id);
CREATE INDEX IF NOT EXISTS idx_loc_pincodes_district ON location_pincodes (district_id);
CREATE INDEX IF NOT EXISTS idx_loc_locality_pins_pin ON location_locality_pincodes (pincode);
CREATE INDEX IF NOT EXISTS idx_loc_locality_pins_loc ON location_locality_pincodes (locality_id);
```

---

## 7. Explicit Entity & Repository Persistence Strategy

To ensure zero architectural ambiguity during implementation, every table has an explicitly defined persistence mechanism:

| Database Table | Persistence Technology | Primary Components | Rationale & Architectural Choice |
|---|---|---|---|
| `location_countries` | Spring Data JPA | `LocationCountry.java`, `LocationCountryRepository.java` | Static, low-volume (1 row). Standard JPA read queries and `@Cacheable`. |
| `location_states` | Spring Data JPA | `LocationState.java`, `LocationStateRepository.java` | Low-volume (36 rows). Benefits from standard entity relationships and in-memory caching. |
| `location_districts` | Spring Data JPA | `LocationDistrict.java`, `LocationDistrictRepository.java` | ~785 rows. Parent-scoped queries (`findByStateId`), indexed single queries, DTO mapping. |
| `location_cities` | Spring Data JPA | `LocationCity.java`, `LocationCityRepository.java` | Moderate volume. Parent-scoped lookups (`findByDistrictId`), DTO projections. |
| `location_localities` | Spring Data JPA | `LocationLocality.java`, `LocationLocalityRepository.java` | Moderate volume. Scoped parent retrieval, projection DTOs for fast dropdown responses. |
| `location_pincodes` | Spring Data JPA | `LocationPincode.java`, `LocationPincodeRepository.java` | Key-based lookup (`findById`), existence verification, join fetch with State & District. |
| `location_locality_pincodes` | Hybrid: JPA Entity + Direct JPQL/Native Projections | `LocationLocalityPincode.java`, `LocationLocalityPincodeRepository.java` | Composite key (`@EmbeddedId LocationLocalityPincodeId`). Mapped as a lightweight entity. Queried using direct projection queries (`findLocalitiesByPincode`) rather than heavy bidirectional collection mapping. |
| `location_dataset_metadata` | Hybrid: Spring Data JPA + Spring `JdbcTemplate` | `LocationDatasetMetadata.java`, `LocationDatasetMetadataRepository.java`, `JdbcTemplate` | Standard JPA repository for clean status checking in `LocationReadinessState`. Direct `JdbcTemplate` used by the data loader for high-throughput batch operations and atomic status updates. |
| **Batch Seeding / Reconciliation Pipeline** | Spring `JdbcTemplate` Batch Updates | `LocationDataReconciliationEngine.java` | **Bypasses Hibernate entity-state management** during bulk ingestion to prevent JVM heap bloat and GC pressure. Uses chunked JDBC batch inserts (`batchUpdate`, chunk size: 500 rows). |

---

## 8. Backend Service & Validation Architecture

### 8.1 Two-Stage Decoupled Pincode Validation
Pincode validation is strictly decoupled:

1. **Stage A: Format Validation (Zero Database Cost)**
   - Regex: `^[1-9][0-9]{5}$` (exactly 6 numeric digits, non-zero first digit).
   - Rejects strings like `"41103"`, `"4110359"`, `"011035"`, `"NW1 6XE"`.
2. **Stage B: Canonical Database Relationship Validation**
   - Query `location_pincodes` by primary key.
   - If not found: Reject with `"Unknown or unserviced PIN code"`.
   - If found: Ensure the PIN's `state_id` matches the submitted state and its `district_id` matches the submitted district.

### 8.2 Authoritative Hierarchy Validation Service (`LocationValidationService`)

```java
@Service
@RequiredArgsConstructor
public class LocationValidationService {

    private final LocationReadinessState readinessState;
    private final LocationStateRepository stateRepo;
    private final LocationDistrictRepository districtRepo;
    private final LocationCityRepository cityRepo;
    private final LocationPincodeRepository pincodeRepo;

    public void validateLocation(LocationValidationDTO req) {
        // 0. Fail-Closed Readiness Gate
        if (!readinessState.isReady()) {
            throw new LocationServiceUnavailableException("Location catalog is initializing.");
        }

        Map<String, String> fieldErrors = new LinkedHashMap<>();

        // 1. Normalize strings (trim and lower-case)
        String normState = normalize(req.getState());
        String normDistrict = normalize(req.getDistrict());
        String normCity = normalize(req.getCity());
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

        // 4. Validate City (parent-scoped to District)
        if (normCity != null && !normCity.isBlank() && district != null) {
            LocationCity city = cityRepo.findByDistrictIdAndNormalizedName(district.getId(), normCity).orElse(null);
            if (city == null) {
                fieldErrors.put("city", "City '" + req.getCity() + "' is not registered under District '" + district.getName() + "'.");
            }
        }

        // 5. Validate PIN Code (Decoupled Stage A + Stage B)
        if (pincode != null && !pincode.isBlank()) {
            if (!pincode.matches("^[1-9][0-9]{5}$")) {
                fieldErrors.put("pincode", "PIN code must be exactly 6 numeric digits and cannot begin with 0.");
            } else {
                LocationPincode pinRecord = pincodeRepo.findById(pincode).orElse(null);
                if (pinRecord == null) {
                    fieldErrors.put("pincode", "PIN code " + pincode + " is not recognized in official Indian postal registry.");
                } else {
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
- **Configurable TTL:** Managed via externalized properties:
  ```properties
  cakeplatform.locations.cache.enabled=true
  cakeplatform.locations.cache.ttl-minutes=1440
  cakeplatform.locations.cache.max-size=5000
  ```
- **Cache Invalidation:** Cache is cleanly flushed whenever the `LocationDataReconciliationEngine` promotes a new dataset version to `READY`.

---

## 9. API Reference & Discovery Contracts

All endpoints are accessible under `/api/locations` and mirrored under `/api/customer/storefront/locations`:

### 9.1 Endpoint Summary

| Method | Endpoint | Query Parameters | Response Structure | Auth Required | Cacheable |
|---|---|---|---|---|---|
| `GET` | `/api/locations/readiness` | None | `{ "status": "READY", "version": "2024.1" }` | No (Public) | No |
| `GET` | `/api/locations/countries` | None | `List<CountryDTO>` | No (Public) | Yes |
| `GET` | `/api/locations/states` | `countryCode` (default: `'IND'`) | `List<StateDTO>` | No (Public) | Yes |
| `GET` | `/api/locations/districts` | `stateId` (required) | `List<DistrictDTO>` | No (Public) | Yes |
| `GET` | `/api/locations/cities` | `districtId` (required) | `List<CityDTO>` | No (Public) | Yes |
| `GET` | `/api/locations/localities` | `cityId` (optional), `pincode` (optional) | `List<LocalityDTO>` | No (Public) | Yes |
| `GET` | `/api/locations/pincodes/{pincode}` | None | `PincodeLookupResponseDTO` (Multiple Localities) | No (Public) | Yes |
| `POST`| `/api/locations/validate` | Body: `LocationValidationDTO` | Validation Result / HTTP 400 Field Errors | No (Public) | No |

---

## 10. System Integrations & Existing-Data Safety Policy

### 10.1 Integration Points for Strict Write Validation
1. **Bakery Owner Registration (`POST /api/auth/register`):**
   - In `AuthService.register()`, invoke `locationValidationService.validateLocation(...)` before creating the `Shop` entity.
   - Normalizes submitted names to title-cased canonical forms before persisting into denormalized `shops` columns.
2. **Owner Settings / Bakery Profile Update (`PUT /api/shops/my-shop`):**
   - In `ShopService.updateMyShopProfile()`, if any location field (`state`, `district`, `city`, `area`, `pincode`) is updated, invoke `locationValidationService.validateLocation(...)`.
   - Rejects invalid location updates before saving.

### 10.2 Absolute Protection of Historical Shop Data
- Existing shop records (such as Shop 4's historical development record) remain **100% untouched**:
  - Zero database mutations (`UPDATE shops SET ...`).
  - Zero auto-repair, zero auto-normalization, zero auto-assigned canonical IDs.
  - Zero geocoding or spatial guessing.
- The marketplace discovery query (`GET /api/storefront/shops/search` from Phase 2.2) continues executing via `ShopSpecification` against the denormalized columns on `shops`, ensuring historical bakeries remain discoverable without regression.

### 10.3 Phase Boundaries
- **Phase 2.3 Boundary:** Strictly backend-only.
- **Explicit Non-Goals for Phase 2.3:**
  - ❌ No Leaflet, OpenStreetMap, Mapbox, or Google Maps scripts.
  - ❌ No GPS browser geolocation hooks or automatic coordinate resolution.
  - ❌ No reverse geocoding from latitude/longitude to address.
  - ❌ No frontend UI component edits (`onboarding/page.tsx`, `settings/page.tsx`, `explore/page.tsx`).
  - ❌ These belong exclusively to Phase 2.4 (Frontend Cascading Selection & Onboarding UX) and Phase 2.5 (Map Pinning & Spatial Geocoding).

---

## 11. Query Performance & N+1 Elimination Verification

1. **Predictable Query Execution:**
   - Single-level cascading lookups (`/states`, `/districts`, `/cities`, `/localities`) execute in **exactly 1 indexed SQL query**.
   - Reverse PIN lookups execute in **at most 2 predictable indexed queries** (PIN record fetch + locality junction query).
2. **N+1 Prevention:**
   - All entity relationships are configured with `FetchType.LAZY`.
   - Repositories utilize targeted join fetches (`JOIN FETCH`) and projection interfaces for cascading and reverse-lookup endpoints.
   - Verified via integration tests asserting maximum query count thresholds.

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
| 15 | `testFailClosedWhenNotReady` | Write operation invoked while `LocationReadinessState` is `false` | Rejects with HTTP 503 Service Unavailable |
| 16 | `testQueryCountAndNoNPlusOne` | Profile cascading lookups with query count inspector | Exactly predictable queries executed; zero N+1 loops |

**Regression Baseline:** Full existing test suite (327 tests) must pass with zero failures:
`mvn clean test` $\to$ **327 Baseline + 16 New Tests = 343 Passing Tests**.

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

This document constitutes the complete revised architecture and implementation specification for **CakeStore Loop 2 Phase 2.3 (V3)**.

**NO SOURCE CODE HAS BEEN WRITTEN.**  
**NO DATABASE MIGRATIONS (V19) HAVE BEEN CREATED.**  
**NO TABLES HAVE BEEN CREATED.**  
**NO LOCATION DATA HAS BEEN INSERTED.**  
**NO DEPENDENCIES HAVE BEEN INSTALLED.**  
**NO FRONTEND CHANGES HAVE BEEN MADE.**  

Execution is stopped immediately pending user review and approval of this revised plan.
