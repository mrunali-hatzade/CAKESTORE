# CAKESTORE LOOP 2 — PHASE 2.3 IMPLEMENTATION PLAN (V5)
**Canonical Indian Location Hierarchy Architecture & Implementation Specification**

**Status:** ARCHITECTURE & IMPLEMENTATION PLAN V5 — PENDING USER APPROVAL  
**Current Baseline:** 327 / 327 backend tests PASSING (100%)  
**Phase Scope:** Strictly Backend Reference Architecture, Schema (V19 DDL Only), Authoritative Seeding & Reconciliation Pipeline, and Validation Services. Zero UI, Zero GPS/Leaflet, Zero External Runtime APIs, Zero Modifications to Existing Shop Data.

---

## 1. Executive Summary & Applied V5 Corrections

This **Version 5 (V5)** specification addresses all feedback from the V4 review, providing complete architectural certainty across provenance, relational integrity, operational lifecycle, and locality semantics:

| # | V5 Review Correction | Architectural Resolution in V5 Specification |
|---|---|---|
| **1** | **Dataset Provenance & Ingestion Transformation** | Distinguished external authoritative sources from CakeStore's proposed internal normalized artifacts. For every tier, specified the source organization, official source dataset, required raw fields, source identifier, and ETL normalization rules. Explicitly acknowledged that implementation cannot begin until source schemas are validated. |
| **2** | **Resolution of Unresolved-Record Storage (Option B)** | Selected **Option B**: Removed persistent quarantine table references. Unresolved/ambiguous records are recorded via **structured application logging (`WARN` level)** and aggregated into `unresolved_count` and `loader_summary` within `location_dataset_metadata`. Maintains clean 8-table schema without orphan audit tables. |
| **3** | **Enforcing PIN $\to$ District $\to$ State Integrity (Option B)** | Selected **Option B**: Removed redundant `state_id` column from `location_pincodes`. `location_pincodes` references strictly `district_id`. State is **100% deterministically derived** via `district.state_id`, mathematically eliminating cross-state district mismatch anomalies at the schema level. |
| **4** | **Unified Startup & Readiness Lifecycle** | Eliminated contradictory startup descriptions. Formally adopted the preferred lifecycle: Spring Boot starts $\to$ `LocationReadinessState = NOT_READY` $\to$ dataset verification / reconciliation $\to$ status set to `READY` or `FAILED`. Defined exact behavior: location writes and reference lookups return `HTTP 503` when not ready; customer registration, login, and Phase 2.2 marketplace search remain 100% available. |
| **5** | **Removal of Unsupported Performance Claims** | Removed all unsupported claims (e.g. `"< 10ms"`). Specified: *"Fast path skips full reconciliation when a verified READY dataset checksum/version already matches."* Actual latency will be measured through benchmarks. |
| **6** | **Explicit Locality Semantics Defined** | Explicitly defined `location_localities` as **recognized commercial/residential neighborhoods, suburbs, or delivery areas** relevant to bakery discovery (e.g. *Kothrud*, *Akurdi*, *Indiranagar*). Postal delivery offices (Branch/Sub-Offices) and municipal wards serve as source references, but administrative transit hubs/sorting offices are excluded. Prohibited fabricating locality mappings. |
| **7** | **Preservation of All Prior V4 Architectural Decisions** | Retained: V19 DDL only; V1–V18 immutable; historical shops untouched; transactional tables never mutated by loader; soft deprecation (`is_active = false`); authoritative-code-first reconciliation; configurable cache TTL; bulk loading via `JdbcTemplate`; zero PostGIS; zero Redis; zero external runtime APIs; backend-only Phase 2.3; tenant isolation; Phase 2.2 regression protection; 6-digit PIN validation; parent-scoped uniqueness; Many-to-Many PIN/locality model. |

---

## 2. Exhaustive Dataset Provenance & Ingestion Transformation

CakeStore treats external government datasets as external source material that must be verified, extracted, and normalized into CakeStore's internal seed artifacts:

### 2.1 Tier-by-Tier Source Provenance & Transformation Architecture

```
[Official Government Data Sources]
- LGD State & District Master (lgd.gov.in)
- LGD Urban Local Bodies & Census Towns (lgd.gov.in / MoHUA)
- India Post National Pincode Directory (data.gov.in)
                 │
                 ▼ (Offline Extraction & Normalization Script)
[CakeStore Internal Normalized Seed Artifacts (JSON/CSV)]
- lgd_states_districts_normalized.json
- lgd_urban_local_bodies_normalized.json
- india_post_pincodes_normalized.csv
- india_post_locality_mappings_normalized.csv
                 │
                 ▼ (LocationDataReconciliationEngine via JdbcTemplate)
[CakeStore Canonical PostgreSQL Tables (location_*)]
```

### 2.2 Detailed Source-to-Artifact Mapping Specification

| Hierarchy Tier | Authoritative Organization | Official External Source Dataset | Source Identifier / Code | Exact Source Fields Required | CakeStore Internal Normalized Seed Artifact | Ingestion & Transformation Rules |
|---|---|---|---|---|---|---|
| **1. Country** | Survey of India / ISO Maintenance Agency | ISO 3166-1 Country Code Standard | ISO Alpha-3: `IND`, Alpha-2: `IN`, Dialing: `+91` | `country_code`, `country_name`, `dialing_code` | Embedded in V19 DDL seed baseline | Static seed. Guaranteed 1 record: India. |
| **2. State / UT** | Ministry of Panchayati Raj (MoPR) | Local Government Directory (LGD) State Directory (`lgd.gov.in`) | LGD State Code (Integer) & ISO 3166-2:IN Code (`MH`, `KA`, etc.) | `stateCode`, `stateNameEnglish`, `stateVersion`, `census2011Code` | `lgd_states_districts_normalized.json` | 1. Parse JSON export from LGD.<br>2. Extract official English name.<br>3. Compute `normalized_name` (`trim().toLowerCase()`).<br>4. Map ISO 3166-2:IN administrative code.<br>5. Validate count equals 36 (28 States + 8 UTs). |
| **3. District** | Ministry of Panchayati Raj (MoPR) | LGD District Directory (`lgd.gov.in`) | LGD District Code (Integer) | `districtCode`, `districtNameEnglish`, `stateCode`, `census2011Code` | `lgd_states_districts_normalized.json` | 1. Group districts by LGD `stateCode`.<br>2. Extract official English name.<br>3. Normalize name for search.<br>4. Validate foreign key link to canonical state.<br>5. Validate total district count $\ge 780$. |
| **4. City / Town / Municipality** | Ministry of Housing and Urban Affairs (MoHUA) & MoPR | LGD Urban Local Bodies (ULB) & Census Towns Master (`lgd.gov.in`) | LGD ULB Code (Integer) or Sub-District/Taluk LGD Code | `ulbCode`, `ulbNameEnglish`, `ulbType` (Corporation/Municipality), `districtCode` | `lgd_urban_local_bodies_normalized.json` | 1. Filter active statutory municipal corporations, municipalities, and taluk headquarters.<br>2. Classify tier (`TIER_1`, `TIER_2`, `TIER_3`).<br>3. Map strictly to canonical `district_id` via LGD `districtCode`.<br>4. Discard unorganized rural tracts. |
| **5. Locality / Area / Village** | Department of Posts (DoP) & Municipal Corporation Wards | India Post Delivery Offices Master & Municipal Ward Listings | Post Office Name / Sub-Office Code + Ward ID | `OfficeName`, `OfficeType` (SO/BO/HO), `DeliveryStatus`, `District`, `StateName` | `india_post_locality_mappings_normalized.csv` | 1. Filter out administrative sorting/transit hubs (RMS, Transit Mail Offices).<br>2. Filter Delivery Sub-Offices (SOs) and urban Branch Offices (BOs).<br>3. Cleanse administrative suffixes (e.g. "S.O", "B.O", "H.O").<br>4. Map to corresponding `city_id` within the district.<br>5. Retain centroid coordinates if present. |
| **6. Pincode / Postal Area** | Department of Posts, Ministry of Communications | All India Pincode Directory via Open Government Data (`data.gov.in`) | 6-Digit Postal Index Number (PIN) (e.g. `411035`) | `Pincode`, `District`, `StateName`, `OfficeName`, `OfficeType`, `DeliveryStatus` | `india_post_pincodes_normalized.csv` | 1. Validate strict 6-digit regex format `^[1-9][0-9]{5}$`.<br>2. Deduplicate PINs to unique 6-digit primary records.<br>3. Resolve canonical `district_id` via district name and LGD mapping table.<br>4. Identify primary delivery office name. |
| **Junction: Locality $\leftrightarrow$ PIN** | Department of Posts Delivery Jurisdictions | Derived from India Post Pincode & Delivery Office Directory | Composite: `(locality_id, pincode)` | `Pincode`, `OfficeName`, `DeliveryStatus` | `india_post_locality_mappings_normalized.csv` | 1. Link resolved locality ID to verified 6-digit PIN.<br>2. Set `is_primary = true` for primary delivery jurisdiction.<br>3. Support many-to-many cardinality. |

> [!IMPORTANT]
> **Schema Knowledge Requirement**: The location loader implementation will **NOT** begin until the raw source files are extracted, schemas verified, and normalized into the exact internal artifact specifications defined above.

---

## 3. Locality Semantics for CakeStore

In CakeStore, the term "locality" has a precise, business-specific domain definition:

### 3.1 Domain Definition
- A **`location_locality`** represents a **recognized commercial, residential, or neighborhood destination** where customers discover bakeries and where bakery kitchens are physically located (e.g. *Kothrud*, *Akurdi*, *Indiranagar*, *Bandra West*, *Whitefield*).
- It is **NOT** a raw postal sorting unit, administrative ward number (e.g. "Ward No. 14"), or postal transit facility.

### 3.2 Filtering & Ingestion Criteria from Source Data
1. **Eligible Source Records:**
   - Postal Delivery Sub-Offices (SOs) and Branch Offices (BOs) that represent named settlements, suburban neighborhoods, or distinct villages.
   - Named municipal corporation zones and commercial localities.
2. **Excluded Source Records:**
   - Head Post Offices named generically after the city (e.g. "Pune H.O", "Mumbai G.P.O") unless representing a specific downtown locality.
   - Railway Mail Service (RMS), Air Mail Sorting, and specialized military postal units (APO/FPO).
   - Unnamed numbered administrative census blocks.
3. **No Fabrication Rule:**
   - If a bakery operates in a smaller town or rural area without a recognized sub-locality, **no synthetic locality is fabricated**. The bakery's canonical location is anchored at the City / Town level, with the street address providing granular detail.

---

## 4. Enforcing PIN $\to$ District $\to$ State Relational Integrity

### 4.1 Architectural Decision: Removal of Redundant `state_id` (Option B)
In the database schema, `location_pincodes` will store:
- `pincode VARCHAR(6) PRIMARY KEY`
- `district_id INTEGER NOT NULL REFERENCES location_districts(id) ON DELETE RESTRICT`

```
┌──────────────────────┐
│   location_states    │
└──────────▲───────────┘
           │ 1:N
           │
┌──────────┴───────────┐
│  location_districts  │
└──────────▲───────────┘
           │ 1:N
           │ (Canonical Link)
┌──────────┴───────────┐
│  location_pincodes   │
└──────────────────────┘
```

### 4.2 Why Option B is Relational Best Practice:
1. **Mathematical Consistency:** In India's administrative architecture, every district belongs strictly to exactly one State or Union Territory. A district cannot belong to two states.
2. **Zero Update Anomalies:** Removing redundant `state_id` from `location_pincodes` eliminates the possibility of a PIN having `district_id = Pune` while claiming `state_id = Gujarat`.
3. **Canonical Derivation:** State is **100% deterministically derived** via `district.state_id`:
   ```sql
   SELECT p.pincode, p.primary_office_name, d.name AS district_name, s.name AS state_name
   FROM location_pincodes p
   JOIN location_districts d ON p.district_id = d.id
   JOIN location_states s ON d.state_id = s.id
   WHERE p.pincode = ?;
   ```
4. **JPA Cleanliness:** `LocationPincode` entity maps directly to `LocationDistrict`, and state is accessed cleanly via `pinRecord.getDistrict().getState()`.

---

## 5. Safe Reconciliation & Unresolved-Record Storage

### 5.1 Reconciliation Precedence Engine
The reconciliation engine processes source updates using an authoritative 5-stage precedence hierarchy:

```
                  Incoming Canonical Record
                            │
                            ▼
              [Stage 1: Authoritative Code]
          Does LGD Code / Office Code match DB?
                ├── YES ──► MATCH FOUND (Check attribute updates)
                └── NO
                     │
                     ▼
             [Stage 2: Parent Relationship]
        Does record share identical parent ID?
                ├── NO  ──► DIFFERENT ENTITY (New record or separate entity)
                └── YES
                     │
                     ▼
              [Stage 3: Normalized Name]
          Does LOWER(TRIM(name)) match under parent?
                ├── YES ──► MATCH FOUND
                └── NO
                     │
                     ▼
          [Stage 4: Approved Alias Dictionary]
       Does name match approved historical alias under parent?
                ├── YES ──► MATCH FOUND (Link as canonical)
                └── NO
                     │
                     ▼
          [Stage 5: UNRESOLVED AMBIGUITY]
          - DO NOT auto-merge
          - DO NOT delete
          - DO NOT invent relationships
          - Record in structured logs & metadata counters
```

### 5.2 Resolution of Unresolved Records: Option B (Logging + Metadata Counters)
Rather than introducing a persistent database quarantine table that requires schema maintenance and lifecycle cleanup:
1. **Structured Application Logging:**
   - Any record that cannot be reconciled with 100% certainty is logged at `WARN` level using structured key-value format:
     ```json
     {
       "event": "LOCATION_RECONCILIATION_UNRESOLVED",
       "dataset": "INDIA_POST_LOCALITIES",
       "rawName": "Poona University SO",
       "reason": "PARENT_DISTRICT_AMBIGUOUS",
       "action": "QUARANTINED_SKIPPED"
     }
     ```
2. **Metadata Aggregation:**
   - `location_dataset_metadata` tracks:
     - `unresolved_count INTEGER NOT NULL DEFAULT 0`
     - `loader_summary TEXT` (Contains detailed breakdown: `"Inserted: 785, Updated: 0, Deprecated: 0, Unresolved: 3. Unresolved entries: ['Poona University SO', 'Baroda Central']"`).
3. **Canonical Invariant:**
   - Unresolved records are **quarantined and skipped**. They **never** become active canonical records automatically.

---

## 6. Startup & Readiness Lifecycle

### 6.1 Operational Lifecycle Model

```
1. Spring Boot Application Context Initializes
   ├── Tomcat server starts listening on port 8080
   └── LocationReadinessState initialized to NOT_READY (false)
       │
       ▼
2. Flyway Executes Migration V19 (DDL Only)
   - Creates location_* tables, constraints, indexes (if not already applied)
       │
       ▼
3. LocationReadinessManager Evaluates Catalog Status
   - Queries location_dataset_metadata WHERE status = 'READY'
   - Compares SHA-256 checksum of classpath seed artifacts against metadata
       │
       ├─────────────────────────────────────────┐
       ▼ [Fast Path: Checksum Matches & READY]   ▼ [Initial Boot or Checksum Changed]
   FAST PATH INITIALIZATION                  EXECUTE RECONCILIATION PIPELINE
   - Verify record count thresholds:         - Set metadata status = 'LOADING'
     * states >= 36                          - Keep LocationReadinessState = NOT_READY
     * districts >= 780                      - Stream & reconcile normalized artifacts
     * pincodes >= 15,000                    - Verify integrity & count thresholds
   - Set LocationReadinessState = READY      - Set metadata status = 'READY'
                                             - Set LocationReadinessState = READY
                                             (On error: status = 'FAILED', ready = false)
       │
       ▼
4. Application Fully Operational
```

### 6.2 Fast Path Specification
- **Fast Path Behavior:** When the database already contains an active dataset marked `READY` with a matching SHA-256 checksum, the system verifies record counts and sets `LocationReadinessState = READY` immediately, skipping full file ingestion.
- *Performance note:* Actual execution time will be measured via benchmarks.

### 6.3 Behavior During `NOT_READY` / `FAILED` State

| Endpoint / Operation | User Role / Context | Location Dependency | Behavior when `isReady() == false` | Error Response |
|---|---|---|---|---|
| `POST /api/auth/register` | Customer (`CUSTOMER`) | None (No address fields) | **HTTP 201 Created** (100% Operational) | None |
| `POST /api/auth/login` | All Roles | None | **HTTP 200 OK** (100% Operational) | None |
| `GET /api/storefront/shops/search` | Customers | Marketplace Discovery | **HTTP 200 OK** (Queries denormalized `shops` columns) | None |
| `POST /api/auth/register` | Bakery Owner (`OWNER`) | Mandatory (Bakery address/city/state/PIN) | **HTTP 503 Service Unavailable** (Fail Closed) | `LOCATION_SERVICE_INITIALIZING` |
| `PUT /api/shops/my-shop` | Bakery Owner | Mandatory for location updates | **HTTP 503 Service Unavailable** (Fail Closed) | `LOCATION_SERVICE_INITIALIZING` |
| `POST /api/locations/validate` | Internal / UI | Mandatory | **HTTP 503 Service Unavailable** (Fail Closed) | `LOCATION_SERVICE_INITIALIZING` |
| `GET /api/locations/**` | Public Browsers | Reference lookups | **HTTP 503 Service Unavailable** (Fail Closed) | `LOCATION_SERVICE_INITIALIZING` |

---

## 7. Database Schema Architecture (Flyway V19 DDL Only)

Flyway migration `V19__canonical_indian_location_hierarchy.sql` establishes exactly **8 database tables**:

```sql
-- ====================================================================
-- CAKESTORE FLYWAY MIGRATION V19: CANONICAL LOCATION SCHEMA (DDL ONLY)
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
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_country_code UNIQUE (code),
    CONSTRAINT uq_loc_country_name UNIQUE (name)
);

-- 2. States / Union Territories Master (LGD Source)
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

-- 3. Districts Master (LGD Source - Parent-Scoped Uniqueness)
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

-- 4. Cities / Towns / Municipalities (LGD ULB Source - Parent-Scoped Uniqueness)
CREATE TABLE IF NOT EXISTS location_cities (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES location_districts(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,                -- 'Pimpri-Chinchwad', 'Pune City'
    normalized_name VARCHAR(100) NOT NULL,     -- 'pimpri-chinchwad'
    tier VARCHAR(10) NOT NULL DEFAULT 'TIER_2',-- 'TIER_1', 'TIER_2', 'TIER_3', 'OTHER'
    lgd_ulb_code INTEGER,                      -- Official Urban Local Body Code
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_city_district_norm_name UNIQUE (district_id, normalized_name)
);

-- 5. Localities / Commercial Neighborhoods (India Post / Ward Source - Parent-Scoped)
CREATE TABLE IF NOT EXISTS location_localities (
    id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL REFERENCES location_cities(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,                -- 'Akurdi', 'Pradhikaran', 'Kothrud'
    normalized_name VARCHAR(100) NOT NULL,     -- 'akurdi', 'pradhikaran'
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_loc_locality_city_norm_name UNIQUE (city_id, normalized_name)
);

-- 6. Canonical Pincodes Master (References district_id strictly; state derived via district)
CREATE TABLE IF NOT EXISTS location_pincodes (
    pincode VARCHAR(6) PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES location_districts(id) ON DELETE RESTRICT,
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
    unresolved_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'LOADING',
    loader_summary TEXT,
    started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITHOUT TIME ZONE
);

-- ====================================================================
-- STRATEGIC B-TREE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_loc_states_country ON location_states (country_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loc_districts_state ON location_districts (state_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loc_cities_district ON location_cities (district_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loc_localities_city ON location_localities (city_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_loc_states_norm ON location_states (normalized_name);
CREATE INDEX IF NOT EXISTS idx_loc_districts_norm ON location_districts (normalized_name);
CREATE INDEX IF NOT EXISTS idx_loc_cities_norm ON location_cities (normalized_name);
CREATE INDEX IF NOT EXISTS idx_loc_localities_norm ON location_localities (normalized_name);

CREATE INDEX IF NOT EXISTS idx_loc_pincodes_district ON location_pincodes (district_id);
CREATE INDEX IF NOT EXISTS idx_loc_locality_pins_pin ON location_locality_pincodes (pincode);
CREATE INDEX IF NOT EXISTS idx_loc_locality_pins_loc ON location_locality_pincodes (locality_id);
```

---

## 8. Explicit Persistence Architecture (All 8 Tables)

| Table Name | JPA Entity Class | Spring Data Repository Interface | Access & Persistence Architecture | Rationale |
|---|---|---|---|---|
| `location_countries` | `LocationCountry.java` | `LocationCountryRepository.java` | Spring Data JPA + `@Cacheable` | 1 row. Standard entity mapping with in-memory caching. |
| `location_states` | `LocationState.java` | `LocationStateRepository.java` | Spring Data JPA + `@Cacheable` | 36 rows. Standard entity mapping with in-memory caching. |
| `location_districts` | `LocationDistrict.java` | `LocationDistrictRepository.java` | Spring Data JPA + `@Cacheable` | ~785 rows. Parent-scoped lookups (`findByStateIdAndIsActiveTrue`). |
| `location_cities` | `LocationCity.java` | `LocationCityRepository.java` | Spring Data JPA + `@Cacheable` | ~4,800 rows. Parent-scoped queries (`findByDistrictIdAndIsActiveTrue`). |
| `location_localities` | `LocationLocality.java` | `LocationLocalityRepository.java` | Spring Data JPA | Scoped lookups (`findByCityIdAndIsActiveTrue`), DTO projections. |
| `location_pincodes` | `LocationPincode.java` | `LocationPincodeRepository.java` | Spring Data JPA + `@Cacheable` | Key-based lookup (`findById`), existence verification, join fetch with District & State. |
| `location_locality_pincodes` | **None** (Pure Join Table) | **None** (Queried via projection methods) | **Direct JPQL/Native Projections in `LocationLocalityRepository` + `JdbcTemplate` for batch seeding** | Pure associative junction table. Mapped via repository query method `findLocalitiesByPincode(pin)`. Eliminates collection-tracking overhead. |
| `location_dataset_metadata` | `LocationDatasetMetadata.java` | **None** (Accessed via `LocationDatasetMetadataDao`) | **Spring `JdbcTemplate`** | High-throughput atomic status transitions (`LOADING` $\to$ `READY`/`FAILED`) and checksum verification that bypass Hibernate session caching. |

---

## 9. Backend Service & Validation Architecture

### 9.1 Authoritative Hierarchy Validation Service (`LocationValidationService`)

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
        // 0. Fail-Closed Readiness Check
        if (!readinessState.isReady()) {
            throw new LocationServiceUnavailableException("Canonical location catalog is initializing.");
        }

        Map<String, String> fieldErrors = new LinkedHashMap<>();

        // 1. Normalize strings
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
        if (state == null || !state.getIsActive()) {
            fieldErrors.put("state", "State '" + req.getState() + "' is not a recognized or active Indian State / UT.");
            throw new InvalidLocationException("Location validation failed.", fieldErrors);
        }

        // 3. Validate District (parent-scoped to State)
        LocationDistrict district = null;
        if (normDistrict != null && !normDistrict.isBlank()) {
            district = districtRepo.findByStateIdAndNormalizedName(state.getId(), normDistrict).orElse(null);
            if (district == null || !district.getIsActive()) {
                fieldErrors.put("district", "District '" + req.getDistrict() + "' does not belong to State '" + state.getName() + "'.");
            }
        }

        // 4. Validate City (parent-scoped to District)
        if (normCity != null && !normCity.isBlank() && district != null) {
            LocationCity city = cityRepo.findByDistrictIdAndNormalizedName(district.getId(), normCity).orElse(null);
            if (city == null || !city.getIsActive()) {
                fieldErrors.put("city", "City '" + req.getCity() + "' is not registered under District '" + district.getName() + "'.");
            }
        }

        // 5. Validate PIN Code (Decoupled Stage A Format + Stage B Canonical Relationship)
        if (pincode != null && !pincode.isBlank()) {
            // Stage A: Strict 6-Digit Format
            if (!pincode.matches("^[1-9][0-9]{5}$")) {
                fieldErrors.put("pincode", "PIN code must be exactly 6 numeric digits and cannot begin with 0.");
            } else {
                // Stage B: Canonical Database Check (State derived via District)
                LocationPincode pinRecord = pincodeRepo.findById(pincode).orElse(null);
                if (pinRecord == null || !pinRecord.getIsActive()) {
                    fieldErrors.put("pincode", "PIN code " + pincode + " is not registered in the active Indian postal directory.");
                } else {
                    LocationDistrict pinDistrict = pinRecord.getDistrict();
                    LocationState pinState = pinDistrict.getState();

                    if (!pinState.getId().equals(state.getId())) {
                        fieldErrors.put("pincode", "PIN code " + pincode + " belongs to " + pinState.getName() + ", not " + state.getName() + ".");
                    } else if (district != null && !pinDistrict.getId().equals(district.getId())) {
                        fieldErrors.put("pincode", "PIN code " + pincode + " belongs to District " + pinDistrict.getName() + ", not " + district.getName() + ".");
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

### 9.2 Reverse PIN Lookup Representation Supporting Ambiguity

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
    { "id": 303, "name": "Sector 24" }
  ]
}
```
*Note: If the served localities cross municipal boundaries, `primaryCity` is explicitly returned as `null`, preserving ambiguity rather than forcing an inaccurate guess.*

---

## 10. System Integrations & Historical Shop Data Policy

### 10.1 Integration Points for Strict Write Validation
1. **Bakery Owner Registration (`POST /api/auth/register`):**
   - In `AuthService.register()`, invoke `locationValidationService.validateLocation(...)` when `role == OWNER` before creating `Shop`.
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

## 11. Comprehensive Automated Test Strategy

The test suite will be implemented in `LocationHierarchyValidationTest.java` and `LocationReferenceApiTest.java`:

| # | Test Scenario | Input / Setup Condition | Expected Assertion / Behavior |
|---|---|---|---|
| 1 | **Valid Hierarchy Validation** | Maharashtra $\to$ Pune $\to$ Pimpri-Chinchwad $\to$ Akurdi $\to$ 411035 | Validation passes cleanly with zero errors. |
| 2 | **Invalid State-District Mismatch** | Maharashtra paired with District "Bengaluru Urban" | Fails HTTP 400 with `fieldErrors.district`. |
| 3 | **Invalid District-City Mismatch** | Pune District paired with City "Surat" | Fails HTTP 400 with `fieldErrors.city`. |
| 4 | **Parent-Scoped Duplicate District** | District "Bilaspur" in Himachal Pradesh AND Chhattisgarh | Both persist successfully without constraint collisions. |
| 5 | **Parent-Scoped Duplicate City** | City "Rampur" under multiple distinct districts | Both persist successfully under their respective parent scopes. |
| 6 | **Pincode Format (Valid)** | `"411035"`, `"560001"`, `" 411035 "` (whitespace) | Passes regex check; normalized to 6 digits. |
| 7 | **Pincode Format (Invalid Digits)** | `"41103"` (5 digits), `"4110357"` (7 digits) | Fails regex check with HTTP 400 `fieldErrors.pincode`. |
| 8 | **Pincode Format (Alphanumeric/Zero)** | `"ABC123"`, `"011035"` | Fails regex check with HTTP 400 `fieldErrors.pincode`. |
| 9 | **Pincode State Mismatch** | PIN `560001` (Karnataka) submitted with State "Maharashtra" | Fails canonical check with HTTP 400 `fieldErrors.pincode` (derived via district). |
| 10 | **Multiple Localities per PIN** | Reverse lookup on PIN 411035 | Returns Akurdi, Pradhikaran, Sector 24; no single-locality constraint error. |
| 11 | **Locality Spanning Multiple PINs** | Locality "Andheri" linked to multiple PINs in junction | Reverse lookup on either PIN resolves successfully. |
| 12 | **Ambiguous City Reverse Lookup** | PIN serving localities across multiple municipal borders | `primaryCity` returns `null`; list of localities preserved without guessing. |
| 13 | **Unresolved Ambiguity Quarantine** | Conflicting record during reconciliation | Logged as structured `WARN`; `unresolved_count` incremented; record not inserted or merged. |
| 14 | **Incomplete Dataset Readiness Failure** | Dataset missing required counts (`states < 36` or `districts < 780`) | Marked status `'FAILED'`; `LocationReadinessState` remains `false`. |
| 15 | **Soft-Deprecated Record Handling** | Record with `is_active = false` queried via public reference API | Excluded from active choices; foreign keys preserved in DB. |
| 16 | **Readiness Fail-Closed Gate** | `POST /api/locations/validate` while `isReady() == false` | Rejects with **HTTP 503 Service Unavailable**. |
| 17 | **Customer Registration Resilience** | `POST /api/auth/register` (Role: `CUSTOMER`) while `isReady() == false` | Succeeds with **HTTP 201 Created** (Auth independent of location). |
| 18 | **Owner Registration Fail-Closed** | `POST /api/auth/register` (Role: `OWNER`) while `isReady() == false` | Rejects with **HTTP 503 Service Unavailable**. |
| 19 | **Historical Shop Compatibility** | Read Shop 4 (`city: London`, `district: Pune`) via discovery search | Discovery search executes successfully; Shop 4 returned without error. |
| 20 | **Phase 2.2 Marketplace Regression** | Run Phase 2.2 nearby Haversine search, text search, category filters | All Phase 2.2 test cases pass with zero regression. |
| 21 | **Tenant Isolation Enforcement** | Owner of Shop A attempts to update location of Shop B | Blocked by `ShopAccessValidator` with HTTP 403 Forbidden. |
| 22 | **Public Reference Access & Cache** | `GET /api/locations/states` without JWT bearer token | HTTP 200 OK returned with Cache-Control headers. |
| 23 | **Predictable Query Execution / No N+1** | Profile cascading lookups with query assertion inspector | Predictable 1 SQL query per tier; zero N+1 loops. |

**Regression Target:** Full existing test suite (327 tests) must pass with zero failures:
`mvn clean test` $\to$ **327 Baseline + 23 New Tests = 350 Passing Tests**.

---

## 12. Safe Rollback Strategy

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

## 13. Explicit Non-Goals for Phase 2.3

- **NON-GOAL 1:** Implementing Leaflet, OpenStreetMap, or map pin pickers (Deferred to Phase 2.5).
- **NON-GOAL 2:** Implementing browser GPS / HTML5 Geolocation capture (Deferred to Phase 2.5).
- **NON-GOAL 3:** Implementing reverse geocoding from coordinates to address (Deferred to Phase 2.5).
- **NON-GOAL 4:** Modifying frontend Next.js pages or components (`onboarding/page.tsx`, `settings/page.tsx`, etc. Deferred to Phase 2.4).
- **NON-GOAL 5:** Auto-migrating, auto-correcting, or mutating existing historical shop records.
- **NON-GOAL 6:** Adding Redis, Elasticsearch, or external caching infrastructure.
- **NON-GOAL 7:** Adding PostGIS or proprietary spatial database extensions.

---

STATUS: PENDING USER APPROVAL
