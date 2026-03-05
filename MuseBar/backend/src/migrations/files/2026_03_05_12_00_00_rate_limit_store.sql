-- ============================================================
-- Migration: Rate limit store (shared across processes)
-- ============================================================
-- Why: In-memory rate limiting does not work across multiple
-- server processes and resets on restart. A shared table lets
-- all instances and restarts share the same counters (audit #40).
-- ============================================================

-- UP

CREATE TABLE IF NOT EXISTS rate_limit_store (
  key         TEXT PRIMARY KEY,
  count       INT NOT NULL DEFAULT 0,
  reset_time  TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE rate_limit_store IS 'Shared rate limit counters; key is e.g. ip:1.2.3.4 or user:42';

-- DOWN

DROP TABLE IF EXISTS rate_limit_store;
