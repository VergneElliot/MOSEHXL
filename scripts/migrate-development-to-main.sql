-- MOSEHXL Migration: Development to Main (Production)
-- This script ensures the production database is up to date with the latest schema required for unified return/cancellation logic and payment method handling.
-- It is safe to run multiple times (idempotent) and will not drop or destructively modify existing data.

-- 1. Ensure 'tips' and 'change' columns exist in orders table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tips') THEN
        ALTER TABLE orders ADD COLUMN tips NUMERIC(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'change') THEN
        ALTER TABLE orders ADD COLUMN change NUMERIC(10,2) DEFAULT 0;
    END IF;
END $$;

-- 2. Ensure 'sub_bills' table exists for split payments
CREATE TABLE IF NOT EXISTS sub_bills (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Ensure 'payment_method' column exists in orders and sub_bills
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sub_bills' AND column_name = 'payment_method') THEN
        ALTER TABLE sub_bills ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'cash';
    END IF;
END $$;

-- 4. Ensure 'legal_journal' table exists for legal compliance
CREATE TABLE IF NOT EXISTS legal_journal (
    id SERIAL PRIMARY KEY,
    sequence_number INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    order_id INTEGER REFERENCES orders(id),
    amount NUMERIC(10,2) NOT NULL,
    vat_amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_data JSONB NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    user_id VARCHAR(100),
    register_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Ensure all required indexes exist
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sub_bills_order_id ON sub_bills(order_id);

-- 6. Ensure 'closure_bulletins' table has tips_total and change_total columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'closure_bulletins' AND column_name = 'tips_total') THEN
        ALTER TABLE closure_bulletins ADD COLUMN tips_total NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'closure_bulletins' AND column_name = 'change_total') THEN
        ALTER TABLE closure_bulletins ADD COLUMN change_total NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 7. Ensure 'happy_hour_applied' and 'happy_hour_discount_amount' columns exist in order_items
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'happy_hour_applied') THEN
        ALTER TABLE order_items ADD COLUMN happy_hour_applied BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'happy_hour_discount_amount') THEN
        ALTER TABLE order_items ADD COLUMN happy_hour_discount_amount NUMERIC(10,2) DEFAULT 0;
    END IF;
END $$;

-- 8. Ensure 'sub_bill_id' column exists in order_items for split payments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'sub_bill_id') THEN
        ALTER TABLE order_items ADD COLUMN sub_bill_id INTEGER DEFAULT NULL;
    END IF;
END $$;

-- 9. Final notice
DO $$ BEGIN RAISE NOTICE 'MOSEHXL migration from development to main complete. Schema is now up to date for unified return/cancellation logic.'; END $$; 