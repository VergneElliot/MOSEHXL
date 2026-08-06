-- Reservation status workflow (on_hold / refused + status_reason) and opening_hours settings key note.
-- Opening hours live in establishment_settings (key 'opening_hours'); no dedicated table.

-- ---------------------------------------------------------------------------
-- UP
-- ---------------------------------------------------------------------------

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS status_reason TEXT;

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN (
    'requested',
    'on_hold',
    'confirmed',
    'refused',
    'cancelled',
    'no_show',
    'seated'
  ));

COMMENT ON COLUMN reservations.status_reason IS
  'Motif for on_hold / refused / optional cancel note';

-- ---------------------------------------------------------------------------
-- DOWN
-- ---------------------------------------------------------------------------
-- ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
-- UPDATE reservations SET status = 'cancelled' WHERE status IN ('on_hold', 'refused');
-- ALTER TABLE reservations
--   ADD CONSTRAINT reservations_status_check
--   CHECK (status IN ('requested', 'confirmed', 'cancelled', 'no_show', 'seated'));
-- ALTER TABLE reservations DROP COLUMN IF EXISTS status_reason;
