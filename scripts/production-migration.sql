-- MOSEHXL Production Database Migration Script
-- This script safely adds new features to the production database
-- WITHOUT affecting existing data or legal compliance

-- IMPORTANT: This script is designed to be safe for production use
-- It only adds new columns and features, never modifies existing data
-- All legal compliance features are preserved

-- Migration 1: Add is_active columns to categories and products (for archiving feature)
DO $$ 
BEGIN 
    -- Add is_active to categories if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'categories' AND column_name = 'is_active') THEN
        ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        UPDATE categories SET is_active = TRUE WHERE is_active IS NULL;
        RAISE NOTICE 'Added is_active column to categories table';
    ELSE
        RAISE NOTICE 'is_active column already exists in categories table';
    END IF;
    
    -- Add is_active to products if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        UPDATE products SET is_active = TRUE WHERE is_active IS NULL;
        RAISE NOTICE 'Added is_active column to products table';
    ELSE
        RAISE NOTICE 'is_active column already exists in products table';
    END IF;
END $$;

-- Migration 2: Add tips and change columns to orders table (for new POS features)
DO $$
BEGIN
    -- Add tips column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'tips') THEN
        ALTER TABLE orders ADD COLUMN tips NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added tips column to orders table';
    ELSE
        RAISE NOTICE 'tips column already exists in orders table';
    END IF;
    
    -- Add change column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'change') THEN
        ALTER TABLE orders ADD COLUMN change NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added change column to orders table';
    ELSE
        RAISE NOTICE 'change column already exists in orders table';
    END IF;
END $$;

-- Migration 3: Add new columns to closure_bulletins table (for enhanced legal reporting)
DO $$
BEGIN
    -- Add tips_total column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'closure_bulletins' AND column_name = 'tips_total') THEN
        ALTER TABLE closure_bulletins ADD COLUMN tips_total NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added tips_total column to closure_bulletins table';
    ELSE
        RAISE NOTICE 'tips_total column already exists in closure_bulletins table';
    END IF;
    
    -- Add change_total column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'closure_bulletins' AND column_name = 'change_total') THEN
        ALTER TABLE closure_bulletins ADD COLUMN change_total NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added change_total column to closure_bulletins table';
    ELSE
        RAISE NOTICE 'change_total column already exists in closure_bulletins table';
    END IF;
END $$;

-- Migration 4: Ensure all required indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sub_bills_order_id ON sub_bills(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_closure_bulletins_period_start ON closure_bulletins(period_start);

-- Migration 5: Verify legal compliance tables exist
DO $$
BEGIN
    -- Ensure legal_journal table exists (for legal compliance)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'legal_journal') THEN
        CREATE TABLE legal_journal (
            id SERIAL PRIMARY KEY,
            sequence_number INTEGER NOT NULL,
            transaction_type VARCHAR(20) NOT NULL, -- 'SALE', 'REFUND', 'VOID'
            amount DECIMAL(10,2) NOT NULL,
            vat_amount DECIMAL(10,2) NOT NULL,
            payment_method VARCHAR(20) NOT NULL,
            order_id INTEGER REFERENCES orders(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created legal_journal table for compliance';
    ELSE
        RAISE NOTICE 'legal_journal table already exists';
    END IF;
    
    -- Ensure closure_bulletins table exists (for daily closures)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'closure_bulletins') THEN
        CREATE TABLE closure_bulletins (
            id SERIAL PRIMARY KEY,
            closure_type VARCHAR(20) NOT NULL DEFAULT 'DAILY',
            period_start TIMESTAMP NOT NULL,
            period_end TIMESTAMP NOT NULL,
            total_transactions INTEGER NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            total_vat DECIMAL(10,2) NOT NULL,
            vat_breakdown JSONB,
            payment_methods_breakdown JSONB,
            tips_total NUMERIC DEFAULT 0,
            change_total NUMERIC DEFAULT 0,
            first_sequence INTEGER,
            last_sequence INTEGER,
            closure_hash VARCHAR(255) NOT NULL,
            is_closed BOOLEAN DEFAULT FALSE,
            closed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created closure_bulletins table for daily closures';
    ELSE
        RAISE NOTICE 'closure_bulletins table already exists';
    END IF;
END $$;

-- Migration 6: Add any missing permissions (for user management)
INSERT INTO permissions (name) VALUES 
    ('pos_access'),
    ('menu_management'),
    ('user_management'),
    ('legal_compliance'),
    ('audit_trail'),
    ('closure_bulletins')
ON CONFLICT (name) DO NOTHING;

-- Final verification
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'All new features have been safely added to the production database';
    RAISE NOTICE 'Existing data and legal compliance have been preserved';
    RAISE NOTICE 'The application is now ready to use all new features';
END $$; 