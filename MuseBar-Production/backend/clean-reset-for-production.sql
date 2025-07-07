-- PRODUCTION CLEAN RESET: Legal-Compliant Fresh Start
-- ✅ Preserves admin user credentials
-- ✅ Maintains legal compliance structures  
-- ✅ Resets all transactional data to zero

BEGIN;

-- ==========================================
-- STEP 1: PRESERVE ADMIN USER
-- ==========================================
-- Create temporary backup of admin user
CREATE TEMP TABLE temp_admin_backup AS 
SELECT * FROM users WHERE email = 'elliot.vergne@gmail.com';

-- ==========================================
-- STEP 2: TEMPORARILY DISABLE LEGAL TRIGGERS
-- ==========================================
DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON legal_journal;
DROP TRIGGER IF EXISTS trigger_prevent_closed_bulletin_modification ON closure_bulletins;

-- ==========================================
-- STEP 3: CLEAN ALL TRANSACTIONAL DATA
-- ==========================================

-- Clear audit trail
DELETE FROM audit_trail;
ALTER SEQUENCE audit_trail_id_seq RESTART WITH 1;

-- Clear legal journal entries
DELETE FROM legal_journal;
ALTER SEQUENCE legal_journal_id_seq RESTART WITH 1;

-- Clear closure bulletins
DELETE FROM closure_bulletins;
ALTER SEQUENCE closure_bulletins_id_seq RESTART WITH 1;

-- Clear archive exports
DELETE FROM archive_exports WHERE TRUE;
ALTER SEQUENCE archive_exports_id_seq RESTART WITH 1;

-- Clear order-related data
DELETE FROM sub_bills;
DELETE FROM order_items;
DELETE FROM orders;
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE sub_bills_id_seq RESTART WITH 1;

-- Clear all users EXCEPT admin
DELETE FROM users WHERE email != 'elliot.vergne@gmail.com';

-- Restore admin user if accidentally deleted (safety measure)
INSERT INTO users (id, email, password, role, created_at, updated_at)
SELECT id, email, password, role, created_at, updated_at 
FROM temp_admin_backup
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'elliot.vergne@gmail.com');

-- ==========================================
-- STEP 4: INITIALIZE CLEAN LEGAL JOURNAL
-- ==========================================

-- Insert proper legal initialization entry
INSERT INTO legal_journal (
    sequence_number, 
    transaction_type, 
    order_id,
    amount, 
    vat_amount, 
    payment_method,
    transaction_data, 
    previous_hash, 
    current_hash, 
    timestamp, 
    register_id,
    user_id
) VALUES (
    1, 
    'ARCHIVE', 
    NULL,
    0.00, 
    0.00, 
    'SYSTEM',
    '{"type": "SYSTEM_INIT", "message": "Legal journal initialized for production", "compliance": "Article 286-I-3 bis du CGI", "environment": "PRODUCTION", "admin_preserved": true}',
    '0000000000000000000000000000000000000000000000000000000000000000',
    -- Calculated hash for: "1|ARCHIVE|NULL|0.00|0.00|SYSTEM|<timestamp>|MUSEBAR-REG-001"
    sha256(concat('0000000000000000000000000000000000000000000000000000000000000000|1|ARCHIVE||0.00|0.00|SYSTEM|', NOW()::text, '|MUSEBAR-REG-001')),
    NOW(),
    'MUSEBAR-REG-001',
    (SELECT id FROM users WHERE email = 'elliot.vergne@gmail.com' LIMIT 1)::text
);

-- ==========================================
-- STEP 5: RESTORE LEGAL PROTECTION TRIGGERS
-- ==========================================

-- Recreate legal journal protection
CREATE OR REPLACE FUNCTION prevent_legal_journal_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Modification of legal journal is forbidden for legal compliance (Article 286-I-3 bis du CGI)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_legal_journal_modification
    BEFORE UPDATE OR DELETE ON legal_journal
    FOR EACH ROW
    EXECUTE FUNCTION prevent_legal_journal_modification();

-- Recreate closure bulletins protection
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

CREATE TRIGGER trigger_prevent_closed_bulletin_modification
    BEFORE UPDATE OR DELETE ON closure_bulletins
    FOR EACH ROW
    EXECUTE FUNCTION prevent_closed_bulletin_modification();

-- ==========================================
-- STEP 6: ADD CLOSURE SETTINGS TABLE
-- ==========================================

-- Create settings table for configurable daily closure
CREATE TABLE IF NOT EXISTS closure_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default closure settings
INSERT INTO closure_settings (setting_key, setting_value, description, updated_by) VALUES
('daily_closure_time', '02:00', 'Time when daily closure is automatically triggered (HH:MM format)', 'SYSTEM'),
('auto_closure_enabled', 'true', 'Whether automatic daily closure is enabled', 'SYSTEM'),
('timezone', 'Europe/Paris', 'Timezone for closure calculations', 'SYSTEM'),
('closure_grace_period_minutes', '30', 'Grace period in minutes before auto-closure', 'SYSTEM')
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = CURRENT_TIMESTAMP;

-- Grant permissions
GRANT ALL PRIVILEGES ON closure_settings TO musebar_user;
GRANT ALL PRIVILEGES ON closure_settings_id_seq TO musebar_user;

-- ==========================================
-- FINAL VERIFICATION
-- ==========================================

-- Verify admin user exists
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM users WHERE email = 'elliot.vergne@gmail.com';
    IF admin_count = 0 THEN
        RAISE EXCEPTION 'CRITICAL: Admin user was not preserved during reset!';
    ELSE
        RAISE NOTICE 'SUCCESS: Admin user preserved (%)' , admin_count;
    END IF;
END
$$;

-- Display reset summary
SELECT 
    'CLEAN RESET COMPLETED' as status,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM legal_journal) as legal_journal_entries,
    (SELECT COUNT(*) FROM closure_bulletins) as closure_bulletins,
    (SELECT COUNT(*) FROM audit_trail) as audit_entries,
    (SELECT email FROM users WHERE email = 'elliot.vergne@gmail.com') as admin_preserved;

COMMIT; 