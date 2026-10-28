-- UP
-- Establishment-scoped in-app notifications (header bell). Per-account read state;
-- emission dedupe for cron/idempotent producers.

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  audience VARCHAR(32) NOT NULL DEFAULT 'permission',
  permission_key VARCHAR(64),
  target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_est_created
  ON notifications (establishment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS notification_emissions (
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  notification_id BIGINT REFERENCES notifications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (establishment_id, dedupe_key)
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_tenant_select ON notifications;
DROP POLICY IF EXISTS notifications_tenant_write ON notifications;
CREATE POLICY notifications_tenant_select ON notifications
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY notifications_tenant_write ON notifications
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_reads_tenant ON notification_reads;
CREATE POLICY notification_reads_tenant ON notification_reads
  FOR ALL
  USING (
    app_rls_bypass() OR EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id
        AND app_current_establishment_id() IS NOT NULL
        AND n.establishment_id = app_current_establishment_id()
    )
  )
  WITH CHECK (
    app_rls_bypass() OR EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_id
        AND app_current_establishment_id() IS NOT NULL
        AND n.establishment_id = app_current_establishment_id()
    )
  );

ALTER TABLE notification_emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_emissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_emissions_tenant ON notification_emissions;
CREATE POLICY notification_emissions_tenant ON notification_emissions
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

-- SCHEMA_SNAPSHOT_NOT_REQUIRED

-- DOWN
DROP POLICY IF EXISTS notification_emissions_tenant ON notification_emissions;
DROP TABLE IF EXISTS notification_emissions;
DROP POLICY IF EXISTS notification_reads_tenant ON notification_reads;
DROP TABLE IF EXISTS notification_reads;
DROP POLICY IF EXISTS notifications_tenant_write ON notifications;
DROP POLICY IF EXISTS notifications_tenant_select ON notifications;
DROP TABLE IF EXISTS notifications;
