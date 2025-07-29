// Authentication and user management types

export interface User {
  id: string;
  email: string;
  is_admin: boolean;
  permissions?: string[];
  created_at: Date;
  updated_at: Date;
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
  description?: string;
}

// Common permission keys
export const PERMISSIONS = {
  ACCESS_POS: 'access_pos',
  ACCESS_MENU: 'access_menu',
  ACCESS_HAPPY_HOUR: 'access_happy_hour',
  ACCESS_HISTORY: 'access_history',
  ACCESS_SETTINGS: 'access_settings',
  ACCESS_COMPLIANCE: 'access_compliance',
  ADMIN_USERS: 'admin_users',
  ADMIN_AUDIT: 'admin_audit'
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS]; 