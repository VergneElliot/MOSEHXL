-- Clean Database for Multi-Tenant System
-- This script will clean all business data and keep only the system administrator

-- Start transaction
BEGIN;

-- Clean up all business-related data
-- Remove all orders and order items
DELETE FROM order_items;
DELETE FROM orders;

-- Remove all products and categories
DELETE FROM products;
DELETE FROM categories;

-- Remove all audit trails (except system admin actions)
DELETE FROM audit_trail WHERE user_id NOT IN (SELECT CAST(id AS VARCHAR) FROM users WHERE role = 'system_admin');

-- Remove all establishments (we'll recreate them properly)
DELETE FROM establishments;

-- Remove all user invitations
DELETE FROM user_invitations;

-- Remove all email logs
DELETE FROM email_logs;

-- Remove all password reset requests
DELETE FROM password_reset_requests;

-- Remove all user role assignments (except system admin)
DELETE FROM user_role_assignments WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'system_admin');

-- Remove all user permissions (except system admin)
DELETE FROM user_permissions WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'system_admin');

-- Remove all users except system admin
DELETE FROM users WHERE role != 'system_admin';

-- Reset sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE categories_id_seq RESTART WITH 1;

-- Verify system admin still exists
SELECT 
    id, 
    email, 
    is_admin, 
    role, 
    created_at 
FROM users 
WHERE role = 'system_admin';

-- Commit transaction
COMMIT;

-- Display final state
SELECT 'Database cleaned successfully. Only system admin remains.' as status; 