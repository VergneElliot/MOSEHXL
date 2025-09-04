-- Migration: Add enhanced fields to establishments table
-- Date: 2025-09-04
-- Purpose: Support enhanced establishment creation with business type, timezone, and language

-- Add new fields to establishments table
ALTER TABLE establishments 
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'other',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Europe/Paris',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr';

-- Add constraint for business_type (drop first if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_business_type') THEN
        ALTER TABLE establishments DROP CONSTRAINT valid_business_type;
    END IF;
END $$;
ALTER TABLE establishments 
ADD CONSTRAINT valid_business_type 
CHECK (business_type IN ('restaurant', 'bar', 'cafe', 'retail', 'other'));

-- Add constraint for language (drop first if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_language') THEN
        ALTER TABLE establishments DROP CONSTRAINT valid_language;
    END IF;
END $$;
ALTER TABLE establishments 
ADD CONSTRAINT valid_language 
CHECK (language IN ('fr', 'en', 'es', 'de', 'it'));

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_establishments_business_type ON establishments(business_type);
CREATE INDEX IF NOT EXISTS idx_establishments_timezone ON establishments(timezone);
CREATE INDEX IF NOT EXISTS idx_establishments_language ON establishments(language);

-- Update existing establishments with default values
UPDATE establishments 
SET 
  business_type = COALESCE(business_type, 'other'),
  timezone = COALESCE(timezone, 'Europe/Paris'),
  language = COALESCE(language, 'fr')
WHERE business_type IS NULL OR timezone IS NULL OR language IS NULL;

-- Add comment to document the new fields
COMMENT ON COLUMN establishments.business_type IS 'Type of business (restaurant, bar, cafe, retail, other)';
COMMENT ON COLUMN establishments.timezone IS 'Timezone for the establishment (e.g., Europe/Paris)';
COMMENT ON COLUMN establishments.language IS 'Primary language for the establishment (fr, en, es, de, it)';
