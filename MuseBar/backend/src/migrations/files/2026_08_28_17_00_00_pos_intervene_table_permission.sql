-- UP
INSERT INTO permissions (name) VALUES ('pos_intervene_table')
ON CONFLICT (name) DO NOTHING;

-- DOWN
DELETE FROM user_permissions
WHERE permission_id = (SELECT id FROM permissions WHERE name = 'pos_intervene_table');

DELETE FROM permissions WHERE name = 'pos_intervene_table';
