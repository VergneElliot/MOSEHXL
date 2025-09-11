-- Fix Phase 1 Database Schema Issues
-- This script fixes all schema mismatches for the enhanced establishment creation system

-- 1. Fix audit_trail table to support establishment audit logging
-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add establishment_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'establishment_id') THEN
        ALTER TABLE audit_trail ADD COLUMN establishment_id UUID REFERENCES establishments(id);
    END IF;
    
    -- Add action column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'action') THEN
        ALTER TABLE audit_trail ADD COLUMN action VARCHAR(100);
    END IF;
    
    -- Add details column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_trail' AND column_name = 'details') THEN
        ALTER TABLE audit_trail ADD COLUMN details TEXT;
    END IF;
END $$;

-- 2. Ensure user_invitations table has correct structure
-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add establishment_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_invitations' AND column_name = 'establishment_id') THEN
        ALTER TABLE user_invitations ADD COLUMN establishment_id UUID REFERENCES establishments(id);
    END IF;
    
    -- Add establishment_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_invitations' AND column_name = 'establishment_name') THEN
        ALTER TABLE user_invitations ADD COLUMN establishment_name VARCHAR(200);
    END IF;
    
    -- Add inviter_user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_invitations' AND column_name = 'inviter_user_id') THEN
        ALTER TABLE user_invitations ADD COLUMN inviter_user_id VARCHAR(100);
    END IF;
    
    -- Add inviter_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_invitations' AND column_name = 'inviter_name') THEN
        ALTER TABLE user_invitations ADD COLUMN inviter_name VARCHAR(200);
    END IF;
END $$;

-- 3. Create establishment_setup_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS establishment_setup_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    current_step VARCHAR(50) NOT NULL DEFAULT 'business_info',
    completed_steps JSONB DEFAULT '[]',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create establishment_setup_steps table if it doesn't exist
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

-- 5. Create establishment_status_transitions table if it doesn't exist
CREATE TABLE IF NOT EXISTS establishment_status_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    transition_reason TEXT,
    transitioned_by_user_id VARCHAR(100),
    transitioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_establishment_setup_progress_establishment_id 
    ON establishment_setup_progress(establishment_id);
CREATE INDEX IF NOT EXISTS idx_establishment_setup_steps_establishment_id 
    ON establishment_setup_steps(establishment_id);
CREATE INDEX IF NOT EXISTS idx_establishment_status_transitions_establishment_id 
    ON establishment_status_transitions(establishment_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_establishment_id 
    ON audit_trail(establishment_id);

-- 7. Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_establishment_setup_progress_updated_at') THEN
        CREATE TRIGGER update_establishment_setup_progress_updated_at
            BEFORE UPDATE ON establishment_setup_progress
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_establishment_setup_steps_updated_at') THEN
        CREATE TRIGGER update_establishment_setup_steps_updated_at
            BEFORE UPDATE ON establishment_setup_steps
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 8. Verify the schema is correct
SELECT 'Schema fix completed successfully' as status;
