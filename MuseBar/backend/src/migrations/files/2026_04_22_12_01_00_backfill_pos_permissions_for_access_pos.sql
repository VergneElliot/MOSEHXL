-- UP
-- Users who could use the POS already had `access_pos`; grant the new action/cancel keys
-- so existing staff are not locked out (owners can revoke per user in Gestion des utilisateurs).

INSERT INTO user_permissions (user_id, permission_id)
SELECT DISTINCT up.user_id, p.id
FROM user_permissions up
JOIN permissions p_old ON p_old.id = up.permission_id AND p_old.name = 'access_pos'
CROSS JOIN permissions p
WHERE p.name IN (
  'pos_happyhour_manual',
  'pos_apply_offert',
  'pos_apply_perso',
  'orders_cancel'
)
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- DOWN
SELECT 1;
