-- Add fields used by ContactEnquiry for admin responses.
ALTER TABLE contact_enquiries
    ADD COLUMN IF NOT EXISTS admin_reply TEXT,
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;
