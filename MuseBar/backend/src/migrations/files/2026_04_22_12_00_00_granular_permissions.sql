-- UP
-- A4: granular permissions — new keys, rename access_compliance → access_closure,
-- migrate access_happy_hour → pos_happyhour_manual, drop access_history, add order_items.is_manual_happy_hour

-- ---------------------------------------------------------------------------
-- order_items: distinguish manual vs automatic Happy Hour on a line
-- ---------------------------------------------------------------------------
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_manual_happy_hour BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- New permission rows
-- ---------------------------------------------------------------------------
INSERT INTO permissions (name) VALUES
  ('access_user_management'),
  ('pos_happyhour_manual'),
  ('pos_apply_offert'),
  ('pos_apply_perso'),
  ('orders_cancel')
ON CONFLICT (name) DO NOTHING;

-- Renumber/rename: single key for clôture page (replaces access_compliance label in product)
UPDATE permissions SET name = 'access_closure' WHERE name = 'access_compliance';

-- ---------------------------------------------------------------------------
-- access_happy_hour → pos_happyhour_manual (user grants)
-- ---------------------------------------------------------------------------
INSERT INTO user_permissions (user_id, permission_id)
SELECT DISTINCT up.user_id, p_new.id
FROM user_permissions up
JOIN permissions p_old ON p_old.id = up.permission_id AND p_old.name = 'access_happy_hour'
CROSS JOIN LATERAL (SELECT id FROM permissions WHERE name = 'pos_happyhour_manual' LIMIT 1) AS p_new
ON CONFLICT (user_id, permission_id) DO NOTHING;

DELETE FROM user_permissions
WHERE permission_id = (SELECT id FROM permissions WHERE name = 'access_happy_hour');

DELETE FROM permissions WHERE name = 'access_happy_hour';

-- ---------------------------------------------------------------------------
-- access_history: viewing is no longer permission-gated — drop the key
-- ---------------------------------------------------------------------------
DELETE FROM user_permissions
WHERE permission_id = (SELECT id FROM permissions WHERE name = 'access_history');

DELETE FROM permissions WHERE name = 'access_history';

-- DOWN
-- Best-effort rollback (renames/inserts are not fully reversible without snapshots).
ALTER TABLE order_items DROP COLUMN IF EXISTS is_manual_happy_hour;
SELECT 1;
