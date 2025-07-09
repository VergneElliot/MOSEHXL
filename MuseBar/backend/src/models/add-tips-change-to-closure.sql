-- Migration: Add tips_total and change_total columns to closure_bulletins table
-- This supports the new tip and change functionality in the closure bulletin

-- Add tips_total column
ALTER TABLE closure_bulletins 
ADD COLUMN IF NOT EXISTS tips_total DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Add change_total column  
ALTER TABLE closure_bulletins 
ADD COLUMN IF NOT EXISTS change_total DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Add constraint to ensure positive values (only if it doesn't exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'tips_change_positive' 
                   AND table_name = 'closure_bulletins') THEN
        ALTER TABLE closure_bulletins 
        ADD CONSTRAINT tips_change_positive 
        CHECK (tips_total >= 0 AND change_total >= 0);
    END IF;
END $$;

-- Update existing records to have 0 values for the new columns
UPDATE closure_bulletins 
SET tips_total = 0, change_total = 0 
WHERE tips_total IS NULL OR change_total IS NULL; 