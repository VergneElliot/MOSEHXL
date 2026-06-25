import { CanonicalAuthRole } from '../../auth/roleVocabulary';

export const MAX_SUPPORT_IMPERSONATION_MINUTES = 120;
export const MAX_FAILED_LOGIN_ATTEMPTS = Number(process.env.AUTH_LOCKOUT_MAX_FAILED_ATTEMPTS ?? 5);
export const BASE_LOCKOUT_MINUTES = Number(process.env.AUTH_LOCKOUT_BASE_MINUTES ?? 15);
export const MAX_LOCKOUT_MINUTES = Number(process.env.AUTH_LOCKOUT_MAX_MINUTES ?? 240);
export const ACCESS_TOKEN_EXPIRES_IN = process.env.AUTH_ACCESS_TOKEN_EXPIRES_IN || '12h';
export const REFRESH_SESSION_DAYS = Number(process.env.AUTH_REFRESH_SESSION_DAYS ?? 1);
export const REMEMBER_REFRESH_SESSION_DAYS = Number(process.env.AUTH_REFRESH_REMEMBER_DAYS ?? 30);
export const MAX_REFRESH_SESSION_ABSOLUTE_DAYS = Number(process.env.AUTH_REFRESH_ABSOLUTE_MAX_DAYS ?? 180);
export const CLIENT_SESSION_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
export const TOTP_ISSUER = 'MOSEHXL';

export function toPositiveFiniteNumber(raw: number, fallback: number): number {
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function computeRefreshExpiry(
  rememberMe: boolean,
  sessionStartedAt?: Date
): { expiresAt: Date; refreshExpiresIn: string } {
  const nowMs = Date.now();
  const days = rememberMe
    ? toPositiveFiniteNumber(REMEMBER_REFRESH_SESSION_DAYS, 30)
    : toPositiveFiniteNumber(REFRESH_SESSION_DAYS, 1);
  const rollingExpiryMs = nowMs + days * 24 * 60 * 60 * 1000;
  const absoluteCapDays = toPositiveFiniteNumber(MAX_REFRESH_SESSION_ABSOLUTE_DAYS, 180);
  const sessionStartMs = sessionStartedAt?.getTime() ?? nowMs;
  const absoluteExpiryMs = sessionStartMs + absoluteCapDays * 24 * 60 * 60 * 1000;
  const effectiveExpiryMs = Math.min(rollingExpiryMs, absoluteExpiryMs);
  const expiresInSeconds = Math.max(1, Math.floor((effectiveExpiryMs - nowMs) / 1000));
  return {
    expiresAt: new Date(effectiveExpiryMs),
    refreshExpiresIn: `${expiresInSeconds}s`,
  };
}

export function computeLockoutDurationMinutes(lockoutCount: number): number {
  const base = toPositiveFiniteNumber(BASE_LOCKOUT_MINUTES, 15);
  const max = toPositiveFiniteNumber(MAX_LOCKOUT_MINUTES, 240);
  const exponent = Math.max(0, lockoutCount - 1);
  return Math.min(max, base * (2 ** exponent));
}

export function getRefreshCookieName(): string {
  return 'musebar_refresh_token';
}

export function getCsrfCookieName(): string {
  return 'musebar_csrf_token';
}

export function getClientSessionCookieName(): string {
  return 'musebar_client_session_id';
}

export function computeRefreshCookieMaxAgeMs(rememberMe: boolean, expiresAt?: Date): number {
  const days = rememberMe
    ? toPositiveFiniteNumber(REMEMBER_REFRESH_SESSION_DAYS, 30)
    : toPositiveFiniteNumber(REFRESH_SESSION_DAYS, 1);
  const defaultMaxAgeMs = days * 24 * 60 * 60 * 1000;
  if (!expiresAt) {
    return defaultMaxAgeMs;
  }
  const remainingMs = expiresAt.getTime() - Date.now();
  const boundedRemainingMs = Math.max(1_000, remainingMs);
  return Math.min(defaultMaxAgeMs, boundedRemainingMs);
}

export function isAdminTwoFactorEnforced(): boolean {
  const raw = process.env.AUTH_ENFORCE_ADMIN_2FA?.trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

export function requiresAdminTwoFactor(role: CanonicalAuthRole): boolean {
  return role === 'system_admin' || role === 'establishment_admin';
}
