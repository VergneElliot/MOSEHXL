-- UP
-- P3-S6: account lockout after repeated failed logins.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS lockout_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_locked_until
  ON users(locked_until)
  WHERE locked_until IS NOT NULL;

-- DOWN
DROP INDEX IF EXISTS idx_users_locked_until;

ALTER TABLE users
  DROP COLUMN IF EXISTS locked_until;

ALTER TABLE users
  DROP COLUMN IF EXISTS lockout_count;

ALTER TABLE users
  DROP COLUMN IF EXISTS failed_login_attempts;
