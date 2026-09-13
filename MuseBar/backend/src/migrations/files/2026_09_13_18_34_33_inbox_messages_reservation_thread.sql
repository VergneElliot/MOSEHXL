-- UP
ALTER TABLE inbox_messages
  ADD COLUMN IF NOT EXISTS reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'outbound'));

CREATE INDEX IF NOT EXISTS idx_inbox_messages_reservation_id
  ON inbox_messages (establishment_id, reservation_id)
  WHERE reservation_id IS NOT NULL;

-- Backfill from reservations that point at a seed inbox row.
UPDATE inbox_messages im
SET reservation_id = r.id
FROM reservations r
WHERE r.inbox_message_id = im.id
  AND r.establishment_id = im.establishment_id
  AND im.reservation_id IS NULL;

-- SCHEMA_SNAPSHOT_NOT_REQUIRED

-- DOWN
DROP INDEX IF EXISTS idx_inbox_messages_reservation_id;
ALTER TABLE inbox_messages DROP COLUMN IF EXISTS direction;
ALTER TABLE inbox_messages DROP COLUMN IF EXISTS reservation_id;
