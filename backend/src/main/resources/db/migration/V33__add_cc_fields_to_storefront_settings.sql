ALTER TABLE shop_storefront_settings ADD COLUMN cc_field_occasion_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shop_storefront_settings ADD COLUMN cc_field_flavour_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shop_storefront_settings ADD COLUMN cc_field_servings_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shop_storefront_settings ADD COLUMN cc_field_date_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shop_storefront_settings ADD COLUMN cc_field_budget_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shop_storefront_settings ADD COLUMN cc_field_delivery_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shop_storefront_settings ADD COLUMN cc_field_design_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shop_storefront_settings ADD COLUMN cc_field_reference_enabled BOOLEAN NOT NULL DEFAULT TRUE;
