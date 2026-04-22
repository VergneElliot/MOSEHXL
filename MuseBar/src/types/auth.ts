// Authentication and user management types

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
  { key: 'pos_happyhour_manual', label: 'POS — Happy Hour (bouton manuel)' },
  { key: 'pos_apply_offert', label: 'POS — Offert' },
  { key: 'pos_apply_perso', label: 'POS — Perso' },
  { key: 'orders_cancel', label: 'Annulation / retour (historique)' },
];

export type PermissionKey = (typeof ALL_PERMISSIONS)[number]['key'];
