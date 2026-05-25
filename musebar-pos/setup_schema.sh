#!/bin/bash
# Database Schema Setup Script
# Creates all necessary tables for MuseBar POS

set -e  # Exit on error

DB_NAME="restaurant_pos_development"
DB_USER="student"

echo "🗄️  Setting up database schema for $DB_NAME..."

# Apply initial schema (public tables)
echo "📊 Creating public schema tables..."
psql -d $DB_NAME -U $DB_USER << 'SQL'
-- Initial schema for MuseBar POS
-- Multi-tenant architecture with schema-based isolation

-- Establishments table (main tenant table in public schema)
CREATE TABLE IF NOT EXISTS establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    schema_name VARCHAR(100) NOT NULL UNIQUE,
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'premium', 'enterprise')),
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Users table (in public schema, linked to establishments)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('system_admin', 'establishment_admin', 'cashier')),
    establishment_id UUID REFERENCES establishments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail (in public schema, tracks all user actions)
CREATE TABLE IF NOT EXISTS audit_trail (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Closure bulletins (in public schema, per establishment)
CREATE TABLE IF NOT EXISTS closure_bulletins (
    id BIGSERIAL PRIMARY KEY,
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    closure_type VARCHAR(10) NOT NULL CHECK (closure_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL')),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    fond_de_caisse DECIMAL(12,4) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,4) NOT NULL DEFAULT 0,
    total_vat DECIMAL(12,4) NOT NULL DEFAULT 0,
    vat_breakdown JSONB NOT NULL,
    payment_methods_breakdown JSONB NOT NULL,
    tips_total DECIMAL(12,4) NOT NULL DEFAULT 0,
    change_total DECIMAL(12,4) NOT NULL DEFAULT 0,
    first_sequence INTEGER,
    last_sequence INTEGER,
    closure_hash VARCHAR(64) NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT period_valid CHECK (period_end >= period_start),
    CONSTRAINT transactions_positive CHECK (total_transactions >= 0),
    CONSTRAINT sequence_order CHECK (last_sequence IS NULL OR first_sequence IS NULL OR last_sequence >= first_sequence)
);

-- Archive exports (in public schema)
CREATE TABLE IF NOT EXISTS archive_exports (
    id BIGSERIAL PRIMARY KEY,
    export_type VARCHAR(20) NOT NULL CHECK (export_type IN ('DAILY', 'MONTHLY', 'ANNUAL', 'FULL')),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    file_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    file_size BIGINT NOT NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('CSV', 'XML', 'PDF', 'JSON')),
    digital_signature TEXT,
    export_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (export_status IN ('PENDING', 'COMPLETED', 'FAILED', 'VERIFIED')),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMPTZ,
    
    CONSTRAINT file_size_positive CHECK (file_size > 0),
    CONSTRAINT period_valid_archive CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_establishment ON users(establishment_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_trail(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action_time ON audit_trail(action_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_closure_establishment ON closure_bulletins(establishment_id);
CREATE INDEX IF NOT EXISTS idx_closure_type_period ON closure_bulletins(closure_type, period_start);
CREATE INDEX IF NOT EXISTS idx_archive_type_period ON archive_exports(export_type, period_start);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_establishments_updated_at ON establishments;
CREATE TRIGGER update_establishments_updated_at
    BEFORE UPDATE ON establishments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
SQL

echo "✅ Public schema tables created"

# Create a test establishment and its schema
echo "📊 Creating test establishment schema..."
psql -d $DB_NAME -U $DB_USER << 'SQL'
-- Create test establishment
INSERT INTO establishments (name, email, schema_name)
VALUES ('Test Restaurant', 'test@musebar.com', 'establishment_test_001')
ON CONFLICT (email) DO NOTHING;

-- Create the test establishment schema
CREATE SCHEMA IF NOT EXISTS establishment_test_001;

-- Set search path to the test schema
SET search_path TO establishment_test_001;

-- Legal journal (append-only, immutable)
CREATE TABLE IF NOT EXISTS legal_journal (
    id BIGSERIAL PRIMARY KEY,
    sequence_number INTEGER NOT NULL UNIQUE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('SALE', 'REFUND', 'CORRECTION', 'CLOSURE', 'ARCHIVE', 'CHANGE')),
    order_id BIGINT,
    amount DECIMAL(12,4) NOT NULL,
    vat_amount DECIMAL(12,4) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_data JSONB NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL UNIQUE,
    timestamp TIMESTAMPTZ NOT NULL,
    user_id VARCHAR(100),
    register_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT sequence_positive CHECK (sequence_number >= 0)
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    default_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,4) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    happy_hour_price DECIMAL(12,4),
    happy_hour_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT price_positive CHECK (price > 0),
    CONSTRAINT tax_rate_valid CHECK (tax_rate >= 0 AND tax_rate <= 100),
    CONSTRAINT happy_hour_price_valid CHECK (happy_hour_price IS NULL OR happy_hour_price > 0)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED')),
    total_amount DECIMAL(12,4) NOT NULL,
    total_vat DECIMAL(12,4) NOT NULL,
    payment_method VARCHAR(50),
    tips DECIMAL(12,4) NOT NULL DEFAULT 0,
    change DECIMAL(12,4) NOT NULL DEFAULT 0,
    created_by BIGINT,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT total_amount_positive CHECK (total_amount >= 0),
    CONSTRAINT tips_non_negative CHECK (tips >= 0),
    CONSTRAINT change_non_negative CHECK (change >= 0)
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,4) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    tax_amount DECIMAL(12,4) NOT NULL,
    subtotal DECIMAL(12,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT quantity_positive CHECK (quantity > 0),
    CONSTRAINT unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT tax_amount_non_negative CHECK (tax_amount >= 0),
    CONSTRAINT subtotal_positive CHECK (subtotal > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_legal_journal_sequence ON legal_journal(sequence_number);
CREATE INDEX IF NOT EXISTS idx_legal_journal_timestamp ON legal_journal(timestamp);
CREATE INDEX IF NOT EXISTS idx_legal_journal_type ON legal_journal(transaction_type);
CREATE INDEX IF NOT EXISTS idx_legal_journal_register ON legal_journal(register_id);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active, is_archived);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, is_archived);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Triggers for immutable legal journal
CREATE OR REPLACE FUNCTION prevent_legal_journal_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Modification of legal journal is forbidden for legal compliance (Article 286-I-3 bis du CGI)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON legal_journal;
CREATE TRIGGER trigger_prevent_legal_journal_modification
    BEFORE UPDATE OR DELETE ON legal_journal
    FOR EACH ROW
    EXECUTE FUNCTION prevent_legal_journal_modification();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reset search path
RESET search_path;
SQL

echo "✅ Test establishment schema created: establishment_test_001"

echo ""
echo "🎉 Database schema setup complete!"
echo ""
echo "Created tables:"
echo "  Public schema:"
echo "    - establishments"
echo "    - users"
echo "    - audit_trail"
echo "    - closure_bulletins"
echo "    - archive_exports"
echo ""
echo "  Test establishment schema (establishment_test_001):"
echo "    - legal_journal (immutable)"
echo "    - categories"
echo "    - products"
echo "    - orders"
echo "    - order_items"
echo ""
echo "✅ Ready for testing!"
