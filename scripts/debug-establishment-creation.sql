-- Enable detailed error messages
SET client_min_messages TO DEBUG1;

-- Test each step of establishment creation process
DO $$
DECLARE
    test_establishment_id UUID;
    test_user_id VARCHAR;
BEGIN
    -- Step 1: Create test establishment
    test_establishment_id := gen_random_uuid();
    test_user_id := '3';
    
    RAISE NOTICE 'Creating establishment with ID: %', test_establishment_id;
    
    INSERT INTO establishments (
        id, name, email, phone, address, schema_name,
        subscription_plan, subscription_status, status,
        business_type, timezone, language
    ) VALUES (
        test_establishment_id,
        'Debug Test Restaurant',
        'debug@test.com',
        '0123456789',
        '123 Debug Street',
        'debug_schema_123',
        'basic',
        'active',
        'pending_setup',
        'restaurant',
        'Europe/Paris',
        'fr'
    );
    
    RAISE NOTICE 'Establishment created successfully';
    
    -- Step 2: Create setup progress
    RAISE NOTICE 'Creating setup progress...';
    INSERT INTO establishment_setup_progress (
        establishment_id,
        current_step,
        progress_percentage
    ) VALUES (
        test_establishment_id,
        'business_info',
        0
    );
    
    RAISE NOTICE 'Setup progress created successfully';
    
    -- Step 3: Create audit trail
    RAISE NOTICE 'Creating audit trail...';
    INSERT INTO audit_trail (
        establishment_id,
        user_id,
        action_type,
        action,
        details,
        ip_address,
        user_agent
    ) VALUES (
        test_establishment_id,
        test_user_id,
        'establishment_created',
        'establishment_created',
        '{"test": "debug"}',
        '127.0.0.1',
        'debug-test'
    );
    
    RAISE NOTICE 'Audit trail created successfully';
    
    -- Step 4: Create user invitation
    RAISE NOTICE 'Creating user invitation...';
    INSERT INTO user_invitations (
        id,
        email,
        establishment_id,
        inviter_user_id,
        inviter_name,
        establishment_name,
        role,
        invitation_token,
        expires_at,
        status
    ) VALUES (
        gen_random_uuid(),
        'debug@owner.com',
        test_establishment_id,
        test_user_id,
        'System Admin',
        'Debug Test Restaurant',
        'establishment_admin',
        gen_random_uuid()::text,
        NOW() + INTERVAL '7 days',
        'pending'
    );
    
    RAISE NOTICE 'User invitation created successfully';
    
    -- Clean up
    DELETE FROM user_invitations WHERE establishment_id = test_establishment_id;
    DELETE FROM audit_trail WHERE establishment_id = test_establishment_id;
    DELETE FROM establishment_setup_progress WHERE establishment_id = test_establishment_id;
    DELETE FROM establishments WHERE id = test_establishment_id;
    
    RAISE NOTICE 'All steps completed successfully - cleanup done';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        RAISE NOTICE 'Error detail: %', SQLSTATE;
        -- Clean up on error
        DELETE FROM user_invitations WHERE establishment_id = test_establishment_id;
        DELETE FROM audit_trail WHERE establishment_id = test_establishment_id;
        DELETE FROM establishment_setup_progress WHERE establishment_id = test_establishment_id;
        DELETE FROM establishments WHERE id = test_establishment_id;
        RAISE;
END $$;
