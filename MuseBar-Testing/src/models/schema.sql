-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(16),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des produits
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(4,2) NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  is_happy_hour_eligible BOOLEAN DEFAULT FALSE,
  happy_hour_discount_type VARCHAR(16), -- 'percentage' ou 'fixed'
  happy_hour_discount_value NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des commandes
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  total_amount NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL,
  final_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(16) DEFAULT 'pending'
);

-- Table des items de commande
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(100),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(4,2) NOT NULL,
  is_happy_hour_applied BOOLEAN DEFAULT FALSE
); 