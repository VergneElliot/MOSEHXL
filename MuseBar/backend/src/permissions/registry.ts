/**
 * Central permission name constants (match `permissions.name` in the database).
 * Use these with requirePermission() to avoid string drift.
 */

export const P = {
  access_pos: 'access_pos',
  access_menu: 'access_menu',
  access_settings: 'access_settings',
  access_closure: 'access_closure',
  access_compliance: 'access_compliance',
  access_user_management: 'access_user_management',
  pos_happyhour_manual: 'pos_happyhour_manual',
  pos_apply_offert: 'pos_apply_offert',
  pos_apply_perso: 'pos_apply_perso',
  orders_cancel: 'orders_cancel',
} as const;

export type PermissionName = (typeof P)[keyof typeof P];
