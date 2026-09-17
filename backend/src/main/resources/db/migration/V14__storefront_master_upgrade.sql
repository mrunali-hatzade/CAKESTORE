-- ============================================================
-- V14__storefront_master_upgrade.sql
-- CakeStore Storefront Master Upgrade Schema & Migrations
-- Phase 1 & 2: Database Schema & Core Entities
-- ============================================================

-- 1. Product Images Table (Up to 3 alternative images per product + main image)
CREATE TABLE IF NOT EXISTS product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    image_url VARCHAR(1000) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    alt_text VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- 2. Product Highlights Table (Structured entity, not comma-separated text)
CREATE TABLE IF NOT EXISTS product_highlights (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    highlight_text VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_highlights_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_highlights_product_id ON product_highlights(product_id);

-- 3. Extend products table for Original/Compare-at Price & Egg Preference
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_egg_choice BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS egg_preference_default VARCHAR(50) DEFAULT 'EGGLESS';
ALTER TABLE products ADD COLUMN IF NOT EXISTS eggless_price_diff NUMERIC(10, 2) DEFAULT 0.00;

-- 4. Extend product_variants table for Flavor Images, Original Price & Extensibility
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS image_url VARCHAR(1000);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS description VARCHAR(500);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS variant_type VARCHAR(50) NOT NULL DEFAULT 'FLAVOUR';

-- 5. Extend shops table for About Story, About Image and Logo
ALTER TABLE shops ADD COLUMN IF NOT EXISTS about_story TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS about_image_url VARCHAR(1000);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS show_about_image BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS map_location_url VARCHAR(1000);

-- 6. Shop Hero Banners Table (Multi-banner carousel with display order and toggle)
CREATE TABLE IF NOT EXISTS shop_banners (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    image_url VARCHAR(1000) NOT NULL,
    title VARCHAR(255),
    subtitle VARCHAR(500),
    button_text VARCHAR(100),
    button_url VARCHAR(500),
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shop_banners_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_shop_banners_shop_id ON shop_banners(shop_id, is_active, display_order);

-- 7. Shop Business Hours Table (All 7 days, open/closed, open_time, close_time)
CREATE TABLE IF NOT EXISTS shop_business_hours (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    open_time TIME NOT NULL DEFAULT '09:00:00',
    close_time TIME NOT NULL DEFAULT '21:00:00',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shop_hours_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT uk_shop_hours_day UNIQUE (shop_id, day_of_week)
);
CREATE INDEX IF NOT EXISTS idx_shop_business_hours_shop ON shop_business_hours(shop_id);

-- 8. Dedicated Authoritative Shop Delivery Configuration
CREATE TABLE IF NOT EXISTS shop_delivery_configs (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL UNIQUE,
    delivery_charge_type VARCHAR(50) NOT NULL DEFAULT 'FIXED',
    fixed_charge_amount NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    min_order_for_free_delivery NUMERIC(10, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_delivery_config_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- 9. Shop Storefront Settings Table (Non-technical owner toggles for sections & fulfillment)
CREATE TABLE IF NOT EXISTS shop_storefront_settings (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL UNIQUE,
    hero_banner_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    top_rated_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reviews_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    bakery_info_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    categories_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    filters_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ratings_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    about_story_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    about_image_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    fulfillment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    lead_time_days INT NOT NULL DEFAULT 2,
    lead_time_message VARCHAR(500) DEFAULT 'Orders require 2 days advance booking.',
    custom_cakes_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    phone_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    address_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    map_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    business_hours_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_storefront_settings_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- 10. Custom Cake Form Builder Schema (Owner configurable fields)
CREATE TABLE IF NOT EXISTS shop_custom_form_fields (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    options_json TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_custom_form_fields_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT uk_custom_form_field_shop_key UNIQUE (shop_id, field_key)
);
CREATE INDEX IF NOT EXISTS idx_custom_form_fields_shop ON shop_custom_form_fields(shop_id, is_enabled, display_order);

-- 11. Custom Cake Submissions Dynamic Field Values Table
CREATE TABLE IF NOT EXISTS custom_cake_request_field_values (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_value TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_field_values_req FOREIGN KEY (request_id) REFERENCES custom_cake_requests(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_custom_cake_field_values_req ON custom_cake_request_field_values(request_id);

-- 12. Public Bakery Feedback Table Extensions (Moderation & Email)
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_feedback_shop_approved ON feedback(shop_id, is_approved);

-- 13. OrderItem Snapshot Enhancements
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_image_url VARCHAR(1000);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);

-- 14. DATA MIGRATION: Seed Default Configurations for Existing Shops
INSERT INTO shop_delivery_configs (shop_id, delivery_charge_type, fixed_charge_amount, min_order_for_free_delivery)
SELECT s.id, 'FIXED', 50.00, 1000.00
FROM shops s
WHERE NOT EXISTS (SELECT 1 FROM shop_delivery_configs dc WHERE dc.shop_id = s.id);

INSERT INTO shop_storefront_settings (shop_id, hero_banner_enabled, top_rated_enabled, reviews_enabled, bakery_info_enabled,
                                      categories_enabled, filters_enabled, ratings_enabled, about_story_enabled,
                                      about_image_enabled, fulfillment_enabled, lead_time_days, lead_time_message,
                                      custom_cakes_enabled, whatsapp_enabled, phone_enabled, email_enabled,
                                      address_enabled, map_enabled, business_hours_enabled)
SELECT s.id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 2, 'Orders require 2 days advance booking.',
       TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
FROM shops s
WHERE NOT EXISTS (SELECT 1 FROM shop_storefront_settings ss WHERE ss.shop_id = s.id);

INSERT INTO shop_business_hours (shop_id, day_of_week, is_open, open_time, close_time)
SELECT s.id, d.day, TRUE, '09:00:00'::TIME, '21:00:00'::TIME
FROM shops s
CROSS JOIN (
    SELECT 'MONDAY' AS day UNION ALL
    SELECT 'TUESDAY' UNION ALL
    SELECT 'WEDNESDAY' UNION ALL
    SELECT 'THURSDAY' UNION ALL
    SELECT 'FRIDAY' UNION ALL
    SELECT 'SATURDAY' UNION ALL
    SELECT 'SUNDAY'
) d
WHERE NOT EXISTS (
    SELECT 1 FROM shop_business_hours bh WHERE bh.shop_id = s.id AND bh.day_of_week = d.day
);

INSERT INTO shop_custom_form_fields (shop_id, field_key, field_label, field_type, is_required, is_enabled, options_json, display_order)
SELECT s.id, f.key, f.label, f.type, f.req, TRUE, f.opts, f.ord
FROM shops s
CROSS JOIN (
    SELECT 'customer_name' AS key, 'Customer Name' AS label, 'TEXT' AS type, TRUE AS req, NULL AS opts, 1 AS ord UNION ALL
    SELECT 'customer_phone', 'Phone Number', 'TEXT', TRUE, NULL, 2 UNION ALL
    SELECT 'customer_email', 'Email Address', 'TEXT', TRUE, NULL, 3 UNION ALL
    SELECT 'flavour', 'Cake Flavour', 'DROPDOWN', TRUE, '["Belgian Dark Truffle", "Red Velvet Cream Cheese", "Alfonso Mango Mascarpone", "Lotus Biscoff Ganache", "Nutella Hazelnut Praline", "Vanilla Bean Berry Compote"]', 4 UNION ALL
    SELECT 'servings', 'Cake Weight / Servings', 'DROPDOWN', TRUE, '["500g (4-6 serves)", "1 kg (8-12 serves)", "1.5 kg (12-16 serves)", "2 kg (18-24 serves)", "3+ kg Multi-tier"]', 5 UNION ALL
    SELECT 'occasion', 'Occasion', 'DROPDOWN', TRUE, '["Birthday", "Wedding", "Anniversary", "Baby Shower", "Corporate Event", "Other Celebration"]', 6 UNION ALL
    SELECT 'delivery_date', 'Delivery Date', 'DATE', TRUE, NULL, 7 UNION ALL
    SELECT 'delivery_time', 'Delivery Time', 'TIME', FALSE, NULL, 8 UNION ALL
    SELECT 'budget', 'Estimated Budget (₹)', 'NUMBER', FALSE, NULL, 9 UNION ALL
    SELECT 'reference_image', 'Reference Image', 'IMAGE', FALSE, NULL, 10 UNION ALL
    SELECT 'cake_message', 'Cake Message', 'TEXT', FALSE, NULL, 11 UNION ALL
    SELECT 'design_description', 'Design Description & Instructions', 'TEXTAREA', TRUE, NULL, 12 UNION ALL
    SELECT 'number_of_tiers', 'Number of Tiers', 'DROPDOWN', FALSE, '["Single Tier", "2 Tiers", "3 Tiers", "4+ Tiers"]', 13 UNION ALL
    SELECT 'dietary_preference', 'Egg Preference', 'RADIO', TRUE, '["100% Pure Veg (Eggless)", "Contains Egg"]', 14 UNION ALL
    SELECT 'additional_instructions', 'Additional Instructions', 'TEXTAREA', FALSE, NULL, 15
) f
WHERE NOT EXISTS (
    SELECT 1 FROM shop_custom_form_fields cff WHERE cff.shop_id = s.id AND cff.field_key = f.key
);

-- 15. SPECIFIC SEED DATA FOR DEMO SHOP 6 & PRODUCT 17
UPDATE shops
SET about_story = 'Founded with a passion for European confectionery artistry, Akurdi Artisan Bakes creates exquisite bespoke celebration cakes, artisanal pastries, and handcrafted desserts in Pune. We use authentic European butter, high-cocoa couverture chocolate, and pure natural fruit extracts with zero synthetic dough softeners.',
    about_image_url = 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
    show_about_image = TRUE,
    whatsapp_number = '919876543210',
    map_location_url = 'https://maps.google.com/?q=Akurdi+Artisan+Bakes+Pune'
WHERE id = 6;

INSERT INTO shop_banners (shop_id, image_url, title, subtitle, button_text, button_url, display_order, is_active)
SELECT s.id, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1600&q=80',
       'Handcrafted Artisan Cakes', 'Pure butter, Belgian couverture chocolate, and bespoke designs baked fresh daily.',
       'Explore Menu', '?tab=shop', 1, TRUE
FROM shops s
WHERE s.id = 6
  AND NOT EXISTS (SELECT 1 FROM shop_banners WHERE shop_id = s.id AND display_order = 1);

INSERT INTO shop_banners (shop_id, image_url, title, subtitle, button_text, button_url, display_order, is_active)
SELECT s.id, 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=1600&q=80',
       'Dream Wedding & Tiered Creations', 'Custom crafted centerpiece cakes designed specifically for your memorable day.',
       'Custom Inquiry', '?tab=custom-cakes', 2, TRUE
FROM shops s
WHERE s.id = 6
  AND NOT EXISTS (SELECT 1 FROM shop_banners WHERE shop_id = s.id AND display_order = 2);

UPDATE products
SET price = 650.00,
    original_price = 799.00,
    allow_egg_choice = TRUE,
    egg_preference_default = 'EGGLESS',
    eggless_price_diff = 0.00,
    ingredients = 'Belgian dark couverture chocolate (70% cocoa), unbleached wheat flour, European dairy butter, rich Dutch cocoa powder, fresh dairy cream, organic cane sugar.',
    allergens = 'Contains wheat (gluten) and dairy. Prepared in an artisan kitchen that also handles hazelnuts and almonds.'
WHERE id = 17;

INSERT INTO product_images (product_id, image_url, display_order, alt_text)
SELECT p.id, 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=900&q=80', 1, 'Angle Slice View'
FROM products p
WHERE p.id = 17
  AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = p.id AND display_order = 1);

INSERT INTO product_images (product_id, image_url, display_order, alt_text)
SELECT p.id, 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=80', 2, 'Top Ganache Texture'
FROM products p
WHERE p.id = 17
  AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = p.id AND display_order = 2);

INSERT INTO product_images (product_id, image_url, display_order, alt_text)
SELECT p.id, 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=900&q=80', 3, 'Layered Presentation'
FROM products p
WHERE p.id = 17
  AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = p.id AND display_order = 3);

INSERT INTO product_highlights (product_id, highlight_text, display_order)
SELECT p.id, '100% Pure Veg (Eggless Available)', 1
FROM products p
WHERE p.id = 17
  AND NOT EXISTS (SELECT 1 FROM product_highlights WHERE product_id = p.id AND display_order = 1);

INSERT INTO product_highlights (product_id, highlight_text, display_order)
SELECT p.id, 'Zero Preservatives', 2
FROM products p
WHERE p.id = 17
  AND NOT EXISTS (SELECT 1 FROM product_highlights WHERE product_id = p.id AND display_order = 2);

INSERT INTO product_highlights (product_id, highlight_text, display_order)
SELECT p.id, 'Baked Fresh to Order', 3
FROM products p
WHERE p.id = 17
  AND NOT EXISTS (SELECT 1 FROM product_highlights WHERE product_id = p.id AND display_order = 3);

INSERT INTO product_variants (product_id, name, price, original_price, image_url, description, is_available, display_order, variant_type)
SELECT p.id, 'Belgian Dark Truffle', 650.00, 799.00,
       'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
       'Rich 70% dark chocolate ganache layered with moist sponge', TRUE, 1, 'FLAVOUR'
FROM products p
WHERE p.id = 17
  AND NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p.id AND name = 'Belgian Dark Truffle');

INSERT INTO product_variants (product_id, name, price, original_price, image_url, description, is_available, display_order, variant_type)
SELECT p.id, 'Royal Milk Chocolate Drip', 680.00, 820.00,
       'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80',
       'Velvety Swiss milk chocolate with gold foil pearls and caramel drizzle', TRUE, 2, 'FLAVOUR'
FROM products p
WHERE p.id = 17
  AND NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p.id AND name = 'Royal Milk Chocolate Drip');

INSERT INTO product_variants (product_id, name, price, original_price, image_url, description, is_available, display_order, variant_type)
SELECT p.id, 'Hazelnut Praline Truffle', 720.00, 875.00,
       'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
       'Roasted Piedmont hazelnuts blended with dark truffle cream', TRUE, 3, 'FLAVOUR'
FROM products p
WHERE p.id = 17
  AND NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p.id AND name = 'Hazelnut Praline Truffle');
