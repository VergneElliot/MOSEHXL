-- Migration Script: Main Branch to Development Branch
-- This script migrates database structure changes from main to development
-- WITHOUT migrating any data content - only schema/structure changes

-- =====================================================
-- STEP 1: Core Schema Migration
-- =====================================================

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    default_tax_rate DECIMAL(5,2) DEFAULT 20.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 20.00,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    happy_hour_discount_percent DECIMAL(5,2) DEFAULT NULL,
    happy_hour_discount_fixed DECIMAL(10,2) DEFAULT NULL,
    is_happy_hour_eligible BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    total_amount DECIMAL(10,2) NOT NULL,
    total_tax DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash',
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    tips DECIMAL(10,2) DEFAULT 0,
    change DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    happy_hour_applied BOOLEAN DEFAULT false,
    happy_hour_discount_amount DECIMAL(10,2) DEFAULT 0,
    sub_bill_id INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sub_bills table if it doesn't exist
CREATE TABLE IF NOT EXISTS sub_bills (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Create user_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, permission_id)
);

-- Create business_settings table if it doesn't exist
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
-- STEP 2: Legal Compliance Schema Migration
-- =====================================================

-- Create legal_journal table if it doesn't exist
CREATE TABLE IF NOT EXISTS legal_journal (
    id SERIAL PRIMARY KEY,
    sequence_number INTEGER NOT NULL UNIQUE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('SALE', 'REFUND', 'CORRECTION', 'CLOSURE', 'ARCHIVE')),
    order_id INTEGER REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_data JSONB NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL UNIQUE,
    timestamp TIMESTAMP NOT NULL,
    user_id VARCHAR(100),
    register_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT sequence_positive CHECK (sequence_number >= 0),
    CONSTRAINT amount_positive CHECK (amount >= 0),
    CONSTRAINT vat_amount_positive CHECK (vat_amount >= 0)
);

-- Create closure_bulletins table if it doesn't exist
CREATE TABLE IF NOT EXISTS closure_bulletins (
    id SERIAL PRIMARY KEY,
    closure_type VARCHAR(10) NOT NULL CHECK (closure_type IN ('DAILY', 'MONTHLY', 'ANNUAL')),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
    vat_breakdown JSONB NOT NULL,
    payment_methods_breakdown JSONB NOT NULL,
    first_sequence INTEGER,
    last_sequence INTEGER,
    closure_hash VARCHAR(64) NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at TIMESTAMP,
    tips_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    change_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT period_valid CHECK (period_end >= period_start),
    CONSTRAINT totals_positive CHECK (total_transactions >= 0 AND total_amount >= 0 AND total_vat >= 0),
    CONSTRAINT sequence_order CHECK (last_sequence IS NULL OR first_sequence IS NULL OR last_sequence >= first_sequence),
    CONSTRAINT tips_change_positive CHECK (tips_total >= 0 AND change_total >= 0)
);

-- Create audit_trail table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create archive_exports table if it doesn't exist
CREATE TABLE IF NOT EXISTS archive_exports (
    id SERIAL PRIMARY KEY,
    export_type VARCHAR(20) NOT NULL CHECK (export_type IN ('DAILY', 'MONTHLY', 'ANNUAL', 'FULL')),
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    file_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    file_size BIGINT NOT NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('CSV', 'XML', 'PDF', 'JSON')),
    digital_signature TEXT,
    export_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (export_status IN ('PENDING', 'COMPLETED', 'FAILED', 'VERIFIED')),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    
    CONSTRAINT file_size_positive CHECK (file_size > 0),
    CONSTRAINT period_valid_archive CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start)
);

-- =====================================================
-- STEP 3: Add Missing Columns (Safe Migration)
-- =====================================================

-- Add missing columns to existing tables safely
DO $$ 
BEGIN 
    -- Add is_active to categories if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'categories' AND column_name = 'is_active') THEN
        ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        UPDATE categories SET is_active = TRUE WHERE is_active IS NULL;
    END IF;
    
    -- Add is_active to products if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        UPDATE products SET is_active = TRUE WHERE is_active IS NULL;
    END IF;

    -- Add tips and change to orders if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'tips') THEN
        ALTER TABLE orders ADD COLUMN tips DECIMAL(10,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'change') THEN
        ALTER TABLE orders ADD COLUMN change DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add tips_total and change_total to closure_bulletins if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'closure_bulletins' AND column_name = 'tips_total') THEN
        ALTER TABLE closure_bulletins ADD COLUMN tips_total DECIMAL(12,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'closure_bulletins' AND column_name = 'change_total') THEN
        ALTER TABLE closure_bulletins ADD COLUMN change_total DECIMAL(12,2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- =====================================================
-- STEP 4: Create Indexes
-- =====================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sub_bills_order_id ON sub_bills(order_id);

-- Legal compliance indexes
CREATE INDEX IF NOT EXISTS idx_legal_journal_sequence ON legal_journal(sequence_number);
CREATE INDEX IF NOT EXISTS idx_legal_journal_timestamp ON legal_journal(timestamp);
CREATE INDEX IF NOT EXISTS idx_legal_journal_type ON legal_journal(transaction_type);
CREATE INDEX IF NOT EXISTS idx_legal_journal_order ON legal_journal(order_id);
CREATE INDEX IF NOT EXISTS idx_legal_journal_register ON legal_journal(register_id);

CREATE INDEX IF NOT EXISTS idx_closure_type_period ON closure_bulletins(closure_type, period_start);
CREATE INDEX IF NOT EXISTS idx_closure_closed ON closure_bulletins(is_closed, created_at);

CREATE INDEX IF NOT EXISTS idx_archive_type_period ON archive_exports(export_type, period_start);
CREATE INDEX IF NOT EXISTS idx_archive_status ON archive_exports(export_status, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_trail(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action_time ON audit_trail(action_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_trail(resource_type, resource_id);

-- =====================================================
-- STEP 5: Create Functions and Triggers
-- =====================================================

-- Function to prevent legal_journal modification
CREATE OR REPLACE FUNCTION prevent_legal_journal_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Modification of legal journal is forbidden for legal compliance (Article 286-I-3 bis du CGI)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent closed bulletin modification
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

-- Create triggers
DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON legal_journal;
CREATE TRIGGER trigger_prevent_legal_journal_modification
    BEFORE UPDATE OR DELETE ON legal_journal
    FOR EACH ROW
    EXECUTE FUNCTION prevent_legal_journal_modification();

DROP TRIGGER IF EXISTS trigger_prevent_closed_bulletin_modification ON closure_bulletins;
CREATE TRIGGER trigger_prevent_closed_bulletin_modification
    BEFORE UPDATE OR DELETE ON closure_bulletins
    FOR EACH ROW
    EXECUTE FUNCTION prevent_closed_bulletin_modification();

-- =====================================================
-- STEP 6: Insert Initial Data (Structure Only)
-- =====================================================

-- Insert initial legal journal entry if it doesn't exist
INSERT INTO legal_journal (
    sequence_number, transaction_type, amount, vat_amount, payment_method,
    transaction_data, previous_hash, current_hash, timestamp, register_id
) VALUES (
    0, 'ARCHIVE', 0.00, 0.00, 'SYSTEM',
    '{"type": "SYSTEM_INIT", "message": "Legal journal initialized", "compliance": "Article 286-I-3 bis du CGI"}',
    '0000000000000000000000000000000000000000000000000000000000000000',
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    CURRENT_TIMESTAMP,
    'MUSEBAR-REG-001'
) ON CONFLICT (sequence_number) DO NOTHING;

-- =====================================================
-- STEP 7: Grant Permissions
-- =====================================================

-- Grant appropriate permissions (adjust user as needed)
-- GRANT SELECT ON legal_journal TO musebar_user;
-- GRANT INSERT ON legal_journal TO musebar_user;
-- GRANT ALL PRIVILEGES ON closure_bulletins TO musebar_user;
-- GRANT ALL PRIVILEGES ON audit_trail TO musebar_user;
-- GRANT ALL PRIVILEGES ON archive_exports TO musebar_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO musebar_user;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- This script has successfully migrated all schema changes from main to development
-- No data content was migrated - only structure changes
-- Your development database now has the same schema as your main branch 