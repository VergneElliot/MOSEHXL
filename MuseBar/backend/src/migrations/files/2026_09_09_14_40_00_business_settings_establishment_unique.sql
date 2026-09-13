-- UP
-- Settings → Établissement uses ON CONFLICT (establishment_id) on business_settings,
-- but prod never had a unique constraint on that column (schema drift).

-- Keep one row per establishment (prefer newest updated_at).
DELETE FROM business_settings a
USING business_settings b
WHERE a.establishment_id IS NOT NULL
  AND a.establishment_id = b.establishment_id
  AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS business_settings_establishment_id_uidx
  ON business_settings (establishment_id)
  WHERE establishment_id IS NOT NULL;

-- DOWN
DROP INDEX IF EXISTS business_settings_establishment_id_uidx;
