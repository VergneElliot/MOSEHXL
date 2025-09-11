-- Final fix for establishment creation issues
-- This script addresses all identified problems

-- 1. Fix establishment_setup_progress table structure to match what the code expects
ALTER TABLE establishment_setup_progress 
ADD COLUMN IF NOT EXISTS current_step VARCHAR(50) DEFAULT 'business_info';

ALTER TABLE establishment_setup_progress 
ADD COLUMN IF NOT EXISTS completed_steps JSONB DEFAULT '[]';

ALTER TABLE establishment_setup_progress 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE establishment_setup_progress 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE establishment_setup_progress 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Drop the columns that aren't used by the code
ALTER TABLE establishment_setup_progress 
DROP COLUMN IF EXISTS total_steps;

ALTER TABLE establishment_setup_progress 
DROP COLUMN IF EXISTS skipped_steps;

ALTER TABLE establishment_setup_progress 
DROP COLUMN IF EXISTS estimated_time_remaining;

ALTER TABLE establishment_setup_progress 
DROP COLUMN IF EXISTS last_updated;

-- 3. Update the status constraint if needed
ALTER TABLE establishment_setup_progress DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE establishment_setup_progress 
ADD CONSTRAINT valid_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'stalled'));

-- 4. Create a trigger for updated_at if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_establishment_setup_progress_updated_at') THEN
        CREATE TRIGGER update_establishment_setup_progress_updated_at
            BEFORE UPDATE ON establishment_setup_progress
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 5. Create establishment_setup_steps table with correct structure
CREATE TABLE IF NOT EXISTS establishment_setup_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL,
    step_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (step_status IN ('pending', 'in_progress', 'completed', 'failed')),
    step_data JSONB DEFAULT '{}',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_establishment_setup_steps_establishment_id 
    ON establishment_setup_steps(establishment_id);

-- 7. Verify the fix
SELECT 'Schema fixes applied successfully' as status;

-- 8. Show the updated table structure
\d establishment_setup_progress
