-- Seed development products for CakeStore test bakeries

-- Products for Shop 6: Akurdi Artisan Bakes (Home Bakery)
INSERT INTO products (shop_id, name, description, price, image_url, availability, status)
VALUES
(6, 'Belgian Dark Chocolate Truffle', 'Signature moist dark chocolate sponge layered with 70% Belgian chocolate ganache.', 650.00, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80', true, 'ACTIVE'),
(6, 'Fresh Mango Velvet Cake', 'Seasonal Alphonso mango puree folded into whipped mascarpone cream on delicate sponge.', 720.00, 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80', true, 'ACTIVE'),
(6, 'Nutella Hazelnut Crunch', 'Rich Nutella frosting layered with roasted hazelnuts and crispy wafer crumbs.', 799.00, 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80', true, 'ACTIVE'),
(6, 'Red Velvet Cream Cheese Jar', 'Crumbled red velvet sponge layered with tangy cream cheese frosting in a glass jar.', 250.00, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80', true, 'ACTIVE');

-- Products for Shop 7: Ravet Cake Studio (Cake Studio)
INSERT INTO products (shop_id, name, description, price, image_url, availability, status)
VALUES
(7, 'Rose Pistachio Tres Leches', 'Traditional soaked sponge infused with Damascus rose water and crushed Iranian pistachios.', 850.00, 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80', true, 'ACTIVE'),
(7, 'French Macaron Gift Box (6 Pcs)', 'Assorted handcrafted French macarons: Salted Caramel, Dark Raspberry, and Pistachio.', 450.00, 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&w=800&q=80', true, 'ACTIVE'),
(7, 'Blueberry Lavender Cheesecake', 'Slow-baked New York style cheesecake crowned with wild blueberry compote.', 890.00, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80', true, 'ACTIVE');

-- Products for Shop 9: Baner Dessert Boutique (Dessert Studio)
INSERT INTO products (shop_id, name, description, price, image_url, availability, status)
VALUES
(9, 'Opera Gateau Parisienne', 'Almond joconde sponge soaked in coffee syrup, layered with ganache and coffee buttercream.', 950.00, 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=800&q=80', true, 'ACTIVE'),
(9, 'Tiramisu Classico Bowl', 'Savoiardi ladyfingers steeped in espresso and layered with mascarpone sabayon.', 550.00, 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=800&q=80', true, 'ACTIVE');

-- Intentionally leaving Shop 8 (Nigdi Sweet Treats), Shop 10 (Wakad Cloud Cakes), and Shop 11 (Kothrud Heritage Bakes) with 0 products to test Product Empty States!
