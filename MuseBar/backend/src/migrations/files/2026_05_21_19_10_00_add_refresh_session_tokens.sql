-- UP
-- P3-S4 phase 1: opaque refresh tokens stored server-side.

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  family_id UUID NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason VARCHAR(100),
  replaced_by_token_hash VARCHAR(64),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_id
  ON auth_refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_family_id
  ON auth_refresh_tokens (family_id);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at
  ON auth_refresh_tokens (expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_active
  ON auth_refresh_tokens (token_hash, revoked_at, expires_at);

-- DOWN
DROP INDEX IF EXISTS idx_auth_refresh_tokens_active;
DROP INDEX IF EXISTS idx_auth_refresh_tokens_expires_at;
DROP INDEX IF EXISTS idx_auth_refresh_tokens_family_id;
DROP INDEX IF EXISTS idx_auth_refresh_tokens_user_id;
DROP TABLE IF EXISTS auth_refresh_tokens;
SELECT 1;
