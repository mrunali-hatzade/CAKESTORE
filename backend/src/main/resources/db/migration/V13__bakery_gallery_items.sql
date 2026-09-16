-- ============================================================
-- V13__bakery_gallery_items.sql
-- Dedicated Bakery Portfolio & Showcase Gallery Items
-- ============================================================

-- 1. Create shop_gallery_items table
CREATE TABLE shop_gallery_items (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    caption TEXT,
    image_url VARCHAR(1000) NOT NULL,
    category_name VARCHAR(100) NOT NULL DEFAULT 'Bespoke',
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gallery_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- 2. Performance indexes
CREATE INDEX idx_gallery_shop_active ON shop_gallery_items(shop_id, is_active);
CREATE INDEX idx_gallery_shop_category ON shop_gallery_items(shop_id, category_name);
