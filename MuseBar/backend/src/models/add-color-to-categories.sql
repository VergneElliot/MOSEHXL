-- Migration: Add color column to categories table
DO $$ 
BEGIN 
    -- Add color column to categories if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'categories' AND column_name = 'color') THEN
        ALTER TABLE categories ADD COLUMN color VARCHAR(7) DEFAULT '#1976d2';
        UPDATE categories SET color = '#1976d2' WHERE color IS NULL;
    END IF;
END $$; 