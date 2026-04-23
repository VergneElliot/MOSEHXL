-- UP
-- B3: bring printing tables into migration chain and align with printing repos.

CREATE TABLE IF NOT EXISTS printing_configurations (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  provider VARCHAR(64) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE printing_configurations
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS provider VARCHAR(64),
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE printing_configurations
SET config = '{}'::jsonb
WHERE config IS NULL;

UPDATE printing_configurations
SET is_active = TRUE
WHERE is_active IS NULL;

ALTER TABLE printing_configurations
  ALTER COLUMN establishment_id SET NOT NULL,
  ALTER COLUMN provider SET NOT NULL,
  ALTER COLUMN config SET NOT NULL,
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_print_cfg_establishment
  ON printing_configurations(establishment_id);
CREATE INDEX IF NOT EXISTS idx_print_cfg_establishment_active
  ON printing_configurations(establishment_id, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS printing_history (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  print_type VARCHAR(64) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE printing_history
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS print_type VARCHAR(64),
  ADD COLUMN IF NOT EXISTS provider VARCHAR(64),
  ADD COLUMN IF NOT EXISTS status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE printing_history
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

ALTER TABLE printing_history
  ALTER COLUMN establishment_id SET NOT NULL,
  ALTER COLUMN print_type SET NOT NULL,
  ALTER COLUMN provider SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_print_hist_establishment_created
  ON printing_history(establishment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_hist_establishment_type
  ON printing_history(establishment_id, print_type);

-- Apply tenant RLS to printing tables created after B1 RLS migration.
ALTER TABLE printing_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE printing_configurations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS printing_configurations_tenant_select ON printing_configurations;
DROP POLICY IF EXISTS printing_configurations_tenant_write ON printing_configurations;
CREATE POLICY printing_configurations_tenant_select ON printing_configurations
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY printing_configurations_tenant_write ON printing_configurations
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE printing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE printing_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS printing_history_tenant_select ON printing_history;
DROP POLICY IF EXISTS printing_history_tenant_write ON printing_history;
CREATE POLICY printing_history_tenant_select ON printing_history
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY printing_history_tenant_write ON printing_history
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

-- DOWN
-- Keep tables (they may hold legal/operational history); remove only indexes and RLS policies.
DROP POLICY IF EXISTS printing_history_tenant_write ON printing_history;
DROP POLICY IF EXISTS printing_history_tenant_select ON printing_history;
ALTER TABLE printing_history NO FORCE ROW LEVEL SECURITY;
ALTER TABLE printing_history DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS printing_configurations_tenant_write ON printing_configurations;
DROP POLICY IF EXISTS printing_configurations_tenant_select ON printing_configurations;
ALTER TABLE printing_configurations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE printing_configurations DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_print_hist_establishment_type;
DROP INDEX IF EXISTS idx_print_hist_establishment_created;
DROP INDEX IF EXISTS idx_print_cfg_establishment_active;
DROP INDEX IF EXISTS idx_print_cfg_establishment;

SELECT 1;

