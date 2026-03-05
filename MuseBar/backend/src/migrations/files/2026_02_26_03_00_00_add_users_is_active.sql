-- UP
-- Add is_active column to users table.
-- Existing V1 users default to TRUE (active).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_users_is_active
  ON users(is_active) WHERE is_active = TRUE;

-- DOWN
DROP INDEX IF EXISTS idx_users_is_active;

ALTER TABLE users
  DROP COLUMN IF EXISTS is_active;
