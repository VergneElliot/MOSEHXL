-- Fix audit_trail user_id column type in existing establishment schemas
-- This script fixes the UUID to integer conversion error

DO $$
DECLARE
    schema_record RECORD;
    current_schema_name TEXT;
BEGIN
    -- Loop through all establishment schemas
    FOR schema_record IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'establishment_%'
    LOOP
        current_schema_name := schema_record.schema_name;
        
        -- Check if audit_trail table exists and has user_id as INTEGER
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = current_schema_name 
            AND table_name = 'audit_trail' 
            AND column_name = 'user_id' 
            AND data_type = 'integer'
        ) THEN
            -- Drop the index first if it exists
            EXECUTE format('DROP INDEX IF EXISTS %I.idx_%s_audit_tr', current_schema_name, replace(current_schema_name, '-', '_'));
            
            -- Alter the column type from INTEGER to VARCHAR(100)
            EXECUTE format('ALTER TABLE %I.audit_trail ALTER COLUMN user_id TYPE VARCHAR(100)', current_schema_name);
            
            -- Recreate the index
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_audit_trail_user_id ON %I.audit_trail (user_id)', 
                          replace(current_schema_name, '-', '_'), current_schema_name);
            
            RAISE NOTICE 'Fixed user_id column type in schema: %', current_schema_name;
        END IF;
    END LOOP;
END $$;

-- Also fix the main audit_trail table if needed
DO $$
BEGIN
    -- Check if main audit_trail has user_id as INTEGER
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_trail' 
        AND column_name = 'user_id' 
        AND data_type = 'integer'
    ) THEN
        -- Drop the index first
        DROP INDEX IF EXISTS idx_audit_user_time;
        
        -- Alter the column type
        ALTER TABLE public.audit_trail ALTER COLUMN user_id TYPE VARCHAR(100);
        
        -- Recreate the index
        CREATE INDEX IF NOT EXISTS idx_audit_user_time ON public.audit_trail (user_id, timestamp);
        
        RAISE NOTICE 'Fixed user_id column type in main audit_trail table';
    END IF;
END $$;

-- Verify the fix
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'audit_trail' 
AND column_name = 'user_id'
ORDER BY table_schema;
