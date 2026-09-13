-- UP
-- Prefer Paramètres contact email over legacy establishments.email (e.g. contact@musebar.fr).
UPDATE establishments e
SET email = NULLIF(TRIM(bs.email), ''),
    updated_at = CURRENT_TIMESTAMP
FROM business_settings bs
WHERE bs.establishment_id = e.id
  AND NULLIF(TRIM(bs.email), '') IS NOT NULL
  AND e.email IS DISTINCT FROM NULLIF(TRIM(bs.email), '');

-- SCHEMA_SNAPSHOT_NOT_REQUIRED

-- DOWN
-- Irreversible data sync; no-op.
SELECT 1;
