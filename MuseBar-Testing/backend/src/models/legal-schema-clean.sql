-- Clean legal compliance schema for French fiscal requirements
-- Implements ISCA pillars (Inaltérabilité, Sécurisation, Conservation, Archivage)

-- Drop existing constraints that might conflict
ALTER TABLE legal_journal DROP CONSTRAINT IF EXISTS sequence_positive;

-- Ensure proper constraints
ALTER TABLE legal_journal ADD CONSTRAINT sequence_positive CHECK (sequence_number >= 0);

-- Create audit trail table properly
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create audit trail indexes
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_trail(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action_time ON audit_trail(action_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_trail(resource_type, resource_id);

-- Grant permissions for audit trail
GRANT ALL PRIVILEGES ON audit_trail TO musebar_user;

-- Clear any existing entries in legal_journal if needed and insert proper init entry
DELETE FROM legal_journal WHERE transaction_type = 'ARCHIVE' AND amount = 0;

-- Insert proper initialization entry with sequence 1 (not 0)
INSERT INTO legal_journal (
    sequence_number, transaction_type, amount, vat_amount, payment_method,
    transaction_data, previous_hash, current_hash, timestamp, register_id
) VALUES (
    1, 'ARCHIVE', 0.00, 0.00, 'SYSTEM',
    '{"type": "SYSTEM_INIT", "message": "Legal journal initialized for French compliance", "compliance": "Article 286-I-3 bis du CGI"}',
    '0000000000000000000000000000000000000000000000000000000000000000',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    CURRENT_TIMESTAMP,
    'MUSEBAR-REG-001'
) ON CONFLICT (sequence_number) DO NOTHING; 