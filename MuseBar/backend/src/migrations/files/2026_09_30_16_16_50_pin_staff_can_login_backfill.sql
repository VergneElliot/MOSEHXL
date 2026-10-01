-- UP
-- Backfill: staff with a badge PIN become PIN-only actors (no email/password login).
-- Venue login accounts (establishment_admin memberships) keep can_login = TRUE.
-- Do not invent historical time_entries from old long-lived PIN sessions.

UPDATE users u
SET can_login = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE u.role <> 'system_admin'
  AND COALESCE(u.is_admin, FALSE) = FALSE
  AND u.can_login = TRUE
  AND (
    u.email LIKE 'pin.%@staff.local'
    OR EXISTS (
      SELECT 1
      FROM user_establishment_memberships m
      WHERE m.user_id = u.id
        AND m.is_active = TRUE
        AND m.role = 'staff'
        AND m.pin_hash IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM user_establishment_memberships m2
          WHERE m2.user_id = u.id
            AND m2.is_active = TRUE
            AND m2.role = 'establishment_admin'
        )
    )
  );

-- SCHEMA_SNAPSHOT_NOT_REQUIRED

-- DOWN
UPDATE users
SET can_login = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE can_login = FALSE
  AND role <> 'system_admin';
