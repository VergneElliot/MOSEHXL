/**
 * User model type definitions (kept separate to avoid growing user.ts).
 */

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  is_admin: boolean;
  role: string;
  establishment_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  is_active: boolean;
  /** Venue login accounts true; PIN-only staff false. */
  can_login: boolean;
  failed_login_attempts: number;
  lockout_count: number;
  locked_until: Date | null;
  mfa_totp_enabled?: boolean;
  mfa_totp_secret?: string | null;
  mfa_totp_enabled_at?: Date | null;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  is_admin: boolean;
  role: string;
  establishment_id: string | null;
}

/** @deprecated Use UserRow instead. */
export type User = UserRow;
