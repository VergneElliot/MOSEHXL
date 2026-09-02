// Authentication and user management types

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
  key: string;
  label: string;
}

/**
 * All grantable permissions. The `key` matches the `name` column in the
 * database `permissions` table. The `label` is the French UI string shown
 * in the permission editor. Keep this list in sync with the DB seed and
 * with the `permission` fields on TABS in AppRouter.tsx.
 */
export const ALL_PERMISSIONS: Permission[] = [
  { key: 'access_pos', label: 'Caisse' },
  { key: 'access_menu', label: 'Gestion du menu' },
  { key: 'access_settings', label: 'Paramètres' },
  { key: 'access_closure', label: 'Clôtures' },
  { key: 'access_user_management', label: 'Gestion des utilisateurs' },
  { key: 'access_documents', label: 'Administration — Documents' },
  { key: 'access_inbox', label: 'Administration — Boîte mail' },
  { key: 'access_reservations', label: 'Administration — Réservations' },
  { key: 'access_planning', label: 'Administration — Planning' },
  { key: 'manage_floor_plan', label: 'Administration — Plans de tables' },
  { key: 'pos_happyhour_manual', label: 'POS — Happy Hour (bouton manuel)' },
  { key: 'pos_apply_offert', label: 'POS — Offert' },
  { key: 'pos_apply_perso', label: 'POS — Perso' },
  { key: 'pos_reassign_waiter', label: 'POS — Réassigner un serveur à une table' },
  { key: 'pos_intervene_table', label: 'POS — Intervenir sur la table d’un autre serveur' },
  { key: 'orders_cancel', label: 'Annulation / retour (historique)' },
];

export type PermissionKey = (typeof ALL_PERMISSIONS)[number]['key'];
