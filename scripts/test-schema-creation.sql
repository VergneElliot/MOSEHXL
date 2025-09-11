-- Test schema creation to find UUID to integer conversion issue
-- This will help us identify if the issue is in the schema creation

DO $$
DECLARE
    test_schema_name TEXT := 'test_schema_' || substr(md5(random()::text), 1, 8);
    test_establishment_id UUID := gen_random_uuid();
BEGIN
    RAISE NOTICE 'Testing schema creation with schema name: %', test_schema_name;
    
    -- Step 1: Create the schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', test_schema_name);
    RAISE NOTICE 'Schema created successfully';
    
    -- Step 2: Create orders table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.orders (
            id SERIAL PRIMARY KEY,
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', test_schema_name);
    RAISE NOTICE 'Orders table created successfully';
    
    -- Step 3: Create order_items table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', test_schema_name);
    RAISE NOTICE 'Order items table created successfully';
    
    -- Step 4: Create products table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.products (
            id SERIAL PRIMARY KEY,
            category_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', test_schema_name);
    RAISE NOTICE 'Products table created successfully';
    
    -- Step 5: Create categories table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', test_schema_name);
    RAISE NOTICE 'Categories table created successfully';
    
    -- Step 6: Create legal_journal table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.legal_journal (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', test_schema_name);
    RAISE NOTICE 'Legal journal table created successfully';
    
    -- Step 7: Create audit_trail table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.audit_trail (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            action_type VARCHAR(100) NOT NULL,
            resource_type VARCHAR(50),
            resource_id VARCHAR(100),
            action_details JSONB,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', test_schema_name);
    RAISE NOTICE 'Audit trail table created successfully';
    
    -- Step 8: Create performance indexes - THIS IS WHERE THE ERROR MIGHT BE
    DECLARE
        index_prefix TEXT := replace(test_schema_name, '-', '_');
    BEGIN
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_orders_created_at ON %I.orders(created_at)', index_prefix, test_schema_name);
        RAISE NOTICE 'Index 1 created successfully';
        
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_orders_status ON %I.orders(status)', index_prefix, test_schema_name);
        RAISE NOTICE 'Index 2 created successfully';
        
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_products_category ON %I.products(category_id)', index_prefix, test_schema_name);
        RAISE NOTICE 'Index 3 created successfully';
        
        -- This might be the problematic index if user_id is expected to be UUID
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_audit_trail_user ON %I.audit_trail(user_id)', index_prefix, test_schema_name);
        RAISE NOTICE 'Index 4 created successfully';
        
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_order_items_order ON %I.order_items(order_id)', index_prefix, test_schema_name);
        RAISE NOTICE 'Index 5 created successfully';
        
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_legal_journal_order ON %I.legal_journal(order_id)', index_prefix, test_schema_name);
        RAISE NOTICE 'Index 6 created successfully';
    END;
    
    -- Clean up
    EXECUTE format('DROP SCHEMA %I CASCADE', test_schema_name);
    RAISE NOTICE 'Test schema dropped successfully';
    
    RAISE NOTICE 'All tests completed successfully!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        RAISE NOTICE 'Error detail: %', SQLSTATE;
        -- Clean up on error
        EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', test_schema_name);
        RAISE;
END $$;
