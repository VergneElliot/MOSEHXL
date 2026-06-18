-- UP
CREATE TABLE IF NOT EXISTS token_blocklist (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason VARCHAR(100) NOT NULL DEFAULT 'MANUAL',
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_token_blocklist_expires_at
  ON token_blocklist (expires_at);

-- DOWN
DROP INDEX IF EXISTS idx_token_blocklist_expires_at;
DROP TABLE IF EXISTS token_blocklist;
