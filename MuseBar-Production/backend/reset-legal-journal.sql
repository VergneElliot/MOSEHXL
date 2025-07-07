-- DEVELOPMENT ONLY: Reset Legal Journal for Clean State
-- ⚠️  NEVER run this in production - it would violate legal compliance!

-- Step 1: Clear existing legal journal entries
DELETE FROM legal_journal;

-- Step 2: Reset the sequence
ALTER SEQUENCE legal_journal_id_seq RESTART WITH 1;

-- Step 3: Insert clean initialization entry with proper hash
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
    register_id
) VALUES (
    1, 
    'ARCHIVE', 
    NULL,
    0.00, 
    0.00, 
    'SYSTEM',
    '{"type": "SYSTEM_INIT", "message": "Legal journal reset for development", "compliance": "Article 286-I-3 bis du CGI", "environment": "DEVELOPMENT"}',
    '0000000000000000000000000000000000000000000000000000000000000000',
    '7d4e1e1f2a6b8c9d5e3f4a8b7c6d9e2f1a5b8c7d6e9f2a3b8c5d7e9f1a2b5c8d',
    CURRENT_TIMESTAMP,
    'MUSEBAR-REG-001'
);

-- Step 4: Clear closure bulletins if any
DELETE FROM closure_bulletins;
ALTER SEQUENCE closure_bulletins_id_seq RESTART WITH 1;

-- Display success message
SELECT 'Legal journal has been reset successfully for development.' as status; 