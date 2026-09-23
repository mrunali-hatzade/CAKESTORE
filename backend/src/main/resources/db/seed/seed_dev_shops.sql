-- Seed development shops for CakeStore Marketplace V2 Real Testing

-- 1. Realistic ACTIVE Bakeries with required location hierarchy and business types
INSERT INTO shops (owner_id, business_name, description, phone, email, address, area, city, district, state, pincode, business_category, business_type, status, cover_image_url, logo_url)
VALUES 
(2, 'Akurdi Artisan Bakes', 'Handcrafted customized birthday and truffle cakes made with premium Belgian chocolate.', '+91 9876543210', 'akurdi.bakes@example.com', 'Shop 4, Near Akurdi Railway Station, Sector 28', 'Akurdi', 'Pimpri-Chinchwad', 'Pune', 'Maharashtra', '411035', 'Custom Cakes', 'HOME_BAKERY', 'ACTIVE', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=200&q=80'),

(3, 'Ravet Cake Studio', 'Boutique cake studio specializing in layered celebration cakes, macarons and cupcakes.', '+91 9876543211', 'ravet.studio@example.com', 'Plot 12, Shinde Vasti, Ravet BRTS Road', 'Ravet', 'Pimpri-Chinchwad', 'Pune', 'Maharashtra', '412101', 'Artisan Pastries', 'CAKE_STUDIO', 'ACTIVE', 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=200&q=80'),

(4, 'Nigdi Sweet Treats', 'Freshly baked everyday sponge cakes, eggless pastries and tea cakes.', '+91 9876543212', 'nigdi.sweets@example.com', 'Main Market, Pradhikaran, Nigdi', 'Nigdi', 'Pimpri-Chinchwad', 'Pune', 'Maharashtra', '411044', 'Bakery Shop', 'BAKERY_SHOP', 'ACTIVE', 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=200&q=80'),

(2, 'Baner Dessert Boutique', 'Artisan European desserts, mousse cakes and custom anniversary centerpieces.', '+91 9876543213', 'baner.dessert@example.com', 'High Street, Baner Road', 'Baner', 'Pune', 'Pune', 'Maharashtra', '411045', 'Dessert Studio', 'CAKE_STUDIO', 'ACTIVE', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=200&q=80'),

(3, 'Wakad Cloud Cakes', 'Online cloud bakery offering express 2-hour doorstep deliveries for midnight birthdays.', '+91 9876543214', 'wakad.cloud@example.com', 'Dange Chowk, Wakad', 'Wakad', 'Pune', 'Pune', 'Maharashtra', '411057', 'Online Bakery', 'ONLINE_CAKE_BUSINESS', 'ACTIVE', 'https://images.unsplash.com/photo-1557925923-cd4648e211a0?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=200&q=80'),

(4, 'Kothrud Heritage Bakes', 'Traditional Maharashtrian tea cakes, mawa cakes and authentic oven-fresh bakes.', '+91 9876543215', 'kothrud.bakes@example.com', 'Near Karve Statue, Kothrud', 'Kothrud', 'Pune', 'Pune', 'Maharashtra', '411038', 'Bakery Shop', 'BAKERY_SHOP', 'ACTIVE', 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=200&q=80');

-- 2. Test EXCLUDED shops (non-ACTIVE) to verify marketplace exclusion rules
INSERT INTO shops (owner_id, business_name, description, phone, email, address, area, city, district, state, pincode, business_category, business_type, status)
VALUES 
(2, 'Pending Baker Akurdi', 'Akurdi home baker currently undergoing verification.', '+91 9999900001', 'pending.akurdi@example.com', 'Sector 27, Akurdi', 'Akurdi', 'Pimpri-Chinchwad', 'Pune', 'Maharashtra', '411035', 'Custom Cakes', 'HOME_BAKERY', 'PENDING'),

(3, 'Inactive Studio Baner', 'Temporarily closed boutique studio.', '+91 9999900002', 'inactive.baner@example.com', 'Baner Link Road', 'Baner', 'Pune', 'Pune', 'Maharashtra', '411045', 'Dessert Studio', 'CAKE_STUDIO', 'INACTIVE'),

(4, 'Suspended Cakes Wakad', 'Bakery suspended due to policy violation.', '+91 9999900003', 'suspended.wakad@example.com', 'Datta Mandir Road, Wakad', 'Wakad', 'Pune', 'Pune', 'Maharashtra', '411057', 'Online Bakery', 'ONLINE_CAKE_BUSINESS', 'SUSPENDED');
