-- UP
-- Operational kitchen ticket number per business day (resets at closure boundary).

CREATE TABLE IF NOT EXISTS kitchen_ticket_daily_sequences (
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  business_period_start TIMESTAMPTZ NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (establishment_id, business_period_start)
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS kitchen_ticket_day_number INTEGER,
  ADD COLUMN IF NOT EXISTS kitchen_ticket_day_period_start TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_kitchen_ticket_day
  ON orders(establishment_id, kitchen_ticket_day_period_start, kitchen_ticket_day_number)
  WHERE kitchen_ticket_day_number IS NOT NULL;

ALTER TABLE kitchen_ticket_daily_sequences ENABLE ROW LEVEL SECURITY;

ALTER TABLE kitchen_ticket_daily_sequences FORCE ROW LEVEL SECURITY;

CREATE POLICY kitchen_ticket_daily_sequences_tenant_select
  ON kitchen_ticket_daily_sequences
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

CREATE POLICY kitchen_ticket_daily_sequences_tenant_write
  ON kitchen_ticket_daily_sequences
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

-- DOWN
DROP POLICY IF EXISTS kitchen_ticket_daily_sequences_tenant_write ON kitchen_ticket_daily_sequences;
DROP POLICY IF EXISTS kitchen_ticket_daily_sequences_tenant_select ON kitchen_ticket_daily_sequences;
ALTER TABLE kitchen_ticket_daily_sequences NO FORCE ROW LEVEL SECURITY;
ALTER TABLE kitchen_ticket_daily_sequences DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS idx_orders_kitchen_ticket_day;

ALTER TABLE orders DROP COLUMN IF EXISTS kitchen_ticket_day_period_start;
ALTER TABLE orders DROP COLUMN IF EXISTS kitchen_ticket_day_number;

DROP TABLE IF EXISTS kitchen_ticket_daily_sequences;

SELECT 1;
