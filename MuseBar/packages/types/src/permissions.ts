export const PERMISSIONS = {
  access_pos: 'access_pos',
  access_menu: 'access_menu',
  access_settings: 'access_settings',
  access_closure: 'access_closure',
  access_compliance: 'access_compliance',
  access_user_management: 'access_user_management',
  access_documents: 'access_documents',
  access_inbox: 'access_inbox',
  access_reservations: 'access_reservations',
  access_planning: 'access_planning',
  manage_floor_plan: 'manage_floor_plan',
  pos_happyhour_manual: 'pos_happyhour_manual',
  pos_apply_offert: 'pos_apply_offert',
  pos_apply_perso: 'pos_apply_perso',
  pos_reassign_waiter: 'pos_reassign_waiter',
  pos_intervene_table: 'pos_intervene_table',
  orders_cancel: 'orders_cancel',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
