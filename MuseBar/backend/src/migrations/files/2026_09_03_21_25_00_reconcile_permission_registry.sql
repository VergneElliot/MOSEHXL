-- UP
-- Reconcile the `permissions` table with the shared registry (@mosehxl/types PERMISSIONS).
--
-- Migration 2026_04_22_12_00_00_granular_permissions renamed the `access_compliance` row to
-- `access_closure`, but the code kept gating the legal journal / compliance routes on
-- `access_compliance`. That key therefore had no row and could never be granted, so no
-- non-admin could reach compliance features whatever the UI showed.
--
-- Basic-tier grants are also removed: `access_pos` is now held implicitly by every active
-- membership, so keeping explicit rows would make a missing row look like a downgrade.

INSERT INTO permissions (name) VALUES
  ('access_pos'),
  ('access_menu'),
  ('access_settings'),
  ('access_closure'),
  ('access_compliance'),
  ('access_user_management'),
  ('access_documents'),
  ('access_inbox'),
  ('access_reservations'),
  ('access_planning'),
  ('manage_floor_plan'),
  ('pos_happyhour_manual'),
  ('pos_apply_offert'),
  ('pos_apply_perso'),
  ('pos_reassign_waiter'),
  ('pos_intervene_table'),
  ('orders_cancel')
ON CONFLICT (name) DO NOTHING;

DELETE FROM user_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'access_pos');

-- DOWN
-- Rows are additive and grant removal is not reversible without a snapshot.
SELECT 1;
