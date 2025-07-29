-- Insert all available permissions into the permissions table
-- These permissions are based on the production database structure

INSERT INTO permissions (id, name) VALUES
(1, 'access_pos'),
(2, 'access_menu'),
(3, 'access_happy_hour'),
(4, 'access_history'),
(5, 'access_settings'),
(6, 'access_compliance'),
(7, 'pos_access'),
(8, 'menu_management'),
(9, 'user_management'),
(10, 'legal_compliance'),
(11, 'audit_trail'),
(12, 'closure_bulletins')
ON CONFLICT (id) DO NOTHING;

-- Verify permissions were inserted
SELECT id, name FROM permissions ORDER BY id; 