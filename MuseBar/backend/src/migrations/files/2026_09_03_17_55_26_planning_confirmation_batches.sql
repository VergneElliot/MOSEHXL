-- UP
-- Batch confirmation for planning edits (one token / email per employee per save).

CREATE TABLE IF NOT EXISTS staff_shift_confirmation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shift_confirm_batches_est_user
  ON staff_shift_confirmation_batches (establishment_id, user_id);

CREATE TABLE IF NOT EXISTS staff_shift_confirmation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES staff_shift_confirmation_batches(id) ON DELETE CASCADE,
  shift_id INTEGER REFERENCES staff_shifts(id) ON DELETE SET NULL,
  change_type VARCHAR(16) NOT NULL
    CHECK (change_type IN ('create', 'update', 'delete')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  label TEXT,
  previous_starts_at TIMESTAMPTZ,
  previous_ends_at TIMESTAMPTZ,
  previous_label TEXT,
  decision VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (decision IN ('pending', 'confirmed', 'declined')),
  decline_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shift_confirm_items_batch
  ON staff_shift_confirmation_items (batch_id);

ALTER TABLE staff_shifts
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

ALTER TABLE staff_shift_confirmation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shift_confirmation_batches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shift_confirm_batches_tenant_select ON staff_shift_confirmation_batches;
DROP POLICY IF EXISTS shift_confirm_batches_tenant_write ON staff_shift_confirmation_batches;
CREATE POLICY shift_confirm_batches_tenant_select ON staff_shift_confirmation_batches
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY shift_confirm_batches_tenant_write ON staff_shift_confirmation_batches
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE staff_shift_confirmation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shift_confirmation_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shift_confirm_items_tenant_select ON staff_shift_confirmation_items;
DROP POLICY IF EXISTS shift_confirm_items_tenant_write ON staff_shift_confirmation_items;
CREATE POLICY shift_confirm_items_tenant_select ON staff_shift_confirmation_items
  FOR SELECT
  USING (
    app_rls_bypass() OR EXISTS (
      SELECT 1 FROM staff_shift_confirmation_batches b
      WHERE b.id = staff_shift_confirmation_items.batch_id
        AND app_current_establishment_id() IS NOT NULL
        AND b.establishment_id = app_current_establishment_id()
    )
  );
CREATE POLICY shift_confirm_items_tenant_write ON staff_shift_confirmation_items
  FOR ALL
  USING (
    app_rls_bypass() OR EXISTS (
      SELECT 1 FROM staff_shift_confirmation_batches b
      WHERE b.id = staff_shift_confirmation_items.batch_id
        AND app_current_establishment_id() IS NOT NULL
        AND b.establishment_id = app_current_establishment_id()
    )
  )
  WITH CHECK (
    app_rls_bypass() OR EXISTS (
      SELECT 1 FROM staff_shift_confirmation_batches b
      WHERE b.id = staff_shift_confirmation_items.batch_id
        AND app_current_establishment_id() IS NOT NULL
        AND b.establishment_id = app_current_establishment_id()
    )
  );

-- DOWN
DROP POLICY IF EXISTS shift_confirm_items_tenant_write ON staff_shift_confirmation_items;
DROP POLICY IF EXISTS shift_confirm_items_tenant_select ON staff_shift_confirmation_items;
ALTER TABLE staff_shift_confirmation_items NO FORCE ROW LEVEL SECURITY;
ALTER TABLE staff_shift_confirmation_items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shift_confirm_batches_tenant_write ON staff_shift_confirmation_batches;
DROP POLICY IF EXISTS shift_confirm_batches_tenant_select ON staff_shift_confirmation_batches;
ALTER TABLE staff_shift_confirmation_batches NO FORCE ROW LEVEL SECURITY;
ALTER TABLE staff_shift_confirmation_batches DISABLE ROW LEVEL SECURITY;

ALTER TABLE staff_shifts DROP COLUMN IF EXISTS decline_reason;

DROP TABLE IF EXISTS staff_shift_confirmation_items;
DROP TABLE IF EXISTS staff_shift_confirmation_batches;
