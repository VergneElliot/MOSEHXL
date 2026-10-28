-- UP
-- Operational (non-fiscal) PIN session accounting reports. Append-only snapshots for
-- generate/print from History. Not written to legal_journal / closure_bulletins.

CREATE TABLE IF NOT EXISTS pin_session_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  pin_session_id UUID NOT NULL REFERENCES staff_pin_sessions(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generated_by_account_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  generated_by_pin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pin_session_reports_session
  ON pin_session_reports (establishment_id, pin_session_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pin_session_reports_day
  ON pin_session_reports (establishment_id, generated_at DESC);

ALTER TABLE pin_session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_session_reports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pin_session_reports_tenant_select ON pin_session_reports;
DROP POLICY IF EXISTS pin_session_reports_tenant_write ON pin_session_reports;
CREATE POLICY pin_session_reports_tenant_select ON pin_session_reports
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY pin_session_reports_tenant_write ON pin_session_reports
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

-- SCHEMA_SNAPSHOT_NOT_REQUIRED

-- DOWN
DROP POLICY IF EXISTS pin_session_reports_tenant_write ON pin_session_reports;
DROP POLICY IF EXISTS pin_session_reports_tenant_select ON pin_session_reports;
DROP TABLE IF EXISTS pin_session_reports;
