-- UP
-- Allow one invoice per order (whole sale) and one per split payment part.
ALTER TABLE legal_invoices
  ADD COLUMN IF NOT EXISTS sub_bill_id BIGINT NULL REFERENCES sub_bills(id) ON DELETE RESTRICT;

ALTER TABLE legal_invoices
  DROP CONSTRAINT IF EXISTS legal_invoices_establishment_id_order_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS legal_invoices_one_per_order_whole
  ON legal_invoices (establishment_id, order_id)
  WHERE sub_bill_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS legal_invoices_one_per_order_part
  ON legal_invoices (establishment_id, order_id, sub_bill_id)
  WHERE sub_bill_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legal_invoices_sub_bill_id
  ON legal_invoices (sub_bill_id)
  WHERE sub_bill_id IS NOT NULL;

-- SCHEMA_SNAPSHOT_NOT_REQUIRED
-- legal_invoices lives outside legal-schema/multi-tenant snapshots used by drift check.

-- DOWN
DROP INDEX IF EXISTS idx_legal_invoices_sub_bill_id;
DROP INDEX IF EXISTS legal_invoices_one_per_order_part;
DROP INDEX IF EXISTS legal_invoices_one_per_order_whole;

ALTER TABLE legal_invoices
  ADD CONSTRAINT legal_invoices_establishment_id_order_id_key UNIQUE (establishment_id, order_id);

ALTER TABLE legal_invoices
  DROP COLUMN IF EXISTS sub_bill_id;
