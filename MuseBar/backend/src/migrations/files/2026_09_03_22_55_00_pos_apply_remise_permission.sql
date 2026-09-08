-- UP
-- Caisse: Remise is its own specific permission (was incorrectly gated as Happy Hour manuel).

INSERT INTO permissions (name) VALUES ('pos_apply_remise')
ON CONFLICT (name) DO NOTHING;

-- DOWN
DELETE FROM user_permissions
WHERE permission_id = (SELECT id FROM permissions WHERE name = 'pos_apply_remise');

DELETE FROM permissions WHERE name = 'pos_apply_remise';
