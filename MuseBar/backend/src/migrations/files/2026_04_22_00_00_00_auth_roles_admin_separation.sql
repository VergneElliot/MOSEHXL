-- UP
-- Normalize user roles into the 3 canonical tiers:
-- - system_admin
-- - establishment_admin
-- - staff
--
-- This migration also repairs legacy role strings and ensures the legacy boolean `is_admin`
-- matches the canonical role (is_admin = (role = 'system_admin')).
--
-- Rationale:
-- The codebase is migrating away from `is_admin` because it conflated system admin vs establishment admin.
-- The canonical source of truth is `users.role`.

-- 1) Normalize legacy role strings.
UPDATE users
SET role = CASE
  WHEN role = 'system_operator' THEN 'system_admin'
  WHEN role = 'admin' THEN 'establishment_admin'
  WHEN role IN ('cashier', 'manager') THEN 'staff'
  WHEN role = 'staff' THEN 'staff'
  WHEN role = 'establishment_admin' THEN 'establishment_admin'
  WHEN role = 'system_admin' THEN 'system_admin'
  ELSE role
END
WHERE role IS NOT NULL;

-- 2) Fill missing/blank roles using least-privilege defaults.
UPDATE users
SET role = CASE
  WHEN is_admin = true THEN 'system_admin'
  WHEN establishment_id IS NOT NULL THEN 'staff'
  ELSE 'staff'
END
WHERE role IS NULL OR btrim(role) = '';

-- 3) If a user is attached to an establishment, they are not a system admin.
-- If any rows had role=system_admin with establishment_id set (legacy bug), repair to establishment_admin.
UPDATE users
SET role = 'establishment_admin'
WHERE role = 'system_admin' AND establishment_id IS NOT NULL;

-- 4) Ensure system_admin users are not attached to any establishment.
UPDATE users
SET establishment_id = NULL
WHERE role = 'system_admin';

-- 5) Ensure boolean matches the canonical role.
UPDATE users
SET is_admin = (role = 'system_admin');

-- DOWN
-- Best-effort only.
-- We cannot reliably restore previous role strings after normalization.
-- Leaving data in its normalized (safer) state is preferred.
SELECT 1;

