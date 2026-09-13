-- UP
ALTER TABLE open_ticket_items
  ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ;

-- Clear auto-« kitchen sent » stamped at validate so Validé ≠ Envoyé.
-- Before this change, validate always wrote kitchen_sent_at; no real « Envoyé » existed.
UPDATE open_ticket_items
SET kitchen_sent_at = NULL
WHERE line_status = 'validated'
  AND kitchen_sent_at IS NOT NULL
  AND served_at IS NULL;

-- SCHEMA_SNAPSHOT_NOT_REQUIRED

-- DOWN
ALTER TABLE open_ticket_items DROP COLUMN IF EXISTS served_at;
