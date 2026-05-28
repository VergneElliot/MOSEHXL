-- UP
-- P3-S4 follow-up: device/session tracking metadata for refresh token families.

ALTER TABLE auth_refresh_tokens
  ADD COLUMN IF NOT EXISTS client_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS ip_subnet INET;

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_active_issued
  ON auth_refresh_tokens (user_id, revoked_at, expires_at, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_family_active
  ON auth_refresh_tokens (user_id, family_id, revoked_at);

-- DOWN
DROP INDEX IF EXISTS idx_auth_refresh_tokens_user_family_active;
DROP INDEX IF EXISTS idx_auth_refresh_tokens_user_active_issued;
ALTER TABLE auth_refresh_tokens
  DROP COLUMN IF EXISTS ip_subnet,
  DROP COLUMN IF EXISTS client_id;
SELECT 1;
