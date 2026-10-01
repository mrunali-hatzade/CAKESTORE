-- Flyway migration V32: Add customer_mobile and performance index to enquiries table
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(50);

-- Add index on shop_id and created_at to speed up owner inquiry lookups
CREATE INDEX IF NOT EXISTS idx_enquiries_shop_created ON enquiries (shop_id, created_at DESC);
