"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPECIFIC_PERMISSIONS = exports.BASIC_PERMISSIONS = exports.PERMISSION_TIERS = exports.PERMISSIONS = void 0;
exports.isPermissionName = isPermissionName;
exports.isBasicPermission = isBasicPermission;
exports.isSpecificPermission = isSpecificPermission;
exports.PERMISSIONS = {
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
};
exports.PERMISSION_TIERS = {
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
const ALL_PERMISSION_NAMES = Object.keys(exports.PERMISSION_TIERS);
exports.BASIC_PERMISSIONS = ALL_PERMISSION_NAMES.filter((name) => exports.PERMISSION_TIERS[name] === 'basic');
exports.SPECIFIC_PERMISSIONS = ALL_PERMISSION_NAMES.filter((name) => exports.PERMISSION_TIERS[name] === 'specific');
function isPermissionName(name) {
    return Object.prototype.hasOwnProperty.call(exports.PERMISSION_TIERS, name);
}
function isBasicPermission(name) {
    return isPermissionName(name) && exports.PERMISSION_TIERS[name] === 'basic';
}
/** Specific permissions are the ones shown as checkboxes and gated by step-up PIN. */
function isSpecificPermission(name) {
    return isPermissionName(name) && exports.PERMISSION_TIERS[name] === 'specific';
}
