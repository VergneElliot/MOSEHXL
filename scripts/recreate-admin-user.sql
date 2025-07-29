-- Script to recreate admin user with all permissions
-- This script will create the user elliot.vergne@gmail.com with admin privileges
-- and grant all available permissions

-- First, let's check if the user already exists and delete it if so
DELETE FROM user_permissions WHERE user_id IN (SELECT id FROM users WHERE email = 'elliot.vergne@gmail.com');
DELETE FROM users WHERE email = 'elliot.vergne@gmail.com';

-- Create the user with admin privileges
INSERT INTO users (email, password_hash, is_admin, created_at) 
VALUES (
    'elliot.vergne@gmail.com',
    '$2b$12$5mAJ5bPkIWDS5yOplk8tIeoSve1P8SpU9hYozdDB5C/Hnn1JUM4VK', -- This is the hash for "Vergemolle22@"
    true,
    CURRENT_TIMESTAMP
);

-- Get the user ID
DO $$
DECLARE
    user_id INTEGER;
BEGIN
    SELECT id INTO user_id FROM users WHERE email = 'elliot.vergne@gmail.com';
    
    -- Grant all available permissions to the user
    INSERT INTO user_permissions (user_id, permission_id)
    SELECT user_id, id FROM permissions;
    
    RAISE NOTICE 'User created with ID: % and granted all permissions', user_id;
END $$;

-- Verify the user was created successfully
SELECT 
    u.id,
    u.email,
    u.is_admin,
    u.created_at,
    array_agg(p.name) as permissions
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
LEFT JOIN permissions p ON up.permission_id = p.id
WHERE u.email = 'elliot.vergne@gmail.com'
GROUP BY u.id, u.email, u.is_admin, u.created_at; 