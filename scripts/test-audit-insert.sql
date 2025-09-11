-- Test audit trail insertion to isolate the UUID to integer conversion error

-- Test 1: Insert with correct data types
INSERT INTO audit_trail (
  establishment_id, user_id, action_type, action, details, ip_address, user_agent
) VALUES (
  '797ed412-3ffb-4003-9009-570bd53f92c0'::uuid,  -- establishment_id (UUID)
  '3',                                           -- user_id (string representing integer)
  'establishment_created',                       -- action_type
  'establishment_created',                       -- action
  '{"test": "data"}'::jsonb,                     -- details
  '127.0.0.1'::inet,                            -- ip_address
  'test-agent'                                  -- user_agent
);

-- Test 2: Check what was inserted
SELECT * FROM audit_trail ORDER BY created_at DESC LIMIT 1;

-- Test 3: Try to insert with wrong data types to reproduce the error
-- This should fail with UUID to integer conversion error
INSERT INTO audit_trail (
  establishment_id, user_id, action_type, action, details, ip_address, user_agent
) VALUES (
  '797ed412-3ffb-4003-9009-570bd53f92c0'::uuid,  -- establishment_id (UUID)
  '797ed412-3ffb-4003-9009-570bd53f92c0'::uuid,  -- user_id (UUID - this should cause the error)
  'establishment_created',                       -- action_type
  'establishment_created',                       -- action
  '{"test": "data"}'::jsonb,                     -- details
  '127.0.0.1'::inet,                            -- ip_address
  'test-agent'                                  -- user_agent
);
