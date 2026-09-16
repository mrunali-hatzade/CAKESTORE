-- V24__add_missing_performance_indexes.sql

-- 1. Index on order_items.order_id
-- Crucial for preventing full table scans when fetching an Order and its items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 2. Indexes on payments provider IDs
-- Crucial for Razorpay webhooks (payment.captured, payment.failed) which lookup via provider_order_id
CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON payments(provider_order_id);

-- Used during manual verification flows
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
