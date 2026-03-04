-- UP
-- Create establishment status transitions table (audit and lifecycle for status changes)
CREATE TABLE IF NOT EXISTS establishment_status_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    reason TEXT,
    notes TEXT,
    approved_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_from_status CHECK (from_status IN ('pending_setup', 'setup_in_progress', 'active', 'suspended', 'cancelled')),
    CONSTRAINT valid_to_status CHECK (to_status IN ('pending_setup', 'setup_in_progress', 'active', 'suspended', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_status_transitions_establishment_id ON establishment_status_transitions(establishment_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_from_status ON establishment_status_transitions(from_status);
CREATE INDEX IF NOT EXISTS idx_status_transitions_to_status ON establishment_status_transitions(to_status);
CREATE INDEX IF NOT EXISTS idx_status_transitions_created_at ON establishment_status_transitions(created_at);
CREATE INDEX IF NOT EXISTS idx_status_transitions_approved_by ON establishment_status_transitions(approved_by);

COMMENT ON TABLE establishment_status_transitions IS 'Tracks all establishment status changes for audit and lifecycle management';
COMMENT ON COLUMN establishment_status_transitions.from_status IS 'Previous establishment status';
COMMENT ON COLUMN establishment_status_transitions.to_status IS 'New establishment status';
COMMENT ON COLUMN establishment_status_transitions.reason IS 'Reason for status change';
COMMENT ON COLUMN establishment_status_transitions.notes IS 'Additional notes about the transition';
COMMENT ON COLUMN establishment_status_transitions.approved_by IS 'User ID who approved the transition (if approval required)';

-- DOWN
DROP TABLE IF EXISTS establishment_status_transitions;
