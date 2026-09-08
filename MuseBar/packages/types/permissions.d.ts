export declare const PERMISSIONS: {
    readonly access_pos: "access_pos";
    readonly access_menu: "access_menu";
    readonly access_settings: "access_settings";
    readonly access_closure: "access_closure";
    readonly access_compliance: "access_compliance";
    readonly access_user_management: "access_user_management";
    readonly access_documents: "access_documents";
    readonly access_inbox: "access_inbox";
    readonly access_reservations: "access_reservations";
    readonly access_planning: "access_planning";
    readonly manage_floor_plan: "manage_floor_plan";
    readonly pos_happyhour_manual: "pos_happyhour_manual";
    readonly pos_apply_offert: "pos_apply_offert";
    readonly pos_apply_perso: "pos_apply_perso";
    readonly pos_apply_remise: "pos_apply_remise";
    readonly pos_reassign_waiter: "pos_reassign_waiter";
    readonly pos_intervene_table: "pos_intervene_table";
    readonly orders_cancel: "orders_cancel";
};
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
export declare const PERMISSION_TIERS: Record<PermissionName, PermissionTier>;
export declare const BASIC_PERMISSIONS: readonly PermissionName[];
export declare const SPECIFIC_PERMISSIONS: readonly PermissionName[];
export declare function isPermissionName(name: string): name is PermissionName;
export declare function isBasicPermission(name: string): boolean;
/** Specific permissions are the ones shown as checkboxes and gated by step-up PIN. */
export declare function isSpecificPermission(name: string): boolean;
