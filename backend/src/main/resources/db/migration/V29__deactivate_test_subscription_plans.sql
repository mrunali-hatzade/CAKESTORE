-- Deactivate test and dummy subscription plans
UPDATE subscription_plans
SET is_active = false
WHERE (price < 50.00 OR description ILIKE '%vcxvc%' OR description ILIKE '%test%')
  AND is_active = true;
