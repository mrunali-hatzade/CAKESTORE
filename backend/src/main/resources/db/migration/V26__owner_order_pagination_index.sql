-- V26__owner_order_pagination_index.sql
-- Adds composite index on shop_id and created_at to support pageable queries without filesorting
CREATE INDEX IF NOT EXISTS idx_orders_shop_created ON orders (shop_id, created_at DESC);