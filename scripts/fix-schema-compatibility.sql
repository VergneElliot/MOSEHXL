-- Fix Schema Compatibility Issues
-- This script addresses differences between development and production schemas
-- to ensure consistent behavior across different environments

-- 1. Add WEEKLY closure type to development schema if missing
DO $$
BEGIN
    -- Check if WEEKLY is already in the constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'closure_bulletins' 
        AND tc.constraint_name = 'closure_bulletins_closure_type_check'
        AND cc.check_clause LIKE '%WEEKLY%'
    ) THEN
        -- Drop the existing constraint
        ALTER TABLE closure_bulletins DROP CONSTRAINT closure_bulletins_closure_type_check;
        
        -- Add the updated constraint with WEEKLY included
        ALTER TABLE closure_bulletins ADD CONSTRAINT closure_bulletins_closure_type_check 
        CHECK (closure_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'));
        
        RAISE NOTICE 'Added WEEKLY to closure_bulletins constraint';
    ELSE
        RAISE NOTICE 'WEEKLY already exists in closure_bulletins constraint';
    END IF;
END $$;

-- 2. Fix tips_total and change_total data types to be consistent
-- Ensure they have proper precision and NOT NULL constraints
DO $$
BEGIN
    -- Check current data type of tips_total
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'closure_bulletins' 
        AND column_name = 'tips_total' 
        AND data_type = 'numeric' 
        AND numeric_precision IS NULL
    ) THEN
        -- Convert to numeric(12,2) with NOT NULL
        ALTER TABLE closure_bulletins 
        ALTER COLUMN tips_total TYPE numeric(12,2),
        ALTER COLUMN tips_total SET NOT NULL,
        ALTER COLUMN tips_total SET DEFAULT 0;
        
        RAISE NOTICE 'Updated tips_total to numeric(12,2) NOT NULL DEFAULT 0';
    ELSE
        RAISE NOTICE 'tips_total already has proper data type';
    END IF;
    
    -- Check current data type of change_total
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'closure_bulletins' 
        AND column_name = 'change_total' 
        AND data_type = 'numeric' 
        AND numeric_precision IS NULL
    ) THEN
        -- Convert to numeric(12,2) with NOT NULL
        ALTER TABLE closure_bulletins 
        ALTER COLUMN change_total TYPE numeric(12,2),
        ALTER COLUMN change_total SET NOT NULL,
        ALTER COLUMN change_total SET DEFAULT 0;
        
        RAISE NOTICE 'Updated change_total to numeric(12,2) NOT NULL DEFAULT 0';
    ELSE
        RAISE NOTICE 'change_total already has proper data type';
    END IF;
END $$;

-- 3. Ensure tips_change_positive constraint exists and is correct
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'closure_bulletins' 
        AND constraint_name = 'tips_change_positive'
    ) THEN
        ALTER TABLE closure_bulletins DROP CONSTRAINT tips_change_positive;
    END IF;
    
    -- Add the constraint
    ALTER TABLE closure_bulletins ADD CONSTRAINT tips_change_positive 
    CHECK (tips_total >= 0 AND change_total >= 0);
    
    RAISE NOTICE 'Added/updated tips_change_positive constraint';
END $$;

-- 4. Add any missing indexes for better performance
DO $$
BEGIN
    -- Add index on closure_type and period_start if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'closure_bulletins' 
        AND indexname = 'idx_closure_type_period'
    ) THEN
        CREATE INDEX idx_closure_type_period ON closure_bulletins (closure_type, period_start);
        RAISE NOTICE 'Created index idx_closure_type_period';
    ELSE
        RAISE NOTICE 'Index idx_closure_type_period already exists';
    END IF;
    
    -- Add index on is_closed and created_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'closure_bulletins' 
        AND indexname = 'idx_closure_closed'
    ) THEN
        CREATE INDEX idx_closure_closed ON closure_bulletins (is_closed, created_at);
        RAISE NOTICE 'Created index idx_closure_closed';
    ELSE
        RAISE NOTICE 'Index idx_closure_closed already exists';
    END IF;
END $$;

-- 5. Verify the fixes
SELECT 
    'Schema Compatibility Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.check_constraints cc
            JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'closure_bulletins' 
            AND tc.constraint_name = 'closure_bulletins_closure_type_check'
            AND cc.check_clause LIKE '%WEEKLY%'
        ) THEN 'PASS' 
        ELSE 'FAIL' 
    END as weekly_type_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'closure_bulletins' 
            AND column_name = 'tips_total' 
            AND data_type = 'numeric' 
            AND numeric_precision = 12 
            AND numeric_scale = 2
            AND is_nullable = 'NO'
        ) THEN 'PASS' 
        ELSE 'FAIL' 
    END as tips_total_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'closure_bulletins' 
            AND column_name = 'change_total' 
            AND data_type = 'numeric' 
            AND numeric_precision = 12 
            AND numeric_scale = 2
            AND is_nullable = 'NO'
        ) THEN 'PASS' 
        ELSE 'FAIL' 
    END as change_total_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'closure_bulletins' 
            AND constraint_name = 'tips_change_positive'
        ) THEN 'PASS' 
        ELSE 'FAIL' 
    END as constraint_check;

-- 6. Show current closure bulletin structure
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN numeric_precision IS NOT NULL 
        THEN numeric_precision || ',' || numeric_scale 
        ELSE NULL 
    END as precision_scale,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'closure_bulletins' 
ORDER BY ordinal_position; 