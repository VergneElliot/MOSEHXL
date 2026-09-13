-- UP
-- Platform establishment create / stats expect lifecycle + tax columns that were
-- never added to the migration chain (code drifted ahead of prod schema).

ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active';

ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS tva_number VARCHAR(50);

ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS siret_number VARCHAR(20);

-- Existing live venues are already operating.
UPDATE establishments
SET status = 'active'
WHERE status IS NULL OR status = '';

COMMENT ON COLUMN establishments.status IS
  'Lifecycle: setup_required | pending_setup | setup_in_progress | active | suspended | cancelled';

-- DOWN
ALTER TABLE establishments DROP COLUMN IF EXISTS siret_number;
ALTER TABLE establishments DROP COLUMN IF EXISTS tva_number;
ALTER TABLE establishments DROP COLUMN IF EXISTS status;
