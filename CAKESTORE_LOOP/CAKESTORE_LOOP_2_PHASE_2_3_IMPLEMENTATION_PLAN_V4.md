# CAKESTORE LOOP 2 — PHASE 2.3 IMPLEMENTATION PLAN (V4)
**Canonical Indian Location Hierarchy Architecture & Implementation Specification**

**Status:** ARCHITECTURE & IMPLEMENTATION PLAN V4 — PENDING USER APPROVAL  
**Current Baseline:** 327 / 327 backend tests PASSING (100%)  
**Phase Scope:** Strictly Backend Reference Architecture, Schema (V19 DDL Only), Authoritative Seeding & Reconciliation Pipeline, and Validation Services. Zero UI, Zero GPS/Leaflet, Zero External Runtime APIs, Zero Modifications to Existing Shop Data.

---

## 1. Executive Summary & Applied V4 Corrections

This **Version 4 (V4)** specification addresses all feedback from the V3 review, providing comprehensive architectural precision across data provenance, persistence mapping, readiness sequencing, and reconciliation safeguards:

| # | V4 Review Requirement | Architectural Resolution in V4 Specification |
|---|---|---|
| **1** | **Authoritative Data Source Matrix for Every Tier** | Established an explicit 7-point specification matrix for all 6 tiers (Country, State/UT, District, City/Town, Locality/Village, Pincode). Defined exact dataset artifacts (`lgd_states_districts_2024.json`, `lgd_ulb_census_towns_2024.json`, `india_post_offices_localities_2024.csv`, `india_post_pincodes_2024.csv`, `india_post_locality_pincode_mappings_2024.csv`). Explicitly prohibited data fabrication. |
| **2** | **Correct Pincode Validation Specification** | Corrected validation definition: Indian PIN codes must be **strictly 6 numeric digits** (`^[1-9][0-9]{5}$`). Defined explicit test cases: `411035` (valid), `560001` (valid), `" 411035 "` (normalized to valid), `41103` (invalid: 5 digits), `4110357` (invalid: 7 digits), `ABC123` (invalid: alphanumeric). Eliminated misleading references to 5-digit validation. |
| **3** | **Explicit Entity & Repository Architecture** | Accounted for all 8 database tables: **7 JPA Entities** (`LocationCountry`, `LocationState`, `LocationDistrict`, `LocationCity`, `LocationLocality`, `LocationPincode`, `LocationDatasetMetadata`), **6 Spring Data Repositories** (for the 6 geographic entities). Documented that the 8th table (`location_locality_pincodes`) is a pure join table queried via projection methods on `LocationLocalityRepository` and managed via `JdbcTemplate`. Documented that `location_dataset_metadata` is managed via `JdbcTemplate` for high-throughput atomic state management. |
| **4** | **Pincode Relationship Model & Ambiguity Handling** | Decoupled PIN resolution: PIN $\to$ State (`state_id`), PIN $\to$ District (`district_id`), PIN $\leftrightarrow$ Locality (via junction table). Prohibited string-only city/locality guessing. Reverse PIN lookups return State, District, Primary/Representative City (nullable if ambiguous), and all mapped localities. Preserves real-world ambiguity rather than forcing arbitrary mappings. |
| **5** | **Safe Reconciliation Precedence** | Established strict multi-tier reconciliation order: Authoritative Identifier $\to$ Parent Relationship $\to$ Normalized Name $\to$ Approved Alias Dictionary $\to$ Unresolved Ambiguous State. Unresolvable records are **never auto-merged, never deleted, and never fabricated**; they are quarantined in an unresolved log. |
| **6** | **Synchronous Startup & Readiness Safety** | Selected **Synchronous Startup Verification with Fast Path (< 10ms)**: Flyway V19 DDL $\to$ Checksum/Metadata Verification $\to$ Count Assertions $\to$ Mark `READY`. If initial boot or checksum mismatch, runs synchronous reconciliation before opening HTTP port. If failure occurs, marks `FAILED` and fails closed on location writes. |
| **7** | **Role-Specific Registration Readiness Rule** | Disentangled authentication from location subsystem: **Customer Registration** (`CUSTOMER`) requires no location and **remains 100% available** at all times. **Owner Registration** (`OWNER`) requires shop location and **fails closed with HTTP 503** if `LocationReadinessState != READY`. Customer login and JWT verification remain 100% operational regardless of location catalog state. |
| **8** | **Preservation of All V3 Core Decisions** | Unchanged: V19 is DDL only; V1–V18 immutable; historical shops untouched; transactional tables never mutated by loader; soft deprecation; configurable cache TTL; bulk loading via `JdbcTemplate`; zero PostGIS; zero Redis; zero external runtime APIs; backend-only Phase 2.3. |
| **9** | **Expanded V4 Test Matrix** | Added test scenarios for: unresolved ambiguous records, incomplete tier readiness failure, failed reconciliation state, soft-deprecated record handling, HTTP 503 readiness gate, and role-based registration readiness divergence. |

---

## 2. Exhaustive Authoritative Data Source Matrix

CakeStore will not approximate, synthesize, or manually fabricate location records. Every canonical hierarchy tier maps to an explicit, authoritative government registry:

### 2.1 Complete Tier-by-Tier Data Specification Matrix

| Hierarchy Tier | Authoritative Organization | Exact Dataset Artifact | Identifier / Code Used | Update & Version Information | Fields Imported | Reconciliation Natural Key | Parent Relationship |
|---|---|---|---|---|---|---|---|
| **1. Country** | Survey of India / ISO 3166 Maintenance Agency | ISO 3166-1 Standard Registry | ISO Alpha-3: `IND`, Alpha-2: `IN`, Dialing: `+91` | ISO 3166-1:2020 Standard | `code`, `name`, `phone_code` | `code` (`IND`) | Root tier (No parent) |
| **2. State / UT** | Ministry of Panchayati Raj (MoPR), Government of India | Local Government Directory (LGD) State Directory (`lgd.gov.in`) | LGD State Code (Integer) + ISO 3166-2:IN (`MH`, `KA`, `DL`, etc.) | LGD Release 2024.1 (Annual MoPR Gazette) | `code`, `name`, `normalized_name`, `type`, `lgd_code` | `lgd_code` (fallback: `country_id` + `normalized_name`) | References `location_countries.id` |
| **3. District** | Ministry of Panchayati Raj (MoPR), Government of India | LGD District Directory (`lgd.gov.in`) | LGD District Code (Integer, e.g. `492` for Pune, `505` for Bengaluru Urban) | LGD Release 2024.1 (~785 official revenue districts) | `name`, `normalized_name`, `lgd_code`, `state_id` | `lgd_code` (fallback: `state_id` + `normalized_name`) | References `location_states.id` |
| **4. City / Town / Municipality** | Ministry of Housing and Urban Affairs (MoHUA) & MoPR | LGD Urban Local Bodies (ULB) & Census Towns Master (`lgd_ulb_census_towns_2024.json`) | LGD ULB Code (Integer) or Sub-District/Taluk LGD Code | MoHUA / LGD ULB Directory 2024 (~4,800 statutory municipal corporations, municipalities, and taluks) | `name`, `normalized_name`, `tier`, `lgd_ulb_code`, `district_id` | `district_id` + `lgd_ulb_code` (fallback: `district_id` + `normalized_name`) | References `location_districts.id` |
| **5. Locality / Area / Village** | Department of Posts (DoP) & LGD Wards | India Post Delivery Offices Master (`india_post_offices_localities_2024.csv`) & LGD Wards | Post Office Name / Sub-Office Code + LGD Ward Code | Department of Posts Delivery Directory 2024 via `data.gov.in` (~155,000 delivery points) | `name`, `normalized_name`, `latitude`, `longitude`, `city_id` | `city_id` + `normalized_name` | References `location_cities.id` |
| **6. Pincode / Postal Area** | Department of Posts (DoP), Ministry of Communications | All India Pincode Directory (`india_post_pincodes_2024.csv`) | 6-Digit Postal Index Number (PIN) (e.g. `411035`) | National Pincode Directory 2024 via `data.gov.in` (~19,300 unique PINs) | `pincode`, `primary_office_name`, `office_type`, `delivery_status`, `district_id`, `state_id` | `pincode` (PK) | Primary foreign keys to `location_districts.id` and `location_states.id` |
| **Junction: Locality $\leftrightarrow$ PIN** | Derived from India Post Delivery Jurisdiction Directory | India Post Locality-Pincode Mapping (`india_post_locality_pincode_mappings_2024.csv`) | Composite: `(locality_id, pincode)` | Department of Posts Delivery Mappings 2024 | `locality_id`, `pincode`, `is_primary` | `(locality_id, pincode)` (Composite PK) | References `location_localities.id` and `location_pincodes.pincode` |

### 2.2 Reconciling City & Locality Provenance Without Fabrication
To prevent inventing records:
1. **Cities / Towns:** Populated strictly from the LGD Urban Local Bodies (ULBs) and Statutory/Census Town catalog. Every record has an authoritative LGD ULB code or Census code and maps directly to its revenue district.
2. **Localities / Areas:** Populated from India Post Delivery Post Office jurisdictions (Sub-Offices and Branch Delivery Offices) and municipal ward lists.
3. **Cross-Agency Discrepancies:** Where postal office records cite historical colloquial city names (e.g. "Poona", "Baroda"), the reconciliation engine resolves the name via the approved canonical alias dictionary (e.g. "Poona" $\to$ "Pune" LGD: 492) or flags it as an unresolved ambiguity. No arbitrary mappings are guessed.

---

## 3. Pincode Validation Specification

Indian Postal Index Numbers (PIN codes) are governed strictly by the Department of Posts 6-digit schema:

### 3.1 Pincode Validation Rules
1. **Format Constraint:** Must match regular expression:
   $$\text{\textasciicircum}[1-9][0-9]\{5\}\$$$
   - Exactly **6 numeric digits**.
   - First digit must be between `1` and `9` (no leading zero).
   - Zero alphabetic or special characters allowed.
2. **Normalization Protocol:** Input is stripped of leading and trailing whitespace before evaluation.

### 3.2 Canonical Validation Test Scenarios

| Test Input | Evaluation | Expected Result | Reason |
|---|---|---|---|
| `"411035"` | Format: Pass, Database: Pass | **VALID** | Exactly 6 numeric digits; exists in canonical Pune/Maharashtra catalog. |
| `"560001"` | Format: Pass, Database: Pass | **VALID** | Exactly 6 numeric digits; exists in canonical Bengaluru/Karnataka catalog. |
| `" 411035 "` | Normalized: `"411035"`, Format: Pass | **VALID** | Whitespace safely trimmed prior to evaluation. |
| `"41103"` | Format: Fail | **INVALID (HTTP 400)** | Exactly 5 digits; rejected by regex. |
| `"4110357"` | Format: Fail | **INVALID (HTTP 400)** | Exactly 7 digits; rejected by regex. |
| `"ABC123"` | Format: Fail | **INVALID (HTTP 400)** | Alphanumeric; rejected by regex. |
| `"011035"` | Format: Fail | **INVALID (HTTP 400)** | Begins with `0`; rejected by regex. |
| `"411035"` with State="Gujarat" | Format: Pass, Database: Fail | **INVALID (HTTP 400)** | PIN belongs to Maharashtra; cross-state mismatch rejected. |

---

## 4. Explicit Entity & Repository Architecture

To ensure complete clarity during implementation, the persistence mechanism for all **8 database tables** is explicitly defined:

### 4.1 Persistence Mapping Breakdown

| Table Name | JPA Entity Class | Spring Data Repository Interface | Access & Persistence Mechanism | Rationale |
|---|---|---|---|---|
| `location_countries` | `LocationCountry.java` | `LocationCountryRepository.java` | Spring Data JPA + `@Cacheable` | Low-volume (1 row). Standard entity modeling with in-memory caching. |
| `location_states` | `LocationState.java` | `LocationStateRepository.java` | Spring Data JPA + `@Cacheable` | 36 rows. Standard entity modeling, parent scoping (`country_id`), in-memory caching. |
| `location_districts` | `LocationDistrict.java` | `LocationDistrictRepository.java` | Spring Data JPA + `@Cacheable` | ~785 rows. Parent-scoped lookups (`findByStateIdAndIsActiveTrue`), indexed navigation. |
| `location_cities` | `LocationCity.java` | `LocationCityRepository.java` | Spring Data JPA + `@Cacheable` | ~4,800 rows. Parent-scoped queries (`findByDistrictIdAndIsActiveTrue`), DTO projections. |
| `location_localities` | `LocationLocality.java` | `LocationLocalityRepository.java` | Spring Data JPA | Scoped lookups (`findByCityIdAndIsActiveTrue`), DTO projection mapping. |
| `location_pincodes` | `LocationPincode.java` | `LocationPincodeRepository.java` | Spring Data JPA + `@Cacheable` | Key-based lookup (`findById`), existence checks, join fetch with State and District. |
| `location_locality_pincodes` | **None** (Pure Join Table) | **None** (Accessed via Repository Query Methods) | **Direct JPQL/Native Queries in `LocationLocalityRepository` + `JdbcTemplate` for bulk loading** | **Why no JPA Entity:** It is a pure associative junction table containing only foreign keys `(locality_id, pincode)` and metadata flags. Creating a standalone entity introduces unnecessary collection tracking overhead. Read access is executed via projection queries in `LocationLocalityRepository` (e.g. `findLocalitiesByPincode(pin)`). Seeding uses bulk `JdbcTemplate`. |
| `location_dataset_metadata` | `LocationDatasetMetadata.java` | **None** (Accessed via dedicated `LocationDatasetMetadataDao`) | **Spring `JdbcTemplate`** | **Why no Spring Data Repository:** Metadata updates require atomic, transaction-isolated status updates (`LOADING` $\to$ `READY` / `FAILED`) and checksum queries that bypass Hibernate dirty-checking and session caching. `LocationDatasetMetadataDao` encapsulates clean, direct SQL operations. |

---

## 5. Pincode Relationship Model & Ambiguity Handling

### 5.1 Relational Cardinality

```
┌──────────────────────┐         ┌──────────────────────┐
│   location_states    │         │  location_districts  │
└──────────▲───────────┘         └──────────▲───────────┘
           │ 1:N                            │ 1:N
           │                                │
           └──────────────┬─────────────────┘
                          │
                  ┌───────┴──────────────┐
                  │  location_pincodes   │ (PK: pincode)
                  └───────▲──────────────┘
                          │ N:M (via location_locality_pincodes)
                          ▼
                  ┌──────────────────────┐
                  │ location_localities  │
                  └───────▲──────────────┘
                          │ N:1
                          ▼
                  ┌──────────────────────┐
                  │   location_cities    │
                  └──────────────────────┘
```

1. **Direct Deterministic Relationships:**
   - **PIN $\to$ State:** Exactly 1 canonical State (enforced by `state_id` foreign key).
   - **PIN $\to$ District:** Exactly 1 canonical District (enforced by `district_id` foreign key).
2. **Flexible Many-to-Many Relationships:**
   - **PIN $\leftrightarrow$ Locality:** Modeled strictly via `location_locality_pincodes`. A single PIN routinely maps to 4–20 localities, and large localities map to multiple PINs.
   - **PIN $\to$ City:** A PIN does **not** have a direct hard foreign key to `location_cities`. Instead, city associations are derived through the localities served by that PIN.
3. **Preserving Real-World Ambiguity in Reverse Lookups:**
   - When calling `GET /api/locations/pincodes/{pincode}`:
     - `pincode`: `"411035"`
     - `state`: `{ id: 1, name: "Maharashtra", code: "MH" }`
     - `district`: `{ id: 101, name: "Pune" }`
     - `primaryCity`: Populated if all mapped localities belong to a single city/corporation (e.g. `"Pimpri-Chinchwad"`). **If localities span multiple municipal boundaries, `primaryCity` is explicitly returned as `null`**, preserving real-world ambiguity rather than guessing.
     - `applicableLocalities`: Array of all mapped localities (`[{ id: 301, name: "Akurdi" }, { id: 302, name: "Pradhikaran" }]`).

---

## 6. Safe Reconciliation Precedence Engine

The reconciliation engine processes canonical dataset updates using an authoritative, 5-stage precedence hierarchy:

```
                  Input: Incoming Record
                            │
                            ▼
              [Stage 1: Authoritative Code]
          Does LGD Code / Office Code match DB?
                ├── YES ──► MATCH FOUND (Check for attribute updates)
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
          [Stage 5: UNRESOLVED AMBIGUOUS STATE]
          - DO NOT auto-merge
          - DO NOT delete
          - DO NOT invent relationships
          - Write to reconciliation_unresolved_log
```

### 6.1 Unresolved Ambiguity Quarantine
If an incoming record cannot be safely resolved against the existing catalog:
- It is **quarantined** in `reconciliation_unresolved_log` with details of the conflicting source records and parent scopes.
- It is **never automatically merged** into an existing record.
- It is **never destructively deleted**.
- A log warning is generated, and the metadata record records the unresolved count.

---

## 7. Startup & Readiness Sequencing (Synchronous Fast-Path Gate)

### 7.1 Architecture Choice: Synchronous Fast-Path Startup
CakeStore enforces **Synchronous Startup Verification with Fast Path (< 10ms)**:

```
1. Spring Boot Application Bootstraps
       │
       ▼
2. Flyway Executes V19 DDL Migration
   - Creates location tables, parent-scoped uniqueness, indexes (if not present)
       │
       ▼
3. LocationReadinessManager Evaluates Checksum & Metadata (Synchronous)
       │
       ├─────────────────────────────────────────┐
       ▼ [Fast Path: Checksum Matches & READY]   ▼ [Initial Boot or Checksum Changed]
   INSTANT VALIDATION (< 10ms)               RUN RECONCILIATION PIPELINE
   - Assert record count thresholds:         - Set status = 'LOADING'
     * states >= 36                          - Stream and reconcile dataset files
     * districts >= 780                      - Assert record count thresholds
     * pincodes >= 15,000                    - Set status = 'READY'
   - Set LocationReadinessState = READY      - Set LocationReadinessState = READY
                                             (On error: status = 'FAILED', ready = false)
       │
       ▼
4. Embedded Tomcat Opens Port 8080 & Serves Traffic
```

### 7.2 Fail-Closed Operational Behavior
If the reconciliation pipeline fails (e.g. missing seed file, corrupted JSON, failed count threshold):
1. `location_dataset_metadata.status` is set to `'FAILED'`.
2. `LocationReadinessState.isReady()` remains `false`.
3. An `ERROR` alert is logged to the console: `"CRITICAL: Canonical location catalog failed initialization. Location-dependent write endpoints are operating in FAIL-CLOSED mode."`
4. Location-dependent endpoints return **`HTTP 503 Service Unavailable`**.

---

## 8. Role-Specific Registration Readiness Rule

Authentication and registration availability are cleanly decoupled based on whether location data is mandatory for the role:

```
                     Incoming Registration Request
                                  │
                     Role == 'CUSTOMER'?
                       ├── YES ──► ALLOW REGISTRATION (No location fields required;
                       │           operates normally regardless of location catalog state)
                       └── NO
                            │
                     Role == 'OWNER'
                            │
                 LocationReadinessState.isReady()?
                       ├── YES ──► ALLOW REGISTRATION (Strict canonical validation)
                       └── NO  ──► REJECT (HTTP 503 Service Unavailable)
                                   "Location catalog initializing. Please retry."
```

### 8.1 Detailed Endpoint Behavior Matrix During `NOT_READY` / `FAILED` State

| Endpoint | Target Audience | Location Dependency | Behavior when `isReady() == false` |
|---|---|---|---|
| `POST /api/auth/register` (Role: `CUSTOMER`) | Consumers | None (No address/location fields) | **HTTP 201 Created** (100% Operational) |
| `POST /api/auth/login` | All Users | None | **HTTP 200 OK** (100% Operational) |
| `POST /api/auth/register` (Role: `OWNER`) | Bakery Owners | Mandatory (Shop address, city, state, PIN) | **HTTP 503 Service Unavailable** (Fail Closed) |
| `PUT /api/shops/my-shop` | Bakery Owners | Mandatory for location updates | **HTTP 503 Service Unavailable** (Fail Closed) |
| `POST /api/locations/validate` | Internal/External | Mandatory | **HTTP 503 Service Unavailable** (Fail Closed) |
| `GET /api/locations/**` | Public / Browsers | Reference Data | **HTTP 503 Service Unavailable** (Fail Closed) |
| `GET /api/storefront/shops/search` | Customers | Marketplace Discovery | **HTTP 200 OK** (Executes against indexed denormalized `shops` columns) |

---

## 9. Database Schema Architecture (Flyway V19 DDL Only)

Flyway migration `V19__canonical_indian_location_hierarchy.sql` is **strictly DDL**:

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

-- 3. Districts (LGD Source - Parent-Scoped Uniqueness)
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

-- 5. Localities / Areas / Villages (India Post & LGD Ward Source - Parent-Scoped Uniqueness)
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

## 10. Service & Validation Architecture

### 10.1 Authoritative Hierarchy Validation Service (`LocationValidationService`)

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
            throw new LocationServiceUnavailableException("The canonical location catalog is currently initializing.");
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
                // Stage B: Canonical Database Check
                LocationPincode pinRecord = pincodeRepo.findById(pincode).orElse(null);
                if (pinRecord == null || !pinRecord.getIsActive()) {
                    fieldErrors.put("pincode", "PIN code " + pincode + " is not registered in the active Indian postal directory.");
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

### 10.2 Configurable In-Memory Caching Architecture
- Managed via externalized properties:
  ```properties
  cakeplatform.locations.cache.enabled=true
  cakeplatform.locations.cache.ttl-minutes=1440
  cakeplatform.locations.cache.max-size=5000
  ```
- Uses Spring's `@Cacheable` abstraction with in-memory storage (Zero Redis).
- Programmatically cleared when a new verified dataset version is promoted to `READY`.

---

## 11. System Integrations & Historical Shop Data Policy

### 11.1 Integration Points for Strict Write Validation
1. **Bakery Owner Registration (`POST /api/auth/register`):**
   - In `AuthService.register()`, invoke `locationValidationService.validateLocation(...)` when `role == OWNER` before creating `Shop`.
   - Normalizes submitted names to title-cased canonical forms before persisting into denormalized `shops` columns.
2. **Owner Settings / Bakery Profile Update (`PUT /api/shops/my-shop`):**
   - In `ShopService.updateMyShopProfile()`, if any location field (`state`, `district`, `city`, `area`, `pincode`) is updated, invoke `locationValidationService.validateLocation(...)`.
   - Rejects invalid location updates before saving.

### 11.2 Absolute Protection of Historical Shop Data
- Existing shop records (such as Shop 4's historical development record) remain **100% untouched**:
  - Zero database mutations (`UPDATE shops SET ...`).
  - Zero auto-repair, zero auto-normalization, zero auto-assigned canonical IDs.
  - Zero geocoding or spatial guessing.
- The marketplace discovery query (`GET /api/storefront/shops/search` from Phase 2.2) continues executing via `ShopSpecification` against the denormalized columns on `shops`, ensuring historical bakeries remain discoverable without regression.

### 11.3 Strict Phase Boundaries
- **Phase 2.3 Boundary:** Strictly backend-only.
- **Explicit Non-Goals for Phase 2.3:**
  - ❌ No Leaflet, OpenStreetMap, Mapbox, or Google Maps scripts.
  - ❌ No GPS browser geolocation hooks or automatic coordinate resolution.
  - ❌ No reverse geocoding from latitude/longitude to address.
  - ❌ No frontend UI component edits (`onboarding/page.tsx`, `settings/page.tsx`, `explore/page.tsx`).
  - ❌ These belong exclusively to Phase 2.4 (Frontend Cascading Selection & Onboarding UX) and Phase 2.5 (Map Pinning & Spatial Geocoding).

---

## 12. Comprehensive Automated Test Strategy

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
| 9 | **Pincode State Mismatch** | PIN `560001` (Karnataka) submitted with State "Maharashtra" | Fails canonical check with HTTP 400 `fieldErrors.pincode`. |
| 10 | **Multiple Localities per PIN** | Reverse lookup on PIN 411035 | Returns Akurdi, Pradhikaran, Sector 24; no single-locality constraint error. |
| 11 | **Locality Spanning Multiple PINs** | Locality "Andheri" linked to multiple PINs in junction | Reverse lookup on either PIN resolves successfully. |
| 12 | **Ambiguous City Reverse Lookup** | PIN serving localities across multiple municipal borders | `primaryCity` returns `null`; list of localities preserved without guessing. |
| 13 | **Unresolved Ambiguity Quarantine** | Source record with unknown parent that fails reconciliation | Quarantined in unresolved log; not auto-merged or deleted. |
| 14 | **Incomplete Dataset Readiness Failure** | Dataset with `states_count < 36` or `districts_count < 780` | Checksum manager marks status `'FAILED'`; `isReady()` remains `false`. |
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

This document constitutes the complete revised architecture and implementation specification for **CakeStore Loop 2 Phase 2.3 (V4)**.

**NO SOURCE CODE HAS BEEN WRITTEN.**  
**NO DATABASE MIGRATIONS (V19) HAVE BEEN CREATED.**  
**NO TABLES HAVE BEEN CREATED.**  
**NO LOCATION DATA HAS BEEN LOADED.**  
**NO DATABASE CHANGES HAVE BEEN MADE.**  
**NO DEPENDENCIES HAVE BEEN INSTALLED.**  
**NO FRONTEND CHANGES HAVE BEEN MADE.**  

STATUS: PENDING USER APPROVAL
