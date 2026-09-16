-- ============================================================
-- V17__owner_identity_and_phone_uniqueness.sql
-- CAKESTORE LOOP 1: REGISTRATION & IDENTITY INTEGRITY
-- ============================================================

-- 0. Clean up any historical duplicate mobile numbers before enforcing uniqueness.
-- Retain mobile on the latest user record (highest id) and set older duplicate rows to NULL.
WITH ranked_duplicate_mobiles AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY mobile ORDER BY id DESC) as rn
    FROM users
    WHERE mobile IS NOT NULL AND mobile <> ''
)
UPDATE users
SET mobile = NULL
WHERE id IN (
    SELECT id FROM ranked_duplicate_mobiles WHERE rn > 1
);

-- 1. Ensure phone/mobile uniqueness for users where mobile is present.
-- Null and empty strings are permitted to coexist without violating uniqueness,
-- while all populated canonical mobile numbers must be strictly unique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mobile_unique 
    ON users (mobile) 
    WHERE mobile IS NOT NULL AND mobile <> '';

-- 2. Enforce One Owner -> One Digital Bakery Store at the database level.
-- Each owner user can only own at most one shop.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_shops_owner_id'
    ) THEN
        ALTER TABLE shops ADD CONSTRAINT uk_shops_owner_id UNIQUE (owner_id);
    END IF;
END $$;
