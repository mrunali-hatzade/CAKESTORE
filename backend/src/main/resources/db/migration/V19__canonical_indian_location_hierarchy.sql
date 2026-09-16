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
