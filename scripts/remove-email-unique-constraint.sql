-- Migration script to remove email uniqueness constraint from establishments table
-- This allows multiple establishments to use the same email address

-- Remove the unique constraint on email column
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_email_key;

-- Also remove any unique index on email if it exists
DROP INDEX IF EXISTS idx_establishments_email_unique;

-- Recreate the regular index (non-unique) for performance
CREATE INDEX IF NOT EXISTS idx_establishments_email ON establishments(email);

-- Add a comment to document the change
COMMENT ON TABLE establishments IS 'Multi-tenant establishments with isolated data schemas - email uniqueness removed to allow multiple establishments per owner'; 