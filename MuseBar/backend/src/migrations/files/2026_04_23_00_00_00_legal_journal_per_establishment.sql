-- UP
-- A3: Scope legal journal, audit_trail, and archive_exports by establishment (repo audit 2026-04-21 part 3).

-- =============================================================================
-- legal_journal
-- =============================================================================
-- Briefly remove immutability trigger so this migration can backfill and alter schema.
DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON legal_journal;

ALTER TABLE legal_journal
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE RESTRICT;

UPDATE legal_journal lj
SET establishment_id = o.establishment_id
FROM orders o
WHERE lj.order_id IS NOT NULL
  AND lj.order_id = o.id
  AND (lj.establishment_id IS NULL);

UPDATE legal_journal
SET establishment_id = sub.id
FROM (SELECT id FROM establishments ORDER BY created_at ASC NULLS LAST, id ASC LIMIT 1) sub
WHERE establishment_id IS NULL
  AND EXISTS (SELECT 1 FROM establishments);

DELETE FROM legal_journal WHERE establishment_id IS NULL;

ALTER TABLE legal_journal DROP CONSTRAINT IF EXISTS legal_journal_sequence_number_key;

ALTER TABLE legal_journal
  ADD CONSTRAINT legal_journal_establishment_sequence_key UNIQUE (establishment_id, sequence_number);

ALTER TABLE legal_journal
  ALTER COLUMN establishment_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legal_journal_establishment_id ON legal_journal(establishment_id);

CREATE TRIGGER trigger_prevent_legal_journal_modification
  BEFORE UPDATE OR DELETE ON legal_journal
  FOR EACH ROW
  EXECUTE FUNCTION prevent_legal_journal_modification();

-- =============================================================================
-- audit_trail
-- =============================================================================
ALTER TABLE audit_trail
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE SET NULL;

UPDATE audit_trail a
SET establishment_id = u.establishment_id
FROM users u
WHERE a.user_id IS NOT NULL
  AND a.user_id ~ '^[0-9]+$'
  AND u.id = (a.user_id::integer)
  AND a.establishment_id IS NULL;

UPDATE audit_trail a
SET establishment_id = sub.id
FROM (SELECT id FROM establishments ORDER BY id ASC LIMIT 1) sub
WHERE a.establishment_id IS NULL
  AND EXISTS (SELECT 1 FROM establishments);

CREATE INDEX IF NOT EXISTS idx_audit_trail_establishment_id ON audit_trail(establishment_id);

-- =============================================================================
-- archive_exports
-- =============================================================================
ALTER TABLE archive_exports
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE SET NULL;

UPDATE archive_exports e
SET establishment_id = u.establishment_id
FROM users u
WHERE e.created_by IS NOT NULL
  AND e.created_by ~ '^[0-9]+$'
  AND u.id = (e.created_by::integer)
  AND e.establishment_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_archive_exports_establishment_id ON archive_exports(establishment_id);

-- DOWN
-- Best-effort rollback; data may be irreversibly merged per-tenant.
DROP INDEX IF EXISTS idx_archive_exports_establishment_id;
DROP INDEX IF EXISTS idx_audit_trail_establishment_id;
DROP INDEX IF EXISTS idx_legal_journal_establishment_id;
ALTER TABLE archive_exports DROP COLUMN IF EXISTS establishment_id;
ALTER TABLE audit_trail DROP COLUMN IF EXISTS establishment_id;
DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON legal_journal;
ALTER TABLE legal_journal DROP CONSTRAINT IF EXISTS legal_journal_establishment_sequence_key;
ALTER TABLE legal_journal DROP COLUMN IF EXISTS establishment_id;
ALTER TABLE legal_journal ADD CONSTRAINT legal_journal_sequence_number_key UNIQUE (sequence_number);
CREATE TRIGGER trigger_prevent_legal_journal_modification
  BEFORE UPDATE OR DELETE ON legal_journal
  FOR EACH ROW
  EXECUTE FUNCTION prevent_legal_journal_modification();
SELECT 1;
