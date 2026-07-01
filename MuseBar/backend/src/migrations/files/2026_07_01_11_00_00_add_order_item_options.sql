-- UP
-- Persist operational product option snapshots on completed order lines.

CREATE TABLE IF NOT EXISTS order_item_options (
  id SERIAL PRIMARY KEY,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES product_option_groups(id) ON DELETE SET NULL,
  group_name_snapshot VARCHAR(100) NOT NULL,
  choice_id INTEGER REFERENCES product_option_choices(id) ON DELETE SET NULL,
  choice_label_snapshot VARCHAR(100),
  free_text VARCHAR(120),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_item_options_order_item
  ON order_item_options(order_item_id, display_order, id);
CREATE INDEX IF NOT EXISTS idx_order_item_options_establishment
  ON order_item_options(establishment_id);

ALTER TABLE order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_options FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_item_options_tenant_select ON order_item_options;
DROP POLICY IF EXISTS order_item_options_tenant_write ON order_item_options;
CREATE POLICY order_item_options_tenant_select ON order_item_options
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY order_item_options_tenant_write ON order_item_options
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

-- DOWN
DROP POLICY IF EXISTS order_item_options_tenant_write ON order_item_options;
DROP POLICY IF EXISTS order_item_options_tenant_select ON order_item_options;
ALTER TABLE order_item_options NO FORCE ROW LEVEL SECURITY;
ALTER TABLE order_item_options DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_order_item_options_establishment;
DROP INDEX IF EXISTS idx_order_item_options_order_item;

DROP TABLE IF EXISTS order_item_options;

SELECT 1;
