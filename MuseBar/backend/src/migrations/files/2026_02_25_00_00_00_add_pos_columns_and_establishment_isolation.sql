-- UP
-- Migration: Add missing POS columns and establishment isolation
-- Fixes:
--   1. Add tips and change columns to orders (used by orderModel.ts but missing from schema)
--   2. Add description column to order_items (used for misc/Divers items)
--   3. Add establishment_id FK to all core POS tables for multi-tenant data isolation

-- Fix 1: Missing columns on orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tips DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change DECIMAL(10,2) DEFAULT 0;

-- Fix 2: Missing description on order_items
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Fix 3: establishment_id on core POS tables
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE;

ALTER TABLE sub_bills
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE;

ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE;

-- Indexes for establishment-scoped queries (used on every POS data fetch)
CREATE INDEX IF NOT EXISTS idx_categories_establishment_id ON categories(establishment_id);
CREATE INDEX IF NOT EXISTS idx_products_establishment_id ON products(establishment_id);
CREATE INDEX IF NOT EXISTS idx_orders_establishment_id ON orders(establishment_id);
CREATE INDEX IF NOT EXISTS idx_sub_bills_establishment_id ON sub_bills(establishment_id);
CREATE INDEX IF NOT EXISTS idx_business_settings_establishment_id ON business_settings(establishment_id);

-- DOWN
-- Remove indexes
DROP INDEX IF EXISTS idx_categories_establishment_id;
DROP INDEX IF EXISTS idx_products_establishment_id;
DROP INDEX IF EXISTS idx_orders_establishment_id;
DROP INDEX IF EXISTS idx_sub_bills_establishment_id;
DROP INDEX IF EXISTS idx_business_settings_establishment_id;

-- Remove establishment_id columns
ALTER TABLE categories DROP COLUMN IF EXISTS establishment_id;
ALTER TABLE products DROP COLUMN IF EXISTS establishment_id;
ALTER TABLE orders DROP COLUMN IF EXISTS establishment_id;
ALTER TABLE sub_bills DROP COLUMN IF EXISTS establishment_id;
ALTER TABLE business_settings DROP COLUMN IF EXISTS establishment_id;

-- Remove description from order_items
ALTER TABLE order_items DROP COLUMN IF EXISTS description;

-- Remove tips and change from orders
ALTER TABLE orders DROP COLUMN IF EXISTS tips;
ALTER TABLE orders DROP COLUMN IF EXISTS change;
