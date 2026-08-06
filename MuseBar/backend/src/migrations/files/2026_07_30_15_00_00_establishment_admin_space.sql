-- UP
-- Establishment Admin Space foundation: slug, permissions, documents, inbox, reservations, staff shifts.

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
INSERT INTO permissions (name) VALUES
  ('access_documents'),
  ('access_inbox'),
  ('access_reservations'),
  ('access_planning')
ON CONFLICT (name) DO NOTHING;

-- Grant new admin-space permissions to existing establishment_admin users
INSERT INTO user_permissions (user_id, permission_id)
SELECT u.id, p.id
FROM users u
CROSS JOIN permissions p
WHERE u.role = 'establishment_admin'
  AND p.name IN ('access_documents', 'access_inbox', 'access_reservations', 'access_planning')
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Establishment slug (email local-part: slug@mosehxl.com)
-- ---------------------------------------------------------------------------
ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS slug VARCHAR(64);

ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS admin_inbox_autoforward BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS reservations_ics_token UUID;

ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS planning_ics_token UUID;

UPDATE establishments
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(
        COALESCE(NULLIF(TRIM(name), ''), 'etab'),
        'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ',
        'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC'
      ),
      '[^a-zA-Z0-9]+', '', 'g'
    ),
    '^[^a-zA-Z]+', '', 'g'
  )
)
WHERE slug IS NULL OR TRIM(slug) = '';

UPDATE establishments
SET slug = 'etab'
WHERE slug IS NULL OR TRIM(slug) = '' OR slug !~ '^[a-z]';

-- Disambiguate duplicate slugs
WITH ranked AS (
  SELECT id, slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at ASC NULLS LAST, id ASC) AS rn
  FROM establishments
)
UPDATE establishments e
SET slug = LEFT(r.slug, 48) || r.rn::text
FROM ranked r
WHERE e.id = r.id AND r.rn > 1;

UPDATE establishments
SET reservations_ics_token = COALESCE(reservations_ics_token, gen_random_uuid()),
    planning_ics_token = COALESCE(planning_ics_token, gen_random_uuid())
WHERE reservations_ics_token IS NULL OR planning_ics_token IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'establishments_slug_format_check'
  ) THEN
    ALTER TABLE establishments
      ADD CONSTRAINT establishments_slug_format_check
      CHECK (slug IS NULL OR slug ~ '^[a-z][a-z0-9]{0,63}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_establishments_slug_unique
  ON establishments (slug)
  WHERE slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_documents (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'autre',
  tags TEXT[] NOT NULL DEFAULT '{}',
  storage_key TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  expires_at DATE,
  source VARCHAR(32) NOT NULL DEFAULT 'manual',
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT admin_documents_source_check CHECK (source IN ('manual', 'email'))
);

CREATE INDEX IF NOT EXISTS idx_admin_documents_est_active
  ON admin_documents (establishment_id, deleted_at, category, expires_at);

CREATE TABLE IF NOT EXISTS admin_document_expiry_reminders (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  document_id INTEGER NOT NULL REFERENCES admin_documents(id) ON DELETE CASCADE,
  days_before INTEGER NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (document_id, days_before)
);

-- ---------------------------------------------------------------------------
-- Inbox
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inbox_messages (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  message_id VARCHAR(255),
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  text_body TEXT,
  html_body TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_est_received
  ON inbox_messages (establishment_id, is_archived, received_at DESC);

CREATE TABLE IF NOT EXISTS inbox_attachments (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  message_id INTEGER NOT NULL REFERENCES inbox_messages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_key TEXT NOT NULL,
  imported_document_id INTEGER REFERENCES admin_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inbox_attachments_message
  ON inbox_attachments (message_id);

-- ---------------------------------------------------------------------------
-- Reservations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  customer_name VARCHAR(200) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(64),
  party_size INTEGER NOT NULL DEFAULT 2,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status VARCHAR(32) NOT NULL DEFAULT 'requested',
  notes TEXT,
  source VARCHAR(32) NOT NULL DEFAULT 'manual',
  inbox_message_id INTEGER REFERENCES inbox_messages(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reservations_status_check
    CHECK (status IN ('requested', 'confirmed', 'cancelled', 'no_show', 'seated')),
  CONSTRAINT reservations_party_size_check CHECK (party_size > 0 AND party_size <= 200)
);

CREATE INDEX IF NOT EXISTS idx_reservations_est_starts
  ON reservations (establishment_id, starts_at);

-- ---------------------------------------------------------------------------
-- Staff planning
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_shifts (
  id SERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  label VARCHAR(120),
  note TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT staff_shifts_range_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_staff_shifts_est_starts
  ON staff_shifts (establishment_id, starts_at);

CREATE TABLE IF NOT EXISTS staff_planning_ics_tokens (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_planning_ics_tokens_token
  ON staff_planning_ics_tokens (token);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE admin_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_documents_tenant_select ON admin_documents;
DROP POLICY IF EXISTS admin_documents_tenant_write ON admin_documents;
CREATE POLICY admin_documents_tenant_select ON admin_documents
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY admin_documents_tenant_write ON admin_documents
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE admin_document_expiry_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_document_expiry_reminders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_document_expiry_reminders_tenant_select ON admin_document_expiry_reminders;
DROP POLICY IF EXISTS admin_document_expiry_reminders_tenant_write ON admin_document_expiry_reminders;
CREATE POLICY admin_document_expiry_reminders_tenant_select ON admin_document_expiry_reminders
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY admin_document_expiry_reminders_tenant_write ON admin_document_expiry_reminders
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inbox_messages_tenant_select ON inbox_messages;
DROP POLICY IF EXISTS inbox_messages_tenant_write ON inbox_messages;
CREATE POLICY inbox_messages_tenant_select ON inbox_messages
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY inbox_messages_tenant_write ON inbox_messages
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE inbox_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_attachments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inbox_attachments_tenant_select ON inbox_attachments;
DROP POLICY IF EXISTS inbox_attachments_tenant_write ON inbox_attachments;
CREATE POLICY inbox_attachments_tenant_select ON inbox_attachments
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY inbox_attachments_tenant_write ON inbox_attachments
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reservations_tenant_select ON reservations;
DROP POLICY IF EXISTS reservations_tenant_write ON reservations;
CREATE POLICY reservations_tenant_select ON reservations
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY reservations_tenant_write ON reservations
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_shifts_tenant_select ON staff_shifts;
DROP POLICY IF EXISTS staff_shifts_tenant_write ON staff_shifts;
CREATE POLICY staff_shifts_tenant_select ON staff_shifts
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY staff_shifts_tenant_write ON staff_shifts
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

ALTER TABLE staff_planning_ics_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_planning_ics_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_planning_ics_tokens_tenant_select ON staff_planning_ics_tokens;
DROP POLICY IF EXISTS staff_planning_ics_tokens_tenant_write ON staff_planning_ics_tokens;
CREATE POLICY staff_planning_ics_tokens_tenant_select ON staff_planning_ics_tokens
  FOR SELECT
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
CREATE POLICY staff_planning_ics_tokens_tenant_write ON staff_planning_ics_tokens
  FOR ALL
  USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
  WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

-- DOWN
DROP POLICY IF EXISTS staff_planning_ics_tokens_tenant_write ON staff_planning_ics_tokens;
DROP POLICY IF EXISTS staff_planning_ics_tokens_tenant_select ON staff_planning_ics_tokens;
ALTER TABLE staff_planning_ics_tokens NO FORCE ROW LEVEL SECURITY;
ALTER TABLE staff_planning_ics_tokens DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS staff_planning_ics_tokens;

DROP POLICY IF EXISTS staff_shifts_tenant_write ON staff_shifts;
DROP POLICY IF EXISTS staff_shifts_tenant_select ON staff_shifts;
ALTER TABLE staff_shifts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS staff_shifts;

DROP POLICY IF EXISTS reservations_tenant_write ON reservations;
DROP POLICY IF EXISTS reservations_tenant_select ON reservations;
ALTER TABLE reservations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS reservations;

DROP POLICY IF EXISTS inbox_attachments_tenant_write ON inbox_attachments;
DROP POLICY IF EXISTS inbox_attachments_tenant_select ON inbox_attachments;
ALTER TABLE inbox_attachments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE inbox_attachments DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS inbox_attachments;

DROP POLICY IF EXISTS inbox_messages_tenant_write ON inbox_messages;
DROP POLICY IF EXISTS inbox_messages_tenant_select ON inbox_messages;
ALTER TABLE inbox_messages NO FORCE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS inbox_messages;

DROP POLICY IF EXISTS admin_document_expiry_reminders_tenant_write ON admin_document_expiry_reminders;
DROP POLICY IF EXISTS admin_document_expiry_reminders_tenant_select ON admin_document_expiry_reminders;
ALTER TABLE admin_document_expiry_reminders NO FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_document_expiry_reminders DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS admin_document_expiry_reminders;

DROP POLICY IF EXISTS admin_documents_tenant_write ON admin_documents;
DROP POLICY IF EXISTS admin_documents_tenant_select ON admin_documents;
ALTER TABLE admin_documents NO FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_documents DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS admin_documents;

DROP INDEX IF EXISTS idx_establishments_slug_unique;
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_slug_format_check;
ALTER TABLE establishments DROP COLUMN IF EXISTS planning_ics_token;
ALTER TABLE establishments DROP COLUMN IF EXISTS reservations_ics_token;
ALTER TABLE establishments DROP COLUMN IF EXISTS admin_inbox_autoforward;
ALTER TABLE establishments DROP COLUMN IF EXISTS slug;

DELETE FROM permissions WHERE name IN (
  'access_documents', 'access_inbox', 'access_reservations', 'access_planning'
);
