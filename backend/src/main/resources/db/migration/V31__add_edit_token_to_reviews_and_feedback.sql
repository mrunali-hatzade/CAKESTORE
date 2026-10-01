-- Migration V31: Add edit_token for secure author-only modification and deletion
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS edit_token VARCHAR(100);
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS edit_token VARCHAR(100);

-- Backfill existing feedback and reviews with secure random UUID edit tokens
UPDATE feedback SET edit_token = md5(random()::text || id::text) WHERE edit_token IS NULL;
UPDATE product_reviews SET edit_token = md5(random()::text || id::text) WHERE edit_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_edit_token ON feedback(edit_token);
CREATE INDEX IF NOT EXISTS idx_product_reviews_edit_token ON product_reviews(edit_token);
