-- Backfill establishment_id on legacy closure bulletins
-- (V1 had NULL establishment_id; V2 code expects isolation via establishment_id)
--
-- This migration is idempotent: it only updates rows where establishment_id IS NULL.

-- UP
DO $$
DECLARE
  est_id UUID;
BEGIN
  SELECT id INTO est_id FROM establishments LIMIT 1;

  IF est_id IS NULL THEN
    RAISE EXCEPTION 'No establishment found to backfill closure_bulletins.establishment_id';
  END IF;

  UPDATE closure_bulletins
  SET establishment_id = est_id
  WHERE establishment_id IS NULL;
END $$;

-- DOWN
-- No-op by design (we don't want to remove tenant isolation once it's been applied).
SELECT 1;

