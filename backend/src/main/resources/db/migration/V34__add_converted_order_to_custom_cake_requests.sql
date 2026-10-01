ALTER TABLE custom_cake_requests ADD COLUMN IF NOT EXISTS converted_order_id BIGINT;
ALTER TABLE custom_cake_requests ADD COLUMN IF NOT EXISTS converted_order_number VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_custom_cake_requests_converted_order_id ON custom_cake_requests(converted_order_id);
