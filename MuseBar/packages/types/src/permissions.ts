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
  pos_apply_remise: 'pos_apply_remise',
  pos_reassign_waiter: 'pos_reassign_waiter',
  pos_intervene_table: 'pos_intervene_table',
  orders_cancel: 'orders_cancel',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Two tiers of access:
 *
 * - `basic`   — everything any staff member may do. Held implicitly by every active
 *               membership, never granted or revoked, and compatible with a 2-digit PIN.
 * - `specific` — granted per account in « Gestion des utilisateurs ». Requires a 4–8 digit
 *               PIN, and can be exercised through a step-up PIN prompt by someone who holds it.
 *
 * Basic scope today: take orders in comptoir or table mode and validate the cart, pay
 * (CB / espèces / options de paiement), assign a cart to a table, note and « à suivre »,
 * read the floor plan, browse history, and edit one's own profile in Paramètres.
 * Everything else is specific.
 */
export type PermissionTier = 'basic' | 'specific';

export const PERMISSION_TIERS: Record<PermissionName, PermissionTier> = {
  // Caisse, floor-plan read, catalog read, history browse, own profile.
  access_pos: 'basic',

  access_menu: 'specific',
  access_settings: 'specific',
  access_closure: 'specific',
  access_compliance: 'specific',
  access_user_management: 'specific',
  access_documents: 'specific',
  access_inbox: 'specific',
  access_reservations: 'specific',
  access_planning: 'specific',
  manage_floor_plan: 'specific',
  // Caisse line actions + header Happy Hour override (settings tab stays access_settings).
  pos_happyhour_manual: 'specific',
  pos_apply_offert: 'specific',
  pos_apply_perso: 'specific',
  pos_apply_remise: 'specific',
  // Assigning a cart to a table is basic; changing who the table belongs to is not.
  pos_reassign_waiter: 'specific',
  pos_intervene_table: 'specific',
  // Cancelling a paid order.
  orders_cancel: 'specific',
};

const ALL_PERMISSION_NAMES = Object.keys(PERMISSION_TIERS) as PermissionName[];

export const BASIC_PERMISSIONS: readonly PermissionName[] = ALL_PERMISSION_NAMES.filter(
  (name) => PERMISSION_TIERS[name] === 'basic'
);

export const SPECIFIC_PERMISSIONS: readonly PermissionName[] = ALL_PERMISSION_NAMES.filter(
  (name) => PERMISSION_TIERS[name] === 'specific'
);

export function isPermissionName(name: string): name is PermissionName {
  return Object.prototype.hasOwnProperty.call(PERMISSION_TIERS, name);
}

export function isBasicPermission(name: string): boolean {
  return isPermissionName(name) && PERMISSION_TIERS[name] === 'basic';
}

/** Specific permissions are the ones shown as checkboxes and gated by step-up PIN. */
export function isSpecificPermission(name: string): boolean {
  return isPermissionName(name) && PERMISSION_TIERS[name] === 'specific';
}
