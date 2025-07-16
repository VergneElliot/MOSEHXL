-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    default_tax_rate DECIMAL(5,2) DEFAULT 20.00,
    color VARCHAR(7) DEFAULT '#1976d2',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
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

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    total_amount DECIMAL(10,2) NOT NULL,
    total_tax DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash', -- 'cash', 'card', 'split'
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
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
    sub_bill_id INTEGER DEFAULT NULL, -- For split payments
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sub_bills table for split payments
CREATE TABLE IF NOT EXISTS sub_bills (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL, -- 'cash', 'card'
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- User permissions join table
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, permission_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sub_bills_order_id ON sub_bills(order_id);

-- Insert some sample data
INSERT INTO categories (name, default_tax_rate) VALUES 
    ('Bières', 20.00),
    ('Vins', 20.00),
    ('Cocktails', 20.00),
    ('Softs', 10.00),
    ('Snacks', 10.00)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, tax_rate, category_id, happy_hour_discount_percent, is_happy_hour_eligible) VALUES 
    ('Heineken 33cl', 6.50, 20.00, 1, 15.00, true),
    ('1664 33cl', 6.00, 20.00, 1, 15.00, true),
    ('Vin Rouge Verre', 8.00, 20.00, 2, 20.00, true),
    ('Vin Blanc Verre', 8.00, 20.00, 2, 20.00, true),
    ('Mojito', 12.00, 20.00, 3, 25.00, true),
    ('Coca Cola 33cl', 4.00, 10.00, 4, 10.00, true),
    ('Chips', 3.50, 10.00, 5, 0.00, false)
ON CONFLICT DO NOTHING;

-- Migration: Add is_active columns if they don't exist (for existing databases)
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
END $$; 

-- Business settings for receipts and legal compliance
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