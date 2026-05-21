-- UP
-- P3-S8: admin TOTP 2FA support on user accounts.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_totp_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_totp_secret TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_totp_enabled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_mfa_totp_enabled
  ON users (mfa_totp_enabled);

-- DOWN
DROP INDEX IF EXISTS idx_users_mfa_totp_enabled;

ALTER TABLE users
  DROP COLUMN IF EXISTS mfa_totp_enabled_at;

ALTER TABLE users
  DROP COLUMN IF EXISTS mfa_totp_secret;

ALTER TABLE users
  DROP COLUMN IF EXISTS mfa_totp_enabled;
