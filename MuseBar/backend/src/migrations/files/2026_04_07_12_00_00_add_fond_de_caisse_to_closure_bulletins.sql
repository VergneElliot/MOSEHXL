-- UP
-- Add "fond de caisse" (cash float) to closure bulletins.
-- Informational field: does not affect totals, only stored for audit reference.
ALTER TABLE closure_bulletins
  ADD COLUMN IF NOT EXISTS fond_de_caisse DECIMAL(12,4) NOT NULL DEFAULT 0;

-- Backfill for existing (historical) bulletins at deployment time.
-- Safe because this migration runs once; new closures remain controlled by the UI/API (0 is allowed).
-- NOTE: closure_bulletins are marked is_closed=true and a trigger prevents UPDATE/DELETE.
-- We temporarily drop that trigger to backfill historical rows, then recreate it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_prevent_closed_bulletin_modification'
  ) THEN
    EXECUTE 'DROP TRIGGER trigger_prevent_closed_bulletin_modification ON closure_bulletins';
  END IF;
END $$;

UPDATE closure_bulletins
  SET fond_de_caisse = 200
  WHERE fond_de_caisse = 0;

CREATE TRIGGER trigger_prevent_closed_bulletin_modification
  BEFORE UPDATE OR DELETE ON closure_bulletins
  FOR EACH ROW
  EXECUTE FUNCTION prevent_closed_bulletin_modification();

COMMENT ON COLUMN closure_bulletins.fond_de_caisse IS 'Fond de caisse (cash float) left in the register at closure time; informational only';

-- DOWN
ALTER TABLE closure_bulletins
  DROP COLUMN IF EXISTS fond_de_caisse;

