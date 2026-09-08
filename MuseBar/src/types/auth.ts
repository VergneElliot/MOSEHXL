// Authentication and user management types

import {
  BASIC_PERMISSIONS,
  SPECIFIC_PERMISSIONS,
  type PermissionName,
} from '@mosehxl/types';

/**
 * Roles assignable in "Gestion des utilisateurs" (establishment scope).
 * System-level accounts use `system_admin` elsewhere, not in this flow.
 */
export type EstablishmentAssignableRole = 'establishment_admin' | 'staff';

/** One venue membership returned by login /me / switch-establishment. */
export interface EstablishmentMembershipSummary {
  establishment_id: string;
  name: string;
  role: EstablishmentAssignableRole | string;
  calendar_color?: string;
}

/**
 * Logged-in user as returned by GET /auth/me.
 * Single source of truth for the frontend — import from here, don't redefine.
 */
export interface User {
  id: number;
  email: string;
  is_admin: boolean;
  role: string;
  establishment_id: string | null;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  calendar_color?: string | null;
  permissions: string[];
  memberships?: EstablishmentMembershipSummary[];
  email_verified?: boolean;
  support_impersonation?: unknown;
}

/**
 * A user listed in the establishment's user management panel.
 * Returned by GET /auth/users (scoped to the requester's establishment).
 * Uses camelCase `isAdmin` because the API response is mapped in useUserActions.
 */
export interface EstablishmentMember {
  id: number;
  email: string;
  isAdmin: boolean;
  role: string;
  establishment_id: string | null;
  permissions?: string[];
  /** False for a deactivated membership: listed, but cannot log in or badge in. */
  isActive?: boolean;
}
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: string;
  refreshExpiresIn?: string;
}

export interface Permission {
  key: PermissionName;
  label: string;
  group: string;
}

/**
 * French UI metadata for every permission key. Typed as an exhaustive record, so adding a
 * key to `@mosehxl/types` without a label is a compile error.
 */
const PERMISSION_META: Record<PermissionName, { label: string; group: string }> = {
  access_pos: {
    label: 'Caisse, plan de salle (lecture), historique, profil',
    group: 'Base',
  },
  pos_happyhour_manual: {
    label: 'Happy Hour manuel (panier + en-tête)',
    group: 'Caisse',
  },
  pos_apply_offert: { label: 'Offert', group: 'Caisse' },
  pos_apply_perso: { label: 'Perso', group: 'Caisse' },
  pos_apply_remise: { label: 'Remise', group: 'Caisse' },
  pos_reassign_waiter: {
    label: 'Réassigner le serveur d’une commande / table',
    group: 'Caisse',
  },
  pos_intervene_table: {
    label: 'Intervenir sur la table d’un autre serveur',
    group: 'Caisse',
  },
  orders_cancel: {
    label: 'Annuler / retour (article validé ou vente encaissée)',
    group: 'Caisse / Historique',
  },
  access_settings: { label: 'Paramètres (hors profil)', group: 'Paramètres' },
  access_menu: { label: 'Gestion du menu', group: 'Paramètres' },
  access_closure: { label: 'Bulletins de clôture', group: 'Clôtures' },
  access_compliance: { label: 'Journal légal et conformité', group: 'Clôtures' },
  access_user_management: { label: 'Gestion des utilisateurs', group: 'Administration' },
  access_documents: { label: 'Documents', group: 'Administration' },
  access_inbox: { label: 'Boîte mail', group: 'Administration' },
  access_reservations: { label: 'Réservations', group: 'Administration' },
  access_planning: { label: 'Planning', group: 'Administration' },
  manage_floor_plan: { label: 'Plans de salle (édition)', group: 'Administration' },
};

/** Order in which permission groups are displayed in the editor. */
export const PERMISSION_GROUP_ORDER = [
  'Caisse',
  'Historique',
  'Paramètres',
  'Clôtures',
  'Administration',
] as const;

/**
 * Grantable permissions — the specific tier only. Basic-tier keys are held implicitly by
 * every membership and are therefore not shown as checkboxes.
 */
export const ALL_PERMISSIONS: Permission[] = SPECIFIC_PERMISSIONS.map((key) => ({
  key,
  label: PERMISSION_META[key].label,
  group: PERMISSION_META[key].group,
}));

/** Description of what every staff member can do without any grant. */
export const BASIC_PERMISSION_SUMMARY = BASIC_PERMISSIONS.map(
  (key) => PERMISSION_META[key].label
);

export type PermissionKey = PermissionName;
