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
CREATE INDEX IF NOT EXISTS idx_shops_active_lat_lng 
    ON shops(latitude, longitude) 
    WHERE status = 'ACTIVE' AND latitude IS NOT NULL AND longitude IS NOT NULL;
