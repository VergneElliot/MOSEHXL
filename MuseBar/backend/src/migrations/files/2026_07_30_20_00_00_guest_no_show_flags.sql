-- Guest no-show reliability flags (email / phone), platform-wide so any establishment can see them.

CREATE TABLE IF NOT EXISTS guest_no_show_flags (
  id SERIAL PRIMARY KEY,
  contact_type VARCHAR(8) NOT NULL
    CHECK (contact_type IN ('email', 'phone')),
  contact_value VARCHAR(255) NOT NULL,
  source_establishment_id UUID REFERENCES establishments(id) ON DELETE SET NULL,
  source_reservation_id INTEGER,
  flag_count INTEGER NOT NULL DEFAULT 1,
  first_flagged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_flagged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT guest_no_show_flags_contact_unique UNIQUE (contact_type, contact_value)
);

CREATE INDEX IF NOT EXISTS idx_guest_no_show_flags_value
  ON guest_no_show_flags (contact_type, contact_value);

COMMENT ON TABLE guest_no_show_flags IS
  'Permanent no-show flags by email or phone; visible to all establishments';

-- DOWN
-- DROP TABLE IF EXISTS guest_no_show_flags;
