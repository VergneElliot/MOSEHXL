-- ============================================================
-- Migration: Add enhanced fields to establishments table
-- ============================================================
-- Purpose: Support enhanced establishment creation with business_type,
-- timezone, and language. Replaces orphan add-establishment-fields.sql
-- so the migration CLI is the single source of truth (audit #44).
-- ============================================================

-- UP

ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Europe/Paris',
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_business_type') THEN
    ALTER TABLE establishments DROP CONSTRAINT valid_business_type;
  END IF;
END $$;
ALTER TABLE establishments
  ADD CONSTRAINT valid_business_type
  CHECK (business_type IN ('restaurant', 'bar', 'cafe', 'retail', 'other'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_language') THEN
    ALTER TABLE establishments DROP CONSTRAINT valid_language;
  END IF;
END $$;
ALTER TABLE establishments
  ADD CONSTRAINT valid_language
  CHECK (language IN ('fr', 'en', 'es', 'de', 'it'));

CREATE INDEX IF NOT EXISTS idx_establishments_business_type ON establishments(business_type);
CREATE INDEX IF NOT EXISTS idx_establishments_timezone ON establishments(timezone);
CREATE INDEX IF NOT EXISTS idx_establishments_language ON establishments(language);

UPDATE establishments
SET
  business_type = COALESCE(business_type, 'other'),
  timezone = COALESCE(timezone, 'Europe/Paris'),
  language = COALESCE(language, 'fr')
WHERE business_type IS NULL OR timezone IS NULL OR language IS NULL;

COMMENT ON COLUMN establishments.business_type IS 'Type of business (restaurant, bar, cafe, retail, other)';
COMMENT ON COLUMN establishments.timezone IS 'Timezone for the establishment (e.g., Europe/Paris)';
COMMENT ON COLUMN establishments.language IS 'Primary language for the establishment (fr, en, es, de, it)';

-- DOWN

ALTER TABLE establishments DROP CONSTRAINT IF EXISTS valid_business_type;
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS valid_language;
DROP INDEX IF EXISTS idx_establishments_business_type;
DROP INDEX IF EXISTS idx_establishments_timezone;
DROP INDEX IF EXISTS idx_establishments_language;
ALTER TABLE establishments
  DROP COLUMN IF EXISTS business_type,
  DROP COLUMN IF EXISTS timezone,
  DROP COLUMN IF EXISTS language;
