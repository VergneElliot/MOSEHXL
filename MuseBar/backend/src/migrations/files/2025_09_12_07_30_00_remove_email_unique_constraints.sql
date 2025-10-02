-- UP
-- Migration: Remove email uniqueness constraints
-- This allows multiple establishments and users to use the same email address

-- Remove unique constraint from users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Remove unique constraint from establishments table  
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_email_key;

-- Remove unique constraint on (email, establishment_id) from users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_establishment_id_key;

-- Remove any unique indexes on email columns
DROP INDEX IF EXISTS idx_users_email_unique;
DROP INDEX IF EXISTS idx_establishments_email_unique;
DROP INDEX IF EXISTS idx_users_email_establishment_unique;

-- Recreate regular indexes (non-unique) for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_establishments_email ON establishments(email);
CREATE INDEX IF NOT EXISTS idx_users_email_establishment ON users(email, establishment_id);

-- Add comments to document the changes
COMMENT ON TABLE users IS 'Users table - email uniqueness removed to allow multiple establishments per owner';
COMMENT ON TABLE establishments IS 'Multi-tenant establishments with isolated data schemas - email uniqueness removed to allow multiple establishments per owner';

-- DOWN
-- Restore email uniqueness constraints (rollback)

-- Add back unique constraint on users table
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Add back unique constraint on establishments table
ALTER TABLE establishments ADD CONSTRAINT establishments_email_key UNIQUE (email);

-- Add back unique constraint on (email, establishment_id) from users table
ALTER TABLE users ADD CONSTRAINT users_email_establishment_id_key UNIQUE (email, establishment_id);

-- Remove the non-unique indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_establishments_email;
DROP INDEX IF EXISTS idx_users_email_establishment;

-- Restore original comments
COMMENT ON TABLE users IS 'Users table for authentication';
COMMENT ON TABLE establishments IS 'Multi-tenant establishments with isolated data schemas';
