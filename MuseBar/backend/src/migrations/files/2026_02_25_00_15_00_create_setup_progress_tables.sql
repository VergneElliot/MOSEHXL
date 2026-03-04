-- UP
-- Create establishment setup progress table (tracks overall setup completion per establishment)
CREATE TABLE IF NOT EXISTS establishment_setup_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    total_steps INTEGER NOT NULL DEFAULT 0,
    completed_steps INTEGER NOT NULL DEFAULT 0,
    skipped_steps INTEGER NOT NULL DEFAULT 0,
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    estimated_time_remaining INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT valid_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'stalled'))
);

-- Ensure columns exist for DBs that had the table created by older/orphan scripts (no-op when table was just created)
ALTER TABLE establishment_setup_progress ADD COLUMN IF NOT EXISTS total_steps INTEGER NOT NULL DEFAULT 0;
ALTER TABLE establishment_setup_progress ADD COLUMN IF NOT EXISTS completed_steps INTEGER NOT NULL DEFAULT 0;
ALTER TABLE establishment_setup_progress ADD COLUMN IF NOT EXISTS skipped_steps INTEGER NOT NULL DEFAULT 0;
ALTER TABLE establishment_setup_progress ADD COLUMN IF NOT EXISTS progress_percentage INTEGER NOT NULL DEFAULT 0;
ALTER TABLE establishment_setup_progress ADD COLUMN IF NOT EXISTS estimated_time_remaining INTEGER NOT NULL DEFAULT 0;
ALTER TABLE establishment_setup_progress ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'not_started';
ALTER TABLE establishment_setup_progress ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE establishment_setup_progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create establishment setup steps table (tracks individual steps per establishment)
CREATE TABLE IF NOT EXISTS establishment_setup_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    step_type VARCHAR(50) NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_required BOOLEAN NOT NULL DEFAULT true,
    step_order INTEGER NOT NULL,
    estimated_time_minutes INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMP,
    completed_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_step_status CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    CONSTRAINT valid_step_order CHECK (step_order > 0),
    CONSTRAINT valid_estimated_time CHECK (estimated_time_minutes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_setup_progress_establishment_id ON establishment_setup_progress(establishment_id);
CREATE INDEX IF NOT EXISTS idx_setup_progress_status ON establishment_setup_progress(status);
CREATE INDEX IF NOT EXISTS idx_setup_progress_last_updated ON establishment_setup_progress(last_updated);

CREATE INDEX IF NOT EXISTS idx_setup_steps_establishment_id ON establishment_setup_steps(establishment_id);
CREATE INDEX IF NOT EXISTS idx_setup_steps_step_type ON establishment_setup_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_setup_steps_status ON establishment_setup_steps(status);
CREATE INDEX IF NOT EXISTS idx_setup_steps_step_order ON establishment_setup_steps(step_order);
CREATE INDEX IF NOT EXISTS idx_setup_steps_completed_by ON establishment_setup_steps(completed_by);

COMMENT ON TABLE establishment_setup_progress IS 'Tracks overall setup completion progress for establishments';
COMMENT ON TABLE establishment_setup_steps IS 'Tracks individual setup steps and their completion status';
COMMENT ON COLUMN establishment_setup_progress.progress_percentage IS 'Setup completion percentage (0-100)';
COMMENT ON COLUMN establishment_setup_progress.estimated_time_remaining IS 'Estimated time remaining to complete setup (in minutes)';
COMMENT ON COLUMN establishment_setup_progress.status IS 'Overall setup status: not_started, in_progress, completed, stalled';
COMMENT ON COLUMN establishment_setup_steps.step_type IS 'Type of setup step (account_creation, business_info, menu_setup, etc.)';
COMMENT ON COLUMN establishment_setup_steps.step_order IS 'Order of step in setup process';
COMMENT ON COLUMN establishment_setup_steps.estimated_time_minutes IS 'Estimated time to complete this step (in minutes)';
COMMENT ON COLUMN establishment_setup_steps.status IS 'Step completion status: pending, in_progress, completed, skipped';

-- DOWN
DROP TABLE IF EXISTS establishment_setup_steps;
DROP TABLE IF EXISTS establishment_setup_progress;
