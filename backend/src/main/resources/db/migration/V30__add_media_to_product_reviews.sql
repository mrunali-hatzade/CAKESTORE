-- V30: Add customer photo/video media to product_reviews
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS cake_image_url VARCHAR(1000);
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS cake_video_url VARCHAR(1000);
