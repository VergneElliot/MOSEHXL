-- UP
-- Product option groups (menu parameters) and product assignments — Phase 1 kitchen/ordering prep.

CREATE TABLE IF NOT EXISTS product_option_groups (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  allow_free_text BOOLEAN NOT NULL DEFAULT FALSE,
  free_text_label VARCHAR(100),
  free_text_max_length INTEGER NOT NULL DEFAULT 120,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_option_groups_free_text_max_length_check
    CHECK (free_text_max_length >= 1 AND free_text_max_length <= 500)
);

CREATE TABLE IF NOT EXISTS product_option_choices (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES product_option_groups(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_option_group_products (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES product_option_groups(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_product_option_groups_establishment_active
  ON product_option_groups(establishment_id, is_active, display_order, name);
CREATE INDEX IF NOT EXISTS idx_product_option_choices_group_active
  ON product_option_choices(group_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_product_option_group_products_group
  ON product_option_group_products(group_id);
CREATE INDEX IF NOT EXISTS idx_product_option_group_products_product
  ON product_option_group_products(product_id);

ALTER TABLE product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_groups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_option_groups_tenant_select ON product_option_groups;
DROP POLICY IF EXISTS product_option_groups_tenant_write ON product_option_groups;
CREATE POLICY product_option_groups_tenant_select ON product_option_groups
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY product_option_groups_tenant_write ON product_option_groups
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE product_option_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_choices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_option_choices_tenant_select ON product_option_choices;
DROP POLICY IF EXISTS product_option_choices_tenant_write ON product_option_choices;
CREATE POLICY product_option_choices_tenant_select ON product_option_choices
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY product_option_choices_tenant_write ON product_option_choices
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE product_option_group_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_group_products FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_option_group_products_tenant_select ON product_option_group_products;
DROP POLICY IF EXISTS product_option_group_products_tenant_write ON product_option_group_products;
CREATE POLICY product_option_group_products_tenant_select ON product_option_group_products
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY product_option_group_products_tenant_write ON product_option_group_products
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

-- DOWN
DROP POLICY IF EXISTS product_option_group_products_tenant_write ON product_option_group_products;
DROP POLICY IF EXISTS product_option_group_products_tenant_select ON product_option_group_products;
ALTER TABLE product_option_group_products NO FORCE ROW LEVEL SECURITY;
ALTER TABLE product_option_group_products DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_option_choices_tenant_write ON product_option_choices;
DROP POLICY IF EXISTS product_option_choices_tenant_select ON product_option_choices;
ALTER TABLE product_option_choices NO FORCE ROW LEVEL SECURITY;
ALTER TABLE product_option_choices DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_option_groups_tenant_write ON product_option_groups;
DROP POLICY IF EXISTS product_option_groups_tenant_select ON product_option_groups;
ALTER TABLE product_option_groups NO FORCE ROW LEVEL SECURITY;
ALTER TABLE product_option_groups DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_product_option_group_products_product;
DROP INDEX IF EXISTS idx_product_option_group_products_group;
DROP INDEX IF EXISTS idx_product_option_choices_group_active;
DROP INDEX IF EXISTS idx_product_option_groups_establishment_active;

DROP TABLE IF EXISTS product_option_group_products;
DROP TABLE IF EXISTS product_option_choices;
DROP TABLE IF EXISTS product_option_groups;

SELECT 1;
