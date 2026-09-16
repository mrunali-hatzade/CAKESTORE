-- Add billing_cycle to distinguish between monthly/yearly variants
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly';

-- Deactivate existing test/legacy plans so they aren't shown to new customers
UPDATE subscription_plans SET is_active = false;

-- Seed the official business plans
INSERT INTO subscription_plans (name, description, price, currency, billing_cycle, duration_days, features, is_active)
VALUES 
('Pro Baker Studio Suite', 'Complete bakery management suite with monthly billing.', 350.00, 'INR', 'monthly', 30, '["Storefront", "Order Management", "No Commission"]', true),
('Pro Baker Studio Suite', 'Complete bakery management suite with annual billing (Save ₹700).', 3500.00, 'INR', 'yearly', 365, '["Storefront", "Order Management", "No Commission", "Priority Support"]', true);
