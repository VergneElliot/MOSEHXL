-- UP
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS can_login BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN users.can_login IS
  'Venue login accounts can_login=true; PIN-only staff actors can_login=false (no email/password login).';

-- SCHEMA_SNAPSHOT_NOT_REQUIRED

-- DOWN
ALTER TABLE users DROP COLUMN IF EXISTS can_login;
