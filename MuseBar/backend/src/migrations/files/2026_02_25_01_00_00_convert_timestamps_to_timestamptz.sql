-- ============================================================
-- Migration: Convert all TIMESTAMP WITHOUT TIME ZONE to TIMESTAMPTZ
-- ============================================================
-- Why: TIMESTAMP WITHOUT TIME ZONE stores bare wall-clock values.
-- When PostgreSQL session timezone = 'Europe/Paris', JavaScript Date
-- objects (UTC) sent via pg get converted to Paris-local time on
-- INSERT. On read-back, pg creates a Date from the bare Paris-local
-- string, producing a different UTC value than the original — this
-- breaks the legal journal hash chain and the closure scheduler.
--
-- TIMESTAMPTZ stores in UTC internally. pg always round-trips dates
-- as their true UTC value, so hash computation is invariant to server
-- location, DST transitions, and timezone configuration.
--
-- The USING clause interprets existing stored values as Europe/Paris
-- local time (which is what they are, given the session timezone was
-- always set to Europe/Paris). For empty tables this is a no-op but
-- is included for correctness on any future rollback/replay scenario.
-- ============================================================

-- UP

ALTER TABLE archive_exports
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN period_start  TYPE TIMESTAMPTZ USING period_start  AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN period_end    TYPE TIMESTAMPTZ USING period_end    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN verified_at   TYPE TIMESTAMPTZ USING verified_at   AT TIME ZONE 'Europe/Paris';

ALTER TABLE audit_trail
  ALTER COLUMN timestamp     TYPE TIMESTAMPTZ USING timestamp     AT TIME ZONE 'Europe/Paris';

ALTER TABLE business_settings
  ALTER COLUMN updated_at    TYPE TIMESTAMPTZ USING updated_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE categories
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN updated_at    TYPE TIMESTAMPTZ USING updated_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE closure_bulletins
  ALTER COLUMN period_start  TYPE TIMESTAMPTZ USING period_start  AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN period_end    TYPE TIMESTAMPTZ USING period_end    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN closed_at     TYPE TIMESTAMPTZ USING closed_at     AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE closure_settings
  ALTER COLUMN updated_at    TYPE TIMESTAMPTZ USING updated_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE email_logs
  ALTER COLUMN sent_at       TYPE TIMESTAMPTZ USING sent_at       AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN delivered_at  TYPE TIMESTAMPTZ USING delivered_at  AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN opened_at     TYPE TIMESTAMPTZ USING opened_at     AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN clicked_at    TYPE TIMESTAMPTZ USING clicked_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE establishment_setup_progress
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN updated_at    TYPE TIMESTAMPTZ USING updated_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN started_at    TYPE TIMESTAMPTZ USING started_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN completed_at  TYPE TIMESTAMPTZ USING completed_at  AT TIME ZONE 'Europe/Paris';

ALTER TABLE establishment_setup_steps
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN updated_at    TYPE TIMESTAMPTZ USING updated_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN completed_at  TYPE TIMESTAMPTZ USING completed_at  AT TIME ZONE 'Europe/Paris';

ALTER TABLE establishment_status_transitions
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE establishments
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN updated_at    TYPE TIMESTAMPTZ USING updated_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE legal_journal
  ALTER COLUMN timestamp     TYPE TIMESTAMPTZ USING timestamp     AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE migrations
  ALTER COLUMN executed_at   TYPE TIMESTAMPTZ USING executed_at   AT TIME ZONE 'Europe/Paris';

ALTER TABLE order_items
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE orders
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN updated_at    TYPE TIMESTAMPTZ USING updated_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE password_reset_requests
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN expires_at    TYPE TIMESTAMPTZ USING expires_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN used_at       TYPE TIMESTAMPTZ USING used_at       AT TIME ZONE 'Europe/Paris';

ALTER TABLE products
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN updated_at    TYPE TIMESTAMPTZ USING updated_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE roles
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN updated_at    TYPE TIMESTAMPTZ USING updated_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE sub_bills
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE user_invitations
  ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN expires_at    TYPE TIMESTAMPTZ USING expires_at    AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN accepted_at   TYPE TIMESTAMPTZ USING accepted_at   AT TIME ZONE 'Europe/Paris';

ALTER TABLE user_role_assignments
  ALTER COLUMN assigned_at   TYPE TIMESTAMPTZ USING assigned_at   AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN expires_at    TYPE TIMESTAMPTZ USING expires_at    AT TIME ZONE 'Europe/Paris';

ALTER TABLE users
  ALTER COLUMN created_at           TYPE TIMESTAMPTZ USING created_at           AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN updated_at           TYPE TIMESTAMPTZ USING updated_at           AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN last_login           TYPE TIMESTAMPTZ USING last_login           AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN password_reset_expires TYPE TIMESTAMPTZ USING password_reset_expires AT TIME ZONE 'Europe/Paris',
  ALTER COLUMN invitation_expires   TYPE TIMESTAMPTZ USING invitation_expires   AT TIME ZONE 'Europe/Paris';

-- ============================================================
-- DOWN (revert to TIMESTAMP WITHOUT TIME ZONE)
-- Note: AT TIME ZONE 'Europe/Paris' converts TIMESTAMPTZ back to
-- Paris-local bare timestamp, preserving the wall-clock value.
-- ============================================================

-- ALTER TABLE archive_exports
--   ALTER COLUMN created_at   TYPE TIMESTAMP USING created_at   AT TIME ZONE 'Europe/Paris',
-- ... (mirror of UP, abbreviated for brevity)
