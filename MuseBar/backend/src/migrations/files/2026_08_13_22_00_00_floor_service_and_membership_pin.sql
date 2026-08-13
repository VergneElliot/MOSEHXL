-- UP
-- Floor service foundations: membership PIN (soft badge), floor plans, dining tables,
-- open tickets + items, manage_floor_plan permission, RLS.

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
INSERT INTO permissions (name) VALUES
  ('manage_floor_plan')
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_permissions (user_id, permission_id, establishment_id)
SELECT u.id, p.id, m.establishment_id
FROM users u
JOIN user_establishment_memberships m ON m.user_id = u.id AND m.is_active = TRUE
CROSS JOIN permissions p
WHERE m.role = 'establishment_admin'
  AND p.name = 'manage_floor_plan'
ON CONFLICT (user_id, permission_id, establishment_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Soft badge PIN on membership (per user × establishment)
-- ---------------------------------------------------------------------------
ALTER TABLE user_establishment_memberships
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS pin_failed_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_lockout_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pin_updated_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Floor plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS floor_plans (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_floor_plans_establishment
  ON floor_plans (establishment_id, display_order, id);

ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plans FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS floor_plans_tenant_select ON floor_plans;
DROP POLICY IF EXISTS floor_plans_tenant_write ON floor_plans;
CREATE POLICY floor_plans_tenant_select ON floor_plans
  FOR SELECT
  USING (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  );
CREATE POLICY floor_plans_tenant_write ON floor_plans
  FOR ALL
  USING (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  )
  WITH CHECK (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Dining tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dining_tables (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  floor_plan_id INTEGER NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  label VARCHAR(64) NOT NULL,
  pos_x NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pos_y NUMERIC(10, 2) NOT NULL DEFAULT 0,
  width NUMERIC(10, 2) NOT NULL DEFAULT 80,
  height NUMERIC(10, 2) NOT NULL DEFAULT 80,
  capacity INTEGER,
  shape VARCHAR(32) NOT NULL DEFAULT 'rectangle',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dining_tables_shape_check
    CHECK (shape IN ('rectangle', 'circle', 'square')),
  CONSTRAINT dining_tables_label_unique_per_plan
    UNIQUE (floor_plan_id, label)
);

CREATE INDEX IF NOT EXISTS idx_dining_tables_plan
  ON dining_tables (floor_plan_id, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_dining_tables_establishment
  ON dining_tables (establishment_id);

ALTER TABLE dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_tables FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dining_tables_tenant_select ON dining_tables;
DROP POLICY IF EXISTS dining_tables_tenant_write ON dining_tables;
CREATE POLICY dining_tables_tenant_select ON dining_tables
  FOR SELECT
  USING (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  );
CREATE POLICY dining_tables_tenant_write ON dining_tables
  FOR ALL
  USING (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  )
  WITH CHECK (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Open tickets (not fiscal until converted to orders)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS open_tickets (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  dining_table_id INTEGER NOT NULL REFERENCES dining_tables(id) ON DELETE RESTRICT,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  opened_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  last_served_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  covers INTEGER,
  notes TEXT,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMPTZ,
  CONSTRAINT open_tickets_status_check
    CHECK (status IN ('open', 'closed', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_open_tickets_one_open_per_table
  ON open_tickets (dining_table_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_open_tickets_establishment_status
  ON open_tickets (establishment_id, status, updated_at DESC);

ALTER TABLE open_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_tickets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS open_tickets_tenant_select ON open_tickets;
DROP POLICY IF EXISTS open_tickets_tenant_write ON open_tickets;
CREATE POLICY open_tickets_tenant_select ON open_tickets
  FOR SELECT
  USING (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  );
CREATE POLICY open_tickets_tenant_write ON open_tickets
  FOR ALL
  USING (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  )
  WITH CHECK (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Open ticket items (mutable; options JSONB for Phase A)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS open_ticket_items (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  open_ticket_id INTEGER NOT NULL REFERENCES open_tickets(id) ON DELETE CASCADE,
  product_id INTEGER,
  product_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_price NUMERIC(12, 4) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(8, 4) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 4) NOT NULL DEFAULT 0,
  happy_hour_applied BOOLEAN NOT NULL DEFAULT FALSE,
  happy_hour_discount_amount NUMERIC(12, 4) NOT NULL DEFAULT 0,
  is_manual_happy_hour BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL DEFAULT '',
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  kitchen_printer_ids_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  print_pickup_slip_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_open_ticket_items_ticket
  ON open_ticket_items (open_ticket_id, sort_order, id);

ALTER TABLE open_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_ticket_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS open_ticket_items_tenant_select ON open_ticket_items;
DROP POLICY IF EXISTS open_ticket_items_tenant_write ON open_ticket_items;
CREATE POLICY open_ticket_items_tenant_select ON open_ticket_items
  FOR SELECT
  USING (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  );
CREATE POLICY open_ticket_items_tenant_write ON open_ticket_items
  FOR ALL
  USING (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  )
  WITH CHECK (
    app_rls_bypass()
    OR (
      app_current_establishment_id() IS NOT NULL
      AND establishment_id = app_current_establishment_id()
    )
  );

-- DOWN
DROP POLICY IF EXISTS open_ticket_items_tenant_write ON open_ticket_items;
DROP POLICY IF EXISTS open_ticket_items_tenant_select ON open_ticket_items;
DROP TABLE IF EXISTS open_ticket_items;

DROP POLICY IF EXISTS open_tickets_tenant_write ON open_tickets;
DROP POLICY IF EXISTS open_tickets_tenant_select ON open_tickets;
DROP TABLE IF EXISTS open_tickets;

DROP POLICY IF EXISTS dining_tables_tenant_write ON dining_tables;
DROP POLICY IF EXISTS dining_tables_tenant_select ON dining_tables;
DROP TABLE IF EXISTS dining_tables;

DROP POLICY IF EXISTS floor_plans_tenant_write ON floor_plans;
DROP POLICY IF EXISTS floor_plans_tenant_select ON floor_plans;
DROP TABLE IF EXISTS floor_plans;

ALTER TABLE user_establishment_memberships
  DROP COLUMN IF EXISTS pin_updated_at,
  DROP COLUMN IF EXISTS pin_locked_until,
  DROP COLUMN IF EXISTS pin_lockout_count,
  DROP COLUMN IF EXISTS pin_failed_attempts,
  DROP COLUMN IF EXISTS pin_hash;

DELETE FROM user_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'manage_floor_plan');
DELETE FROM permissions WHERE name = 'manage_floor_plan';
