-- UP
-- Durable queue for the first-party MuseBar Print Bridge.

CREATE TABLE IF NOT EXISTS printing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  document_type VARCHAR(64) NOT NULL,
  payload_format VARCHAR(32) NOT NULL,
  payload_base64 TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at TIMESTAMPTZ,
  printed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

ALTER TABLE printing_jobs
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(64),
  ADD COLUMN IF NOT EXISTS payload_format VARCHAR(32),
  ADD COLUMN IF NOT EXISTS payload_base64 TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE printing_jobs SET status = 'pending' WHERE status IS NULL;
UPDATE printing_jobs SET attempt_count = 0 WHERE attempt_count IS NULL;
UPDATE printing_jobs SET metadata = '{}'::jsonb WHERE metadata IS NULL;
UPDATE printing_jobs SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

ALTER TABLE printing_jobs
  ALTER COLUMN establishment_id SET NOT NULL,
  ALTER COLUMN document_type SET NOT NULL,
  ALTER COLUMN payload_format SET NOT NULL,
  ALTER COLUMN payload_base64 SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN attempt_count SET NOT NULL,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'printing_jobs_status_check'
      AND conrelid = 'printing_jobs'::regclass
  ) THEN
    ALTER TABLE printing_jobs
      ADD CONSTRAINT printing_jobs_status_check
      CHECK (status IN ('pending', 'claimed', 'printed', 'failed', 'expired'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'printing_jobs_payload_format_check'
      AND conrelid = 'printing_jobs'::regclass
  ) THEN
    ALTER TABLE printing_jobs
      ADD CONSTRAINT printing_jobs_payload_format_check
      CHECK (payload_format IN ('escpos'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'printing_jobs_attempt_count_check'
      AND conrelid = 'printing_jobs'::regclass
  ) THEN
    ALTER TABLE printing_jobs
      ADD CONSTRAINT printing_jobs_attempt_count_check
      CHECK (attempt_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_printing_jobs_establishment_status_created
  ON printing_jobs(establishment_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_printing_jobs_claimed_at
  ON printing_jobs(claimed_at)
  WHERE status = 'claimed';
CREATE INDEX IF NOT EXISTS idx_printing_jobs_expires_at
  ON printing_jobs(expires_at)
  WHERE status IN ('pending', 'claimed');

ALTER TABLE printing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE printing_jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS printing_jobs_tenant_select ON printing_jobs;
DROP POLICY IF EXISTS printing_jobs_tenant_write ON printing_jobs;
CREATE POLICY printing_jobs_tenant_select ON printing_jobs
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY printing_jobs_tenant_write ON printing_jobs
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

-- DOWN
DROP POLICY IF EXISTS printing_jobs_tenant_write ON printing_jobs;
DROP POLICY IF EXISTS printing_jobs_tenant_select ON printing_jobs;
ALTER TABLE printing_jobs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE printing_jobs DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_printing_jobs_expires_at;
DROP INDEX IF EXISTS idx_printing_jobs_claimed_at;
DROP INDEX IF EXISTS idx_printing_jobs_establishment_status_created;

SELECT 1;
