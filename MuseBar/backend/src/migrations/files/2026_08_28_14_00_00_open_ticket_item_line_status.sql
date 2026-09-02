-- UP
-- Table ticket lines: draft (cart) vs validated (sent to kitchen) vs cancelled (retour).

ALTER TABLE open_ticket_items
  ADD COLUMN IF NOT EXISTS line_status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (line_status IN ('draft', 'validated', 'cancelled')),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kitchen_sent_at TIMESTAMPTZ;

-- Existing lines on open tickets were already committed to the table.
UPDATE open_ticket_items oti
SET
  line_status = 'validated',
  validated_at = COALESCE(oti.created_at, CURRENT_TIMESTAMP),
  kitchen_sent_at = COALESCE(oti.created_at, CURRENT_TIMESTAMP)
WHERE oti.line_status = 'draft'
  AND EXISTS (
    SELECT 1 FROM open_tickets ot
    WHERE ot.id = oti.open_ticket_id AND ot.status = 'open'
  );

CREATE INDEX IF NOT EXISTS idx_open_ticket_items_line_status
  ON open_ticket_items (open_ticket_id, line_status);

-- DOWN
DROP INDEX IF EXISTS idx_open_ticket_items_line_status;
ALTER TABLE open_ticket_items DROP COLUMN IF EXISTS kitchen_sent_at;
ALTER TABLE open_ticket_items DROP COLUMN IF EXISTS validated_at;
ALTER TABLE open_ticket_items DROP COLUMN IF EXISTS line_status;
