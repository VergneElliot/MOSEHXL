-- UP
-- Permission to reassign open-table waiter attribution (shift handoff / Z ticket accounting).

INSERT INTO permissions (name) VALUES ('pos_reassign_waiter')
ON CONFLICT (name) DO NOTHING;

-- DOWN
DELETE FROM user_permissions
WHERE permission_id = (SELECT id FROM permissions WHERE name = 'pos_reassign_waiter');

DELETE FROM permissions WHERE name = 'pos_reassign_waiter';
