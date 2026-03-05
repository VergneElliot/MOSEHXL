-- UP
-- Add tips_total, change_total to closure_bulletins and allow WEEKLY closure type.
-- establishment_id was already added by 2026_02_26_02_00_00_add_establishment_id_to_closure_bulletins.sql

ALTER TABLE closure_bulletins
  ADD COLUMN IF NOT EXISTS tips_total DECIMAL(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change_total DECIMAL(12,4) NOT NULL DEFAULT 0;

ALTER TABLE closure_bulletins DROP CONSTRAINT IF EXISTS closure_bulletins_closure_type_check;
ALTER TABLE closure_bulletins ADD CONSTRAINT closure_bulletins_closure_type_check
  CHECK (closure_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'));

-- DOWN
ALTER TABLE closure_bulletins DROP CONSTRAINT IF EXISTS closure_bulletins_closure_type_check;
ALTER TABLE closure_bulletins ADD CONSTRAINT closure_bulletins_closure_type_check
  CHECK (closure_type IN ('DAILY', 'MONTHLY', 'ANNUAL'));

ALTER TABLE closure_bulletins
  DROP COLUMN IF EXISTS change_total,
  DROP COLUMN IF EXISTS tips_total;
