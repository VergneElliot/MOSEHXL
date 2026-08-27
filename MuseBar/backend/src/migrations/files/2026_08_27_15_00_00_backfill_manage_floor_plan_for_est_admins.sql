-- UP
-- Ensure manage_floor_plan exists and is granted to every active establishment_admin membership.
-- Also covers venues created after the original floor migration backfill.

INSERT INTO permissions (name) VALUES
  ('manage_floor_plan')
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_permissions (user_id, permission_id, establishment_id)
SELECT m.user_id, p.id, m.establishment_id
FROM user_establishment_memberships m
CROSS JOIN permissions p
WHERE m.is_active = TRUE
  AND m.role = 'establishment_admin'
  AND p.name = 'manage_floor_plan'
ON CONFLICT (user_id, permission_id, establishment_id) DO NOTHING;

-- DOWN
DELETE FROM user_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'manage_floor_plan')
  AND user_id IN (
    SELECT user_id FROM user_establishment_memberships
    WHERE role = 'establishment_admin' AND is_active = TRUE
  );
-- Note: does not remove the permissions catalog row (shared with other grants).
