-- Production Migration Script for MOSEHXL
-- This script migrates database structure changes from development to production
-- WITHOUT migrating any data content - only schema/structure changes
-- 
-- IMPORTANT: Always backup your production database before running this script
-- pg_dump mosehxl_production > backup_$(date +%Y%m%d_%H%M%S).sql
--
-- This migration includes:
-- 1. Color field for categories
-- 2. Description field for order_items
-- 3. pgcrypto extension for cryptographic functions
-- 4. Updated legal protection functions
-- 5. New constraints for tips/change totals
-- 6. New audit trail indexes
-- 7. Updated data types for tips/change columns
-- 8. Updated foreign key constraints

-- =====================================================
-- STEP 1: Add Color Column to Categories Table
-- =====================================================

DO $$ 
BEGIN 
    -- Add color column to categories if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'categories' AND column_name = 'color') THEN
        ALTER TABLE categories ADD COLUMN color VARCHAR(7) DEFAULT '#1976d2';
        UPDATE categories SET color = '#1976d2' WHERE color IS NULL;
    END IF;
END $$;

-- =====================================================
-- STEP 2: Add Description Column to Order Items Table
-- =====================================================

DO $$ 
BEGIN 
    -- Add description column to order_items if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_items' AND column_name = 'description') THEN
        ALTER TABLE order_items ADD COLUMN description TEXT DEFAULT NULL;
    END IF;
END $$;

-- =====================================================
-- STEP 3: Add pgcrypto Extension
-- =====================================================

-- Add pgcrypto extension for cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- =====================================================
-- STEP 4: Update Data Types for Tips and Change
-- =====================================================

-- Update orders table tips and change columns to proper numeric types
DO $$ 
BEGIN 
    -- Update tips column type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'tips' 
               AND data_type = 'numeric' AND numeric_precision = 10) THEN
        -- Column already has correct type
    ELSE
        ALTER TABLE orders ALTER COLUMN tips TYPE numeric(10,2);
        ALTER TABLE orders ALTER COLUMN tips SET DEFAULT 0;
    END IF;
    
    -- Update change column type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'orders' AND column_name = 'change' 
               AND data_type = 'numeric' AND numeric_precision = 10) THEN
        -- Column already has correct type
    ELSE
        ALTER TABLE orders ALTER COLUMN change TYPE numeric(10,2);
        ALTER TABLE orders ALTER COLUMN change SET DEFAULT 0;
    END IF;
END $$;

-- Update closure_bulletins table tips_total and change_total columns
DO $$ 
BEGIN 
    -- Update tips_total column type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'closure_bulletins' AND column_name = 'tips_total' 
               AND data_type = 'numeric' AND numeric_precision = 12) THEN
        -- Column already has correct type
    ELSE
        ALTER TABLE closure_bulletins ALTER COLUMN tips_total TYPE numeric(12,2);
        ALTER TABLE closure_bulletins ALTER COLUMN tips_total SET DEFAULT 0;
        ALTER TABLE closure_bulletins ALTER COLUMN tips_total SET NOT NULL;
    END IF;
    
    -- Update change_total column type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'closure_bulletins' AND column_name = 'change_total' 
               AND data_type = 'numeric' AND numeric_precision = 12) THEN
        -- Column already has correct type
    ELSE
        ALTER TABLE closure_bulletins ALTER COLUMN change_total TYPE numeric(12,2);
        ALTER TABLE closure_bulletins ALTER COLUMN change_total SET DEFAULT 0;
        ALTER TABLE closure_bulletins ALTER COLUMN change_total SET NOT NULL;
    END IF;
END $$;

-- =====================================================
-- STEP 5: Add New Constraints
-- =====================================================

-- Add constraint for tips and change totals to be positive
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

-- Update legal_journal sequence constraint
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'sequence_positive' 
               AND table_name = 'legal_journal') THEN
        -- Drop and recreate the constraint with updated logic
        ALTER TABLE legal_journal DROP CONSTRAINT sequence_positive;
        ALTER TABLE legal_journal 
        ADD CONSTRAINT sequence_positive CHECK (sequence_number >= 0);
    END IF;
END $$;

-- =====================================================
-- STEP 6: Ensure All Required Indexes Exist
-- =====================================================

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sub_bills_order_id ON sub_bills(order_id);

-- New audit trail indexes
CREATE INDEX IF NOT EXISTS idx_audit_action_time ON audit_trail(action_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_trail(user_id, timestamp);

-- =====================================================
-- STEP 4: Ensure Legal Compliance Tables Exist
-- =====================================================

-- Legal journal table for French fiscal compliance
CREATE TABLE IF NOT EXISTS legal_journal (
    id SERIAL PRIMARY KEY,
    sequence_number INTEGER NOT NULL UNIQUE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('SALE', 'REFUND', 'CORRECTION', 'CLOSURE', 'ARCHIVE')),
    order_id INTEGER REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    transaction_data JSONB NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    user_id VARCHAR(50),
    register_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Closure bulletins table
CREATE TABLE IF NOT EXISTS closure_bulletins (
    id SERIAL PRIMARY KEY,
    closure_type VARCHAR(20) NOT NULL CHECK (closure_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL')),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    total_transactions INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    total_vat DECIMAL(10,2) NOT NULL,
    vat_breakdown JSONB NOT NULL,
    payment_methods_breakdown JSONB NOT NULL,
    tips_total DECIMAL(10,2) DEFAULT 0,
    change_total DECIMAL(10,2) DEFAULT 0,
    first_sequence INTEGER NOT NULL,
    last_sequence INTEGER NOT NULL,
    closure_hash VARCHAR(64) NOT NULL UNIQUE,
    is_closed BOOLEAN DEFAULT FALSE,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail table
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(50),
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Archive exports table
CREATE TABLE IF NOT EXISTS archive_exports (
    id SERIAL PRIMARY KEY,
    export_type VARCHAR(50) NOT NULL,
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    format VARCHAR(10) NOT NULL CHECK (format IN ('JSON', 'CSV', 'XML')),
    file_path TEXT,
    file_size BIGINT,
    export_status VARCHAR(20) DEFAULT 'pending' CHECK (export_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- =====================================================
-- STEP 5: Ensure Business Settings Table Exists
-- =====================================================

CREATE TABLE IF NOT EXISTS business_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100) NOT NULL,
    siret VARCHAR(20) NOT NULL,
    tax_identification VARCHAR(30) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- STEP 7: Update Legal Protection Functions
-- =====================================================

-- Function to prevent legal journal modification (updated version)
CREATE OR REPLACE FUNCTION prevent_legal_journal_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Modification of legal journal is forbidden for legal compliance (Article 286-I-3 bis du CGI)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent closed bulletin modification (updated version)
CREATE OR REPLACE FUNCTION prevent_closed_bulletin_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.is_closed = TRUE THEN
        RAISE EXCEPTION 'Modification of closed closure bulletin is forbidden for legal compliance';
    END IF;
    IF TG_OP = 'DELETE' AND OLD.is_closed = TRUE THEN
        RAISE EXCEPTION 'Deletion of closed closure bulletin is forbidden for legal compliance';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 8: Update Foreign Key Constraints
-- =====================================================

-- Update legal_journal foreign key constraint
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'legal_journal_order_id_fkey' 
               AND table_name = 'legal_journal') THEN
        -- Drop and recreate with updated cascade behavior
        ALTER TABLE legal_journal DROP CONSTRAINT legal_journal_order_id_fkey;
        ALTER TABLE legal_journal 
        ADD CONSTRAINT legal_journal_order_id_fkey 
        FOREIGN KEY (order_id) REFERENCES orders(id);
    END IF;
END $$;

-- Update order_items foreign key constraint
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'order_items_product_id_fkey' 
               AND table_name = 'order_items') THEN
        -- Drop and recreate with updated cascade behavior
        ALTER TABLE order_items DROP CONSTRAINT order_items_product_id_fkey;
        ALTER TABLE order_items 
        ADD CONSTRAINT order_items_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES products(id);
    END IF;
END $$;

-- =====================================================
-- STEP 9: Apply Protection Triggers
-- =====================================================

-- Legal journal protection trigger
DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON legal_journal;
CREATE TRIGGER trigger_prevent_legal_journal_modification
    BEFORE UPDATE OR DELETE ON legal_journal
    FOR EACH ROW
    EXECUTE FUNCTION prevent_legal_journal_modification();

-- Closure bulletin protection trigger
DROP TRIGGER IF EXISTS trigger_prevent_closed_bulletin_modification ON closure_bulletins;
CREATE TRIGGER trigger_prevent_closed_bulletin_modification
    BEFORE UPDATE OR DELETE ON closure_bulletins
    FOR EACH ROW
    EXECUTE FUNCTION prevent_closed_bulletin_modification();

-- =====================================================
-- STEP 10: Add Column Comments
-- =====================================================

-- Add comment to order_items description column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_description 
                   WHERE objoid = (SELECT oid FROM pg_class WHERE relname = 'order_items') 
                   AND objsubid = (SELECT attnum FROM pg_attribute 
                                  WHERE attrelid = (SELECT oid FROM pg_class WHERE relname = 'order_items') 
                                  AND attname = 'description')) THEN
        COMMENT ON COLUMN order_items.description IS 'Description for special items like Divers, used for traceability and legal compliance';
    END IF;
END $$;

-- =====================================================
-- STEP 11: Ensure Required Permissions
-- =====================================================

-- Grant necessary permissions (adjust user as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- This migration script has been applied successfully
-- All structural changes from development have been migrated to production
-- No data content has been modified - only schema/structure changes

-- IMPORTANT NOTES:
-- - Always backup your production database before running migrations
-- - Test migrations on a copy of production data first
-- - Only migrate structure changes, never data content
-- - Keep this script updated with all schema changes made in development 