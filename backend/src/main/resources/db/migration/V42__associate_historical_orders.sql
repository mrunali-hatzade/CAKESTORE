-- ============================================================
-- V42__associate_historical_orders.sql
-- CAKESTORE HISTORICAL ORDER ASSOCIATION
-- ============================================================

-- Associate historical guest orders with any matching Customer or Owner accounts
-- Normalizing by removing +91 for comparison if present
UPDATE orders o
SET customer_id = u.id
FROM users u
WHERE (
        REPLACE(o.customer_phone, '+91', '') = u.mobile
        OR o.customer_phone = u.mobile
      )
  AND o.customer_id IS NULL;
