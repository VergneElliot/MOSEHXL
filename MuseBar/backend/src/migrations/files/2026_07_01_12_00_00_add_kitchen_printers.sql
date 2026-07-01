-- UP
-- Kitchen printers, product routing, and order line printer snapshots — Phase 3.

CREATE TABLE IF NOT EXISTS kitchen_printers (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(64) NOT NULL,
  connection_type VARCHAR(32) NOT NULL DEFAULT 'bridge',
  connection_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT kitchen_printers_connection_type_check
    CHECK (connection_type IN ('bridge', 'network_escpos')),
  CONSTRAINT kitchen_printers_slug_format_check
    CHECK (slug ~ '^[a-z][a-z0-9_]{0,63}$'),
  CONSTRAINT kitchen_printers_slug_unique UNIQUE (establishment_id, slug)
);

CREATE TABLE IF NOT EXISTS product_kitchen_printers (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kitchen_printer_id INTEGER NOT NULL REFERENCES kitchen_printers(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id, kitchen_printer_id)
);

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS kitchen_printer_ids_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_kitchen_printers_establishment_active
  ON kitchen_printers(establishment_id, is_active, display_order, name);
CREATE INDEX IF NOT EXISTS idx_product_kitchen_printers_printer
  ON product_kitchen_printers(kitchen_printer_id);
CREATE INDEX IF NOT EXISTS idx_product_kitchen_printers_product
  ON product_kitchen_printers(product_id);

ALTER TABLE kitchen_printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_printers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kitchen_printers_tenant_select ON kitchen_printers;
DROP POLICY IF EXISTS kitchen_printers_tenant_write ON kitchen_printers;
CREATE POLICY kitchen_printers_tenant_select ON kitchen_printers
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY kitchen_printers_tenant_write ON kitchen_printers
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE product_kitchen_printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_kitchen_printers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_kitchen_printers_tenant_select ON product_kitchen_printers;
DROP POLICY IF EXISTS product_kitchen_printers_tenant_write ON product_kitchen_printers;
CREATE POLICY product_kitchen_printers_tenant_select ON product_kitchen_printers
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY product_kitchen_printers_tenant_write ON product_kitchen_printers
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

-- DOWN
DROP POLICY IF EXISTS product_kitchen_printers_tenant_write ON product_kitchen_printers;
DROP POLICY IF EXISTS product_kitchen_printers_tenant_select ON product_kitchen_printers;
ALTER TABLE product_kitchen_printers NO FORCE ROW LEVEL SECURITY;
ALTER TABLE product_kitchen_printers DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kitchen_printers_tenant_write ON kitchen_printers;
DROP POLICY IF EXISTS kitchen_printers_tenant_select ON kitchen_printers;
ALTER TABLE kitchen_printers NO FORCE ROW LEVEL SECURITY;
ALTER TABLE kitchen_printers DISABLE ROW LEVEL SECURITY;

ALTER TABLE order_items DROP COLUMN IF EXISTS kitchen_printer_ids_snapshot;

DROP INDEX IF EXISTS idx_product_kitchen_printers_product;
DROP INDEX IF EXISTS idx_product_kitchen_printers_printer;
DROP INDEX IF EXISTS idx_kitchen_printers_establishment_active;

DROP TABLE IF EXISTS product_kitchen_printers;
DROP TABLE IF EXISTS kitchen_printers;

SELECT 1;
