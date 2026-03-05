-- UP
-- Shared rate limit store for PostgreSQL-backed rate limiting (replaces in-memory store).

CREATE TABLE IF NOT EXISTS rate_limit_store (
  key         TEXT PRIMARY KEY,
  count       INT NOT NULL DEFAULT 0,
  reset_time  TIMESTAMPTZ NOT NULL
);

-- DOWN
DROP TABLE IF EXISTS rate_limit_store;
