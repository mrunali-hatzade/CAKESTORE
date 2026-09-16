ALTER TABLE payments ADD COLUMN plan_id BIGINT REFERENCES subscription_plans(id);
