-- UP
-- Settings → Établissement uses ON CONFLICT (establishment_id) on business_settings.
-- A partial unique index is not enough for bare ON CONFLICT (establishment_id).

DELETE FROM business_settings a
USING business_settings b
WHERE a.establishment_id IS NOT NULL
  AND a.establishment_id = b.establishment_id
  AND a.id < b.id;

DELETE FROM business_settings WHERE establishment_id IS NULL;

DROP INDEX IF EXISTS business_settings_establishment_id_uidx;

ALTER TABLE business_settings
  ALTER COLUMN establishment_id SET NOT NULL;

ALTER TABLE business_settings
  DROP CONSTRAINT IF EXISTS business_settings_establishment_id_key;

ALTER TABLE business_settings
  ADD CONSTRAINT business_settings_establishment_id_key UNIQUE (establishment_id);

-- DOWN
ALTER TABLE business_settings DROP CONSTRAINT IF EXISTS business_settings_establishment_id_key;
ALTER TABLE business_settings ALTER COLUMN establishment_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS business_settings_establishment_id_uidx
  ON business_settings (establishment_id)
  WHERE establishment_id IS NOT NULL;
