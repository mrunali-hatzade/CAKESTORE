-- V43__customer_saved_addresses.sql

CREATE TABLE customer_addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    label VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(50) NOT NULL,
    delivery_address TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_addresses_user_id ON customer_addresses(user_id);
