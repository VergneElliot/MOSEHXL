-- UP
-- Dual traceability: every traced action must name the account it was performed from AND the
-- PIN identity/session that performed it.
--
-- `staff_pin_sessions` is the server-side record of a badge opened on a terminal. The PIN actor
-- token carries its id as the `sid` claim, so an action can be attributed to one specific
-- badge-in rather than merely to a user.

CREATE TABLE IF NOT EXISTS staff_pin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  -- PIN identity: whose badge this is.
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Account the terminal was logged into when the badge was opened.
  opened_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  close_reason VARCHAR(32),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_staff_pin_sessions_active
  ON staff_pin_sessions (establishment_id, closed_at, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_pin_sessions_user
  ON staff_pin_sessions (establishment_id, user_id, opened_at DESC);

ALTER TABLE staff_pin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_pin_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_pin_sessions_tenant_select ON staff_pin_sessions;
DROP POLICY IF EXISTS staff_pin_sessions_tenant_write ON staff_pin_sessions;
CREATE POLICY staff_pin_sessions_tenant_select ON staff_pin_sessions
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY staff_pin_sessions_tenant_write ON staff_pin_sessions
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

-- Orders already snapshot the waiter (PIN identity). Record the account the sale was rung up
-- from and the badge session, so the pair is queryable.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS account_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pin_session_id UUID REFERENCES staff_pin_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_pin_session
  ON orders (establishment_id, pin_session_id)
  WHERE pin_session_id IS NOT NULL;

-- audit_trail.user_id stays the account; add the PIN identity next to it. The existing
-- session_id column now carries the PIN session id.
ALTER TABLE audit_trail
  ADD COLUMN IF NOT EXISTS pin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_trail_pin_session
  ON audit_trail (establishment_id, session_id)
  WHERE session_id IS NOT NULL;

-- DOWN
DROP INDEX IF EXISTS idx_audit_trail_pin_session;
ALTER TABLE audit_trail DROP COLUMN IF EXISTS pin_user_id;

DROP INDEX IF EXISTS idx_orders_pin_session;
ALTER TABLE orders
  DROP COLUMN IF EXISTS pin_session_id,
  DROP COLUMN IF EXISTS account_user_id;

DROP TABLE IF EXISTS staff_pin_sessions;
