-- UP
-- Employee time clock (pointage): time_entries + RLS.

CREATE TABLE IF NOT EXISTS time_entries (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  clock_out_at TIMESTAMPTZ,
  clock_in_ip TEXT,
  clock_out_ip TEXT,
  source VARCHAR(32) NOT NULL DEFAULT 'self',
  note TEXT,
  adjusted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT time_entries_source_check
    CHECK (source IN ('self', 'shared_terminal', 'admin')),
  CONSTRAINT time_entries_out_after_in_check
    CHECK (clock_out_at IS NULL OR clock_out_at > clock_in_at)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_est_clock_in
  ON time_entries (establishment_id, clock_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_clock_in
  ON time_entries (user_id, clock_in_at DESC);

-- At most one open entry per user (across establishments).
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_one_open_per_user
  ON time_entries (user_id)
  WHERE clock_out_at IS NULL;

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS time_entries_tenant_select ON time_entries;
DROP POLICY IF EXISTS time_entries_tenant_write ON time_entries;
CREATE POLICY time_entries_tenant_select ON time_entries
  FOR SELECT
  USING (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  );
CREATE POLICY time_entries_tenant_write ON time_entries
  FOR ALL
  USING (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  )
  WITH CHECK (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  );

-- DOWN
DROP POLICY IF EXISTS time_entries_tenant_write ON time_entries;
DROP POLICY IF EXISTS time_entries_tenant_select ON time_entries;
DROP TABLE IF EXISTS time_entries;
