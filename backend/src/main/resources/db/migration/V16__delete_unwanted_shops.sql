-- V16__delete_unwanted_shops.sql
-- --------------------------------------------------------------
-- Keep only 3 bakeries:
--   1. Sweet Delight Bakery (Shop ID: 17, owner: owner@sweetdelight.com)
--   2. Mruns bakery (Shop ID: 5, owner: mrunalithatzade20@gmail.com)
--   3. John's Premium Cakes (Shop ID: 4, London, Greater London)
-- --------------------------------------------------------------

-- Clean up dependent tables that do not have ON DELETE CASCADE
DELETE FROM business_documents WHERE shop_id NOT IN (4, 5, 17);
DELETE FROM shop_payout_details WHERE shop_id NOT IN (4, 5, 17);
DELETE FROM feedback WHERE shop_id NOT IN (4, 5, 17);
DELETE FROM enquiries WHERE shop_id NOT IN (4, 5, 17);
DELETE FROM custom_cake_requests WHERE shop_id NOT IN (4, 5, 17);
DELETE FROM activity_logs WHERE shop_id IS NOT NULL AND shop_id NOT IN (4, 5, 17);

-- Delete all other shops (products, subscriptions, orders, etc. cascade delete)
DELETE FROM shops WHERE id NOT IN (4, 5, 17);

