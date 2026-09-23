-- V27: Extend feedback table with cake product associations, recommendation text, and customer photo/video media
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS recommendation_text TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS cake_image_url VARCHAR(1000);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS cake_video_url VARCHAR(1000);

CREATE INDEX IF NOT EXISTS idx_feedback_product_id ON feedback(product_id);
