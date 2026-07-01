-- UP
-- Per-product opt-in for customer pickup number slips at payment.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS print_pickup_slip BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS print_pickup_slip_snapshot BOOLEAN NOT NULL DEFAULT FALSE;

-- DOWN
ALTER TABLE order_items DROP COLUMN IF EXISTS print_pickup_slip_snapshot;
ALTER TABLE products DROP COLUMN IF EXISTS print_pickup_slip;

SELECT 1;
