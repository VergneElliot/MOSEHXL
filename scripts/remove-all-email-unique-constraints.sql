-- Migration script to remove ALL email uniqueness constraints
-- This allows multiple establishments and users to use the same email address

-- Remove unique constraint from users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Remove unique constraint from establishments table  
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_email_key;

-- Remove any unique indexes on email columns
DROP INDEX IF EXISTS idx_users_email_unique;
DROP INDEX IF EXISTS idx_establishments_email_unique;

-- Recreate regular indexes (non-unique) for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_establishments_email ON establishments(email);

-- Add comments to document the changes
COMMENT ON TABLE users IS 'Users table - email uniqueness removed to allow multiple establishments per owner';
COMMENT ON TABLE establishments IS 'Multi-tenant establishments with isolated data schemas - email uniqueness removed to allow multiple establishments per owner';

-- Show the current constraints to verify removal
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
    AND kcu.column_name = 'email'
    AND tc.constraint_type = 'UNIQUE';
