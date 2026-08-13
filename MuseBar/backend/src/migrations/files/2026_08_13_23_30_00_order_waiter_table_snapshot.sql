-- UP
-- Phase C: snapshot waiter + table on paid orders for History / reports.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS waiter_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS waiter_display_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS table_label VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_orders_establishment_waiter
  ON orders (establishment_id, waiter_user_id, created_at DESC)
  WHERE waiter_user_id IS NOT NULL;

-- DOWN
DROP INDEX IF EXISTS idx_orders_establishment_waiter;
ALTER TABLE orders
  DROP COLUMN IF EXISTS table_label,
  DROP COLUMN IF EXISTS waiter_display_name,
  DROP COLUMN IF EXISTS waiter_user_id;
