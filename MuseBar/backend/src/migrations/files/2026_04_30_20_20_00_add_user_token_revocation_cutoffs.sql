-- UP
CREATE TABLE IF NOT EXISTS user_token_revocation_cutoffs (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  revoke_before_iat BIGINT NOT NULL,
  reason VARCHAR(100) NOT NULL DEFAULT 'MANUAL_GLOBAL_REVOKE',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_token_revocation_cutoffs_revoke_before_iat
  ON user_token_revocation_cutoffs (revoke_before_iat);

-- DOWN
DROP INDEX IF EXISTS idx_user_token_revocation_cutoffs_revoke_before_iat;
DROP TABLE IF EXISTS user_token_revocation_cutoffs;
