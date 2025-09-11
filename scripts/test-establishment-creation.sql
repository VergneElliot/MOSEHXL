-- Test establishment creation step by step
-- This will help us identify exactly where the UUID to integer conversion error occurs

-- Step 1: Test basic establishment creation
INSERT INTO establishments (
    id, name, email, phone, address, schema_name,
    subscription_plan, subscription_status, status,
    business_type, timezone, language
) VALUES (
    gen_random_uuid(),
    'Test Restaurant',
    'test@restaurant.com',
    '0123456789',
    '123 Test Street',
    'test_schema_123',
    'basic',
    'active',
    'pending_setup',
    'restaurant',
    'Europe/Paris',
    'fr'
) RETURNING id, name, email;

-- Step 2: Test audit trail creation
INSERT INTO audit_trail (
    establishment_id, user_id, action, details, ip_address, user_agent
) VALUES (
    (SELECT id FROM establishments WHERE name = 'Test Restaurant' LIMIT 1),
    '3',
    'establishment_created',
    '{"test": "data"}',
    '127.0.0.1',
    'test-agent'
) RETURNING id, establishment_id, user_id, action;

-- Step 3: Test user invitation creation
INSERT INTO user_invitations (
    id, email, establishment_id, inviter_user_id, inviter_name,
    establishment_name, role, invitation_token, expires_at, status
) VALUES (
    gen_random_uuid(),
    'owner@restaurant.com',
    (SELECT id FROM establishments WHERE name = 'Test Restaurant' LIMIT 1),
    '3',
    'System Admin',
    'Test Restaurant',
    'establishment_admin',
    gen_random_uuid(),
    NOW() + INTERVAL '7 days',
    'pending'
) RETURNING id, email, establishment_id;

-- Clean up test data
DELETE FROM user_invitations WHERE establishment_name = 'Test Restaurant';
DELETE FROM audit_trail WHERE establishment_id = (SELECT id FROM establishments WHERE name = 'Test Restaurant');
DELETE FROM establishments WHERE name = 'Test Restaurant';

SELECT 'Test completed successfully' as status;
