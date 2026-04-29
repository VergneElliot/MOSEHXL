-- UP
-- P1-1: Complete A3 DB constraints for legal/tenant tables.
-- - Backfill + enforce NOT NULL on audit_trail.establishment_id, archive_exports.establishment_id, closure_bulletins.establishment_id
-- - Enforce closure uniqueness on (establishment_id, closure_type, period_start, period_end)
-- - Fail closed (no silent deletions) if unresolved NULLs or duplicate closure keys remain.

DO $$
DECLARE
  fallback_establishment_id UUID;
  unresolved_count INTEGER;
  duplicate_closure_count INTEGER;
BEGIN
  SELECT id
  INTO fallback_establishment_id
  FROM establishments
  ORDER BY created_at ASC NULLS LAST, id ASC
  LIMIT 1;

  IF fallback_establishment_id IS NULL THEN
    RAISE EXCEPTION 'A3 constraints hardening requires at least one establishment to backfill NULL establishment_id rows';
  END IF;

  -- ---------------------------------------------------------------------------
  -- audit_trail establishment backfill
  -- ---------------------------------------------------------------------------
  UPDATE audit_trail a
  SET establishment_id = u.establishment_id
  FROM users u
  WHERE a.establishment_id IS NULL
    AND a.user_id IS NOT NULL
    AND a.user_id ~ '^[0-9]+$'
    AND u.id = (a.user_id::integer)
    AND u.establishment_id IS NOT NULL;

  UPDATE audit_trail
  SET establishment_id = fallback_establishment_id
  WHERE establishment_id IS NULL;

  SELECT COUNT(*) INTO unresolved_count FROM audit_trail WHERE establishment_id IS NULL;
  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'A3 constraints hardening: unresolved audit_trail.establishment_id NULL rows (%)', unresolved_count;
  END IF;

  -- ---------------------------------------------------------------------------
  -- archive_exports establishment backfill
  -- ---------------------------------------------------------------------------
  UPDATE archive_exports e
  SET establishment_id = u.establishment_id
  FROM users u
  WHERE e.establishment_id IS NULL
    AND e.created_by IS NOT NULL
    AND e.created_by ~ '^[0-9]+$'
    AND u.id = (e.created_by::integer)
    AND u.establishment_id IS NOT NULL;

  UPDATE archive_exports
  SET establishment_id = fallback_establishment_id
  WHERE establishment_id IS NULL;

  SELECT COUNT(*) INTO unresolved_count FROM archive_exports WHERE establishment_id IS NULL;
  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'A3 constraints hardening: unresolved archive_exports.establishment_id NULL rows (%)', unresolved_count;
  END IF;

  -- ---------------------------------------------------------------------------
  -- closure_bulletins establishment backfill and duplicate guard
  -- ---------------------------------------------------------------------------
  UPDATE closure_bulletins
  SET establishment_id = fallback_establishment_id
  WHERE establishment_id IS NULL;

  SELECT COUNT(*) INTO unresolved_count FROM closure_bulletins WHERE establishment_id IS NULL;
  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'A3 constraints hardening: unresolved closure_bulletins.establishment_id NULL rows (%)', unresolved_count;
  END IF;

  SELECT COUNT(*)
  INTO duplicate_closure_count
  FROM (
    SELECT establishment_id, closure_type, period_start, period_end
    FROM closure_bulletins
    GROUP BY establishment_id, closure_type, period_start, period_end
    HAVING COUNT(*) > 1
  ) dup;

  IF duplicate_closure_count > 0 THEN
    RAISE EXCEPTION 'A3 constraints hardening: duplicate closure key groups found (%). Resolve duplicates before enforcing uniqueness.',
      duplicate_closure_count;
  END IF;
END $$;

-- Align FK behavior with NOT NULL invariants.
ALTER TABLE audit_trail DROP CONSTRAINT IF EXISTS audit_trail_establishment_id_fkey;
ALTER TABLE archive_exports DROP CONSTRAINT IF EXISTS archive_exports_establishment_id_fkey;
ALTER TABLE closure_bulletins DROP CONSTRAINT IF EXISTS closure_bulletins_establishment_id_fkey;

ALTER TABLE audit_trail
  ADD CONSTRAINT audit_trail_establishment_id_fkey
  FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE RESTRICT;

ALTER TABLE archive_exports
  ADD CONSTRAINT archive_exports_establishment_id_fkey
  FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE RESTRICT;

ALTER TABLE closure_bulletins
  ADD CONSTRAINT closure_bulletins_establishment_id_fkey
  FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE RESTRICT;

ALTER TABLE audit_trail
  ALTER COLUMN establishment_id SET NOT NULL;

ALTER TABLE archive_exports
  ALTER COLUMN establishment_id SET NOT NULL;

ALTER TABLE closure_bulletins
  ALTER COLUMN establishment_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_closure_bulletins_establishment_type_period
  ON closure_bulletins(establishment_id, closure_type, period_start, period_end);

-- DOWN
DROP INDEX IF EXISTS ux_closure_bulletins_establishment_type_period;

ALTER TABLE audit_trail
  ALTER COLUMN establishment_id DROP NOT NULL;

ALTER TABLE archive_exports
  ALTER COLUMN establishment_id DROP NOT NULL;

ALTER TABLE closure_bulletins
  ALTER COLUMN establishment_id DROP NOT NULL;

ALTER TABLE audit_trail DROP CONSTRAINT IF EXISTS audit_trail_establishment_id_fkey;
ALTER TABLE archive_exports DROP CONSTRAINT IF EXISTS archive_exports_establishment_id_fkey;
ALTER TABLE closure_bulletins DROP CONSTRAINT IF EXISTS closure_bulletins_establishment_id_fkey;

ALTER TABLE audit_trail
  ADD CONSTRAINT audit_trail_establishment_id_fkey
  FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL;

ALTER TABLE archive_exports
  ADD CONSTRAINT archive_exports_establishment_id_fkey
  FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL;

ALTER TABLE closure_bulletins
  ADD CONSTRAINT closure_bulletins_establishment_id_fkey
  FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE;
