-- UP
-- Staff shifts: recurrence series + employee approval workflow foundation.

ALTER TABLE staff_shifts
  ADD COLUMN IF NOT EXISTS series_id UUID;

ALTER TABLE staff_shifts
  ADD COLUMN IF NOT EXISTS recurrence VARCHAR(16) NOT NULL DEFAULT 'once';

ALTER TABLE staff_shifts
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(32) NOT NULL DEFAULT 'confirmed';

ALTER TABLE staff_shifts
  ADD COLUMN IF NOT EXISTS confirmation_token UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_shifts_recurrence_check'
  ) THEN
    ALTER TABLE staff_shifts
      ADD CONSTRAINT staff_shifts_recurrence_check
      CHECK (recurrence IN ('once', 'daily', 'weekly', 'monthly', 'yearly'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_shifts_approval_status_check'
  ) THEN
    ALTER TABLE staff_shifts
      ADD CONSTRAINT staff_shifts_approval_status_check
      CHECK (approval_status IN ('pending_employee', 'confirmed', 'declined', 'pending_admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_shifts_series
  ON staff_shifts (establishment_id, series_id)
  WHERE series_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_shifts_confirmation_token
  ON staff_shifts (confirmation_token)
  WHERE confirmation_token IS NOT NULL;

-- DOWN
DROP INDEX IF EXISTS idx_staff_shifts_confirmation_token;
DROP INDEX IF EXISTS idx_staff_shifts_series;
ALTER TABLE staff_shifts DROP CONSTRAINT IF EXISTS staff_shifts_approval_status_check;
ALTER TABLE staff_shifts DROP CONSTRAINT IF EXISTS staff_shifts_recurrence_check;
ALTER TABLE staff_shifts DROP COLUMN IF EXISTS confirmation_token;
ALTER TABLE staff_shifts DROP COLUMN IF EXISTS approval_status;
ALTER TABLE staff_shifts DROP COLUMN IF EXISTS recurrence;
ALTER TABLE staff_shifts DROP COLUMN IF EXISTS series_id;
