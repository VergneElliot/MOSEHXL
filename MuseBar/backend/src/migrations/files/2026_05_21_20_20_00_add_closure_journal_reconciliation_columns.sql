-- UP
-- P3-L8: reconcile closure bulletin totals against legal journal SALE sums.

ALTER TABLE closure_bulletins
  ADD COLUMN IF NOT EXISTS journal_sales_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE closure_bulletins
  ADD COLUMN IF NOT EXISTS journal_sales_amount DECIMAL(12,4) NOT NULL DEFAULT 0;

ALTER TABLE closure_bulletins
  ADD COLUMN IF NOT EXISTS journal_sales_vat DECIMAL(12,4) NOT NULL DEFAULT 0;

ALTER TABLE closure_bulletins
  ADD COLUMN IF NOT EXISTS reconciliation_ok BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE closure_bulletins
  ADD COLUMN IF NOT EXISTS reconciliation_details JSONB NOT NULL DEFAULT '{}'::jsonb;

-- DOWN
ALTER TABLE closure_bulletins
  DROP COLUMN IF EXISTS reconciliation_details;

ALTER TABLE closure_bulletins
  DROP COLUMN IF EXISTS reconciliation_ok;

ALTER TABLE closure_bulletins
  DROP COLUMN IF EXISTS journal_sales_vat;

ALTER TABLE closure_bulletins
  DROP COLUMN IF EXISTS journal_sales_amount;

ALTER TABLE closure_bulletins
  DROP COLUMN IF EXISTS journal_sales_count;
