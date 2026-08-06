-- UP
-- Multi-establishment memberships: one login account, role+permissions per venue.

-- ---------------------------------------------------------------------------
-- Memberships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_establishment_memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_establishment_memberships_role_check
    CHECK (role IN ('establishment_admin', 'staff')),
  CONSTRAINT user_establishment_memberships_unique
    UNIQUE (user_id, establishment_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_establishment
  ON user_establishment_memberships (establishment_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_active
  ON user_establishment_memberships (user_id, is_active);

-- Seed memberships from current users.establishment_id
INSERT INTO user_establishment_memberships (user_id, establishment_id, role, is_active)
SELECT u.id,
       u.establishment_id,
       CASE
         WHEN u.role IN ('establishment_admin', 'staff') THEN u.role
         WHEN u.is_admin = TRUE AND u.establishment_id IS NOT NULL THEN 'establishment_admin'
         ELSE 'staff'
       END,
       COALESCE(u.is_active, TRUE)
FROM users u
WHERE u.establishment_id IS NOT NULL
  AND COALESCE(u.role, '') <> 'system_admin'
ON CONFLICT (user_id, establishment_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Venue-scoped permissions
-- ---------------------------------------------------------------------------
ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE;

-- Backfill establishment_id from the user's current establishment
UPDATE user_permissions up
SET establishment_id = u.establishment_id
FROM users u
WHERE up.user_id = u.id
  AND up.establishment_id IS NULL
  AND u.establishment_id IS NOT NULL;

-- Drop orphan permission rows that cannot be scoped (system admins typically have none)
DELETE FROM user_permissions WHERE establishment_id IS NULL;

ALTER TABLE user_permissions
  ALTER COLUMN establishment_id SET NOT NULL;

-- Rebuild primary key to include establishment
ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS user_permissions_pkey;
ALTER TABLE user_permissions
  ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, permission_id, establishment_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_est
  ON user_permissions (establishment_id, user_id);

-- ---------------------------------------------------------------------------
-- Merge duplicate emails into a single user account
-- Canonical user = highest id among rows sharing the same lower(email)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE duplicate_email_map AS
WITH ranked AS (
  SELECT id,
         LOWER(email) AS email_key,
         ROW_NUMBER() OVER (
           PARTITION BY LOWER(email)
           ORDER BY
             CASE WHEN role = 'system_admin' THEN 0 ELSE 1 END,
             last_login DESC NULLS LAST,
             id DESC
         ) AS rn
  FROM users
  WHERE email IS NOT NULL AND TRIM(email) <> ''
),
canonical AS (
  SELECT email_key, id AS canonical_id FROM ranked WHERE rn = 1
),
losers AS (
  SELECT r.id AS loser_id, c.canonical_id
  FROM ranked r
  JOIN canonical c ON c.email_key = r.email_key
  WHERE r.rn > 1
)
SELECT loser_id, canonical_id FROM losers;

-- Move memberships from losers to canonical (ignore conflicts)
INSERT INTO user_establishment_memberships (user_id, establishment_id, role, is_active)
SELECT m.canonical_id, mem.establishment_id, mem.role, mem.is_active
FROM duplicate_email_map m
JOIN user_establishment_memberships mem ON mem.user_id = m.loser_id
ON CONFLICT (user_id, establishment_id) DO UPDATE
SET role = EXCLUDED.role,
    is_active = user_establishment_memberships.is_active OR EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

DELETE FROM user_establishment_memberships mem
USING duplicate_email_map m
WHERE mem.user_id = m.loser_id;

-- Move permissions
INSERT INTO user_permissions (user_id, permission_id, establishment_id)
SELECT m.canonical_id, up.permission_id, up.establishment_id
FROM duplicate_email_map m
JOIN user_permissions up ON up.user_id = m.loser_id
ON CONFLICT (user_id, permission_id, establishment_id) DO NOTHING;

DELETE FROM user_permissions up
USING duplicate_email_map m
WHERE up.user_id = m.loser_id;

-- Remap common FKs that reference users (only when those tables exist).
-- Refresh sessions live in auth_refresh_tokens (not refresh_tokens).
DO $$
BEGIN
  IF to_regclass('public.auth_refresh_tokens') IS NOT NULL THEN
    UPDATE auth_refresh_tokens rt
    SET user_id = m.canonical_id
    FROM duplicate_email_map m
    WHERE rt.user_id = m.loser_id;

    DELETE FROM auth_refresh_tokens rt
    USING duplicate_email_map m
    WHERE rt.user_id = m.loser_id;
  END IF;

  IF to_regclass('public.user_token_revocation_cutoffs') IS NOT NULL THEN
    DELETE FROM user_token_revocation_cutoffs c
    USING duplicate_email_map m
    WHERE c.user_id = m.loser_id;
  END IF;

  IF to_regclass('public.staff_shifts') IS NOT NULL THEN
    UPDATE staff_shifts ss
    SET user_id = m.canonical_id
    FROM duplicate_email_map m
    WHERE ss.user_id = m.loser_id;
  END IF;

  IF to_regclass('public.staff_planning_ics_tokens') IS NOT NULL THEN
    UPDATE staff_planning_ics_tokens t
    SET user_id = m.canonical_id
    FROM duplicate_email_map m
    WHERE t.user_id = m.loser_id
      AND NOT EXISTS (
        SELECT 1 FROM staff_planning_ics_tokens x WHERE x.user_id = m.canonical_id
      );

    DELETE FROM staff_planning_ics_tokens t
    USING duplicate_email_map m
    WHERE t.user_id = m.loser_id;
  END IF;
END $$;

-- Soft-delete / remove loser accounts (hard delete after FK cleanup)
DELETE FROM users u
USING duplicate_email_map m
WHERE u.id = m.loser_id;

DROP TABLE IF EXISTS duplicate_email_map;

-- Sync users.establishment_id / role from a membership when missing
UPDATE users u
SET establishment_id = mem.establishment_id,
    role = mem.role,
    updated_at = CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (user_id) user_id, establishment_id, role
  FROM user_establishment_memberships
  WHERE is_active = TRUE
  ORDER BY user_id, updated_at DESC, id DESC
) mem
WHERE u.id = mem.user_id
  AND u.role <> 'system_admin'
  AND (u.establishment_id IS NULL OR u.establishment_id <> mem.establishment_id);

-- Enforce unique email (case-insensitive via unique index on lower(email))
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_lower
  ON users (LOWER(email));

-- DOWN
DROP INDEX IF EXISTS idx_users_email_unique_lower;

ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS user_permissions_pkey;
ALTER TABLE user_permissions DROP COLUMN IF EXISTS establishment_id;
ALTER TABLE user_permissions
  ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, permission_id);

DROP TABLE IF EXISTS user_establishment_memberships;
