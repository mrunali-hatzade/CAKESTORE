CREATE TABLE broadcast_history (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_type VARCHAR(255) NOT NULL,
    target_owner_id BIGINT,
    recipient_count INTEGER NOT NULL,
    sent_email BOOLEAN NOT NULL,
    sent_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);
