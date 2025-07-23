-- Legal compliance tables for French fiscal requirements
-- These tables implement the ISCA pillars (Inaltérabilité, Sécurisation, Conservation, Archivage)

-- Append-only legal journal for transaction immutability
CREATE TABLE IF NOT EXISTS legal_journal (
    id SERIAL PRIMARY KEY,
    sequence_number INTEGER NOT NULL UNIQUE, -- Sequential numbering for legal compliance
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('SALE', 'REFUND', 'CORRECTION', 'CLOSURE', 'ARCHIVE')),
    order_id INTEGER REFERENCES orders(id), -- Link to business transaction
    amount DECIMAL(10,2) NOT NULL, -- Transaction amount
    vat_amount DECIMAL(10,2) NOT NULL, -- VAT amount
    payment_method VARCHAR(50) NOT NULL,
    transaction_data JSONB NOT NULL, -- Complete transaction details
    previous_hash VARCHAR(64) NOT NULL, -- Hash chain for integrity
    current_hash VARCHAR(64) NOT NULL UNIQUE, -- Current transaction hash
    timestamp TIMESTAMP NOT NULL, -- Transaction timestamp
    user_id VARCHAR(100), -- User who performed the transaction
    register_id VARCHAR(100) NOT NULL, -- Cash register identifier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Legal constraints
    CONSTRAINT sequence_positive CHECK (sequence_number >= 0)
    -- Removed amount constraints to allow negative amounts for refunds/cancellations
);

-- Closure bulletins for periodic data consolidation
CREATE TABLE IF NOT EXISTS closure_bulletins (
    id SERIAL PRIMARY KEY,
    closure_type VARCHAR(10) NOT NULL CHECK (closure_type IN ('DAILY', 'MONTHLY', 'ANNUAL')),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
    vat_breakdown JSONB NOT NULL, -- VAT totals by rate (10%, 20%)
    payment_methods_breakdown JSONB NOT NULL, -- Totals by payment method
    first_sequence INTEGER, -- First transaction sequence in period
    last_sequence INTEGER, -- Last transaction sequence in period
    closure_hash VARCHAR(64) NOT NULL, -- Closure integrity hash
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Legal constraints
    CONSTRAINT period_valid CHECK (period_end >= period_start),
    CONSTRAINT transactions_positive CHECK (total_transactions >= 0),
    CONSTRAINT sequence_order CHECK (last_sequence IS NULL OR first_sequence IS NULL OR last_sequence >= first_sequence)
    -- Removed amount constraints to allow negative adjustments
);

-- Audit trail for user actions (Sécurisation pillar)
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100), -- User identifier
    action_type VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, TRANSACTION, MODIFY, EXPORT, etc.
    resource_type VARCHAR(50), -- ORDER, PRODUCT, CATEGORY, SYSTEM, etc.
    resource_id VARCHAR(100), -- ID of affected resource
    action_details JSONB, -- Complete action details
    ip_address INET, -- User IP address
    user_agent TEXT, -- Browser/client information
    session_id VARCHAR(100), -- Session identifier
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Note: Indexes will be created separately below
);

-- Archive exports for long-term data preservation (Archivage pillar)
CREATE TABLE IF NOT EXISTS archive_exports (
    id SERIAL PRIMARY KEY,
    export_type VARCHAR(20) NOT NULL CHECK (export_type IN ('DAILY', 'MONTHLY', 'ANNUAL', 'FULL')),
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    file_path VARCHAR(500) NOT NULL, -- Path to exported file
    file_hash VARCHAR(64) NOT NULL, -- File integrity hash
    file_size BIGINT NOT NULL, -- File size in bytes
    format VARCHAR(20) NOT NULL CHECK (format IN ('CSV', 'XML', 'PDF', 'JSON')),
    digital_signature TEXT, -- Digital signature for authenticity
    export_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (export_status IN ('PENDING', 'COMPLETED', 'FAILED', 'VERIFIED')),
    created_by VARCHAR(100), -- User who created the export
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP, -- When the export was verified
    
    -- Legal constraints
    CONSTRAINT file_size_positive CHECK (file_size > 0),
    CONSTRAINT period_valid_archive CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start)
);

-- Indexes for performance and legal queries
CREATE INDEX IF NOT EXISTS idx_legal_journal_sequence ON legal_journal(sequence_number);
CREATE INDEX IF NOT EXISTS idx_legal_journal_timestamp ON legal_journal(timestamp);
CREATE INDEX IF NOT EXISTS idx_legal_journal_type ON legal_journal(transaction_type);
CREATE INDEX IF NOT EXISTS idx_legal_journal_order ON legal_journal(order_id);
CREATE INDEX IF NOT EXISTS idx_legal_journal_register ON legal_journal(register_id);

CREATE INDEX IF NOT EXISTS idx_closure_type_period ON closure_bulletins(closure_type, period_start);
CREATE INDEX IF NOT EXISTS idx_closure_closed ON closure_bulletins(is_closed, created_at);

CREATE INDEX IF NOT EXISTS idx_archive_type_period ON archive_exports(export_type, period_start);
CREATE INDEX IF NOT EXISTS idx_archive_status ON archive_exports(export_status, created_at);

-- Audit trail indexes
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_trail(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action_time ON audit_trail(action_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_trail(resource_type, resource_id);

-- Trigger to prevent modification of legal_journal (Inaltérabilité)
CREATE OR REPLACE FUNCTION prevent_legal_journal_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Modification of legal journal is forbidden for legal compliance (Article 286-I-3 bis du CGI)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON legal_journal;
CREATE TRIGGER trigger_prevent_legal_journal_modification
    BEFORE UPDATE OR DELETE ON legal_journal
    FOR EACH ROW
    EXECUTE FUNCTION prevent_legal_journal_modification();

-- Trigger to prevent modification of closed closure bulletins
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

-- Apply the trigger for closure bulletins
DROP TRIGGER IF EXISTS trigger_prevent_closed_bulletin_modification ON closure_bulletins;
CREATE TRIGGER trigger_prevent_closed_bulletin_modification
    BEFORE UPDATE OR DELETE ON closure_bulletins
    FOR EACH ROW
    EXECUTE FUNCTION prevent_closed_bulletin_modification();

-- Insert initial data integrity verification entry
INSERT INTO legal_journal (
    sequence_number, transaction_type, amount, vat_amount, payment_method,
    transaction_data, previous_hash, current_hash, timestamp, register_id
) VALUES (
    0, 'ARCHIVE', 0.00, 0.00, 'SYSTEM',
    '{"type": "SYSTEM_INIT", "message": "Legal journal initialized", "compliance": "Article 286-I-3 bis du CGI"}',
    '0000000000000000000000000000000000000000000000000000000000000000',
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', -- SHA-256 of "hello"
    CURRENT_TIMESTAMP,
    'MUSEBAR-REG-001'
) ON CONFLICT (sequence_number) DO NOTHING;

-- Grant appropriate permissions
GRANT SELECT ON legal_journal TO musebar_user;
GRANT INSERT ON legal_journal TO musebar_user;
-- Note: No UPDATE or DELETE permissions for legal compliance

GRANT ALL PRIVILEGES ON closure_bulletins TO musebar_user;
GRANT ALL PRIVILEGES ON audit_trail TO musebar_user;
GRANT ALL PRIVILEGES ON archive_exports TO musebar_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO musebar_user; 