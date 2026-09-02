-- UP
-- Staff leave requests (congés) + annual entitlements for French labor tracking.

CREATE TABLE IF NOT EXISTS staff_leave_requests (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(32) NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  half_day_start BOOLEAN NOT NULL DEFAULT FALSE,
  half_day_end BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  note TEXT,
  review_note TEXT,
  requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT staff_leave_range_check CHECK (ends_on >= starts_on),
  CONSTRAINT staff_leave_type_check CHECK (
    leave_type IN ('paid_leave', 'rtt', 'sick_leave', 'unpaid_leave', 'family_event', 'other')
  ),
  CONSTRAINT staff_leave_status_check CHECK (
    status IN ('pending', 'approved', 'rejected', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_staff_leave_est_dates
  ON staff_leave_requests (establishment_id, starts_on, ends_on);

CREATE INDEX IF NOT EXISTS idx_staff_leave_user_status
  ON staff_leave_requests (establishment_id, user_id, status);

CREATE TABLE IF NOT EXISTS staff_leave_entitlements (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  paid_leave_days NUMERIC(5, 2) NOT NULL DEFAULT 25,
  rtt_days NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT staff_leave_entitlements_year_check CHECK (year >= 2000 AND year <= 2100),
  UNIQUE (establishment_id, user_id, year)
);

ALTER TABLE staff_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_leave_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_leave_requests_tenant_select ON staff_leave_requests;
DROP POLICY IF EXISTS staff_leave_requests_tenant_write ON staff_leave_requests;
CREATE POLICY staff_leave_requests_tenant_select ON staff_leave_requests
  FOR SELECT USING (establishment_id = current_setting('app.establishment_id', true)::uuid);
CREATE POLICY staff_leave_requests_tenant_write ON staff_leave_requests
  FOR ALL USING (establishment_id = current_setting('app.establishment_id', true)::uuid)
  WITH CHECK (establishment_id = current_setting('app.establishment_id', true)::uuid);

ALTER TABLE staff_leave_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_leave_entitlements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_leave_entitlements_tenant_select ON staff_leave_entitlements;
DROP POLICY IF EXISTS staff_leave_entitlements_tenant_write ON staff_leave_entitlements;
CREATE POLICY staff_leave_entitlements_tenant_select ON staff_leave_entitlements
  FOR SELECT USING (establishment_id = current_setting('app.establishment_id', true)::uuid);
CREATE POLICY staff_leave_entitlements_tenant_write ON staff_leave_entitlements
  FOR ALL USING (establishment_id = current_setting('app.establishment_id', true)::uuid)
  WITH CHECK (establishment_id = current_setting('app.establishment_id', true)::uuid);

-- DOWN
DROP POLICY IF EXISTS staff_leave_entitlements_tenant_write ON staff_leave_entitlements;
DROP POLICY IF EXISTS staff_leave_entitlements_tenant_select ON staff_leave_entitlements;
ALTER TABLE staff_leave_entitlements NO FORCE ROW LEVEL SECURITY;
ALTER TABLE staff_leave_entitlements DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS staff_leave_entitlements;

DROP POLICY IF EXISTS staff_leave_requests_tenant_write ON staff_leave_requests;
DROP POLICY IF EXISTS staff_leave_requests_tenant_select ON staff_leave_requests;
ALTER TABLE staff_leave_requests NO FORCE ROW LEVEL SECURITY;
ALTER TABLE staff_leave_requests DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS staff_leave_requests;
