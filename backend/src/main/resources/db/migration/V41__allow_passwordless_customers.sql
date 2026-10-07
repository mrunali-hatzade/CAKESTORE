-- ============================================================
-- V41__allow_passwordless_customers.sql
-- CAKESTORE CUSTOMER ACCOUNT HYDRATION
-- ============================================================

-- Drop NOT NULL constraints to allow passwordless phone-based Customer accounts.
-- Shop owners and admins are still required to have these fields via application logic.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
