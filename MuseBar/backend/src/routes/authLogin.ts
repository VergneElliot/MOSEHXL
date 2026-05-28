import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';
import { UserModel } from '../models/user';
import { AuditTrailModel } from '../models/auditTrail';
import { TokenBlocklistModel } from '../models/tokenBlocklist';
import { RefreshTokenModel } from '../models/refreshToken';
import { Logger } from '../utils/logger';
import {
  AppError,
  asyncHandler,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorHandler';
import {
  generateToken,
  requireAdmin,
  requireAuth,
} from '../middleware/auth';
import { pool } from '../db/pool';
import { CanonicalAuthRole, deriveCanonicalRole } from '../auth/roleVocabulary';
import {
  createAuthRateLimitMiddleware,
  resolveOpaqueRefreshRateLimitKey,
  resolveLoginRateLimitKey
} from '../middleware/security/AuthEndpointRateLimit';

const router = express.Router();

const MAX_SUPPORT_IMPERSONATION_MINUTES = 120;
const MAX_FAILED_LOGIN_ATTEMPTS = Number(process.env.AUTH_LOCKOUT_MAX_FAILED_ATTEMPTS ?? 5);
const BASE_LOCKOUT_MINUTES = Number(process.env.AUTH_LOCKOUT_BASE_MINUTES ?? 15);
const MAX_LOCKOUT_MINUTES = Number(process.env.AUTH_LOCKOUT_MAX_MINUTES ?? 240);
const MAX_REFRESH_SESSION_ABSOLUTE_DAYS = Number(process.env.AUTH_REFRESH_ABSOLUTE_MAX_DAYS ?? 30);
const CLIENT_SESSION_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const authRateLimitBase = process.env.NODE_ENV === 'development' ? 5 : 1;
const authLimiterPool = process.env.NODE_ENV === 'test' ? undefined : pool;
const TOTP_ISSUER = 'MOSEHXL';
const authRateLimitLogger = {
  security: (
    event: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: number
  ) => {
    try {
      Logger.getInstance().security(event, severity, metadata, requestId, userId);
    } catch {
      // In isolated tests the logger may not be initialized; skip side-effect logging.
    }
  },
};

const loginRateLimit = createAuthRateLimitMiddleware({
  logger: authRateLimitLogger,
  pool: authLimiterPool,
  keyPrefix: 'auth_login',
  windowMs: 15 * 60 * 1000,
  maxRequests: 10 * authRateLimitBase,
  keyResolver: resolveLoginRateLimitKey,
  errorMessage: 'Too many login attempts. Please retry later.',
});

const refreshRateLimit = createAuthRateLimitMiddleware({
  logger: authRateLimitLogger,
  pool: authLimiterPool,
  keyPrefix: 'auth_refresh',
  windowMs: 15 * 60 * 1000,
  maxRequests: 30 * authRateLimitBase,
  keyResolver: resolveOpaqueRefreshRateLimitKey,
  errorMessage: 'Too many token refresh attempts. Please retry later.',
});

function computeRefreshExpiry(
  rememberMe: boolean,
  sessionStartedAt?: Date
): { expiresAt: Date; refreshExpiresIn: string } {
  const nowMs = Date.now();
  const days = rememberMe ? 7 : 1;
  const rollingExpiryMs = nowMs + days * 24 * 60 * 60 * 1000;
  const absoluteCapDays = toPositiveFiniteNumber(MAX_REFRESH_SESSION_ABSOLUTE_DAYS, 30);
  const sessionStartMs = sessionStartedAt?.getTime() ?? nowMs;
  const absoluteExpiryMs = sessionStartMs + absoluteCapDays * 24 * 60 * 60 * 1000;
  const effectiveExpiryMs = Math.min(rollingExpiryMs, absoluteExpiryMs);
  const expiresInSeconds = Math.max(1, Math.floor((effectiveExpiryMs - nowMs) / 1000));
  return {
    expiresAt: new Date(effectiveExpiryMs),
    refreshExpiresIn: `${expiresInSeconds}s`,
  };
}

function toPositiveFiniteNumber(raw: number, fallback: number): number {
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function computeLockoutDurationMinutes(lockoutCount: number): number {
  const base = toPositiveFiniteNumber(BASE_LOCKOUT_MINUTES, 15);
  const max = toPositiveFiniteNumber(MAX_LOCKOUT_MINUTES, 240);
  const exponent = Math.max(0, lockoutCount - 1);
  return Math.min(max, base * (2 ** exponent));
}

function getRefreshCookieName(): string {
  return 'musebar_refresh_token';
}

function getCsrfCookieName(): string {
  return 'musebar_csrf_token';
}

function getClientSessionCookieName(): string {
  return 'musebar_client_session_id';
}

function getCookieValue(req: express.Request, cookieName: string): string | null {
  const rawCookieHeader = req.headers.cookie;
  if (typeof rawCookieHeader !== 'string' || rawCookieHeader.length === 0) {
    return null;
  }

  const cookiePair = rawCookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!cookiePair) {
    return null;
  }

  const value = cookiePair.slice(cookieName.length + 1).trim();
  return value.length > 0 ? decodeURIComponent(value) : null;
}

function normalizeClientSessionId(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 128) {
    return null;
  }
  const allowedPattern = /^[a-zA-Z0-9_-]+$/;
  if (!allowedPattern.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function resolveClientSessionId(req: express.Request, res: express.Response): string {
  const fromHeader = normalizeClientSessionId(req.header('x-client-session-id'));
  const fromCookie = normalizeClientSessionId(getCookieValue(req, getClientSessionCookieName()));
  const existing = fromHeader ?? fromCookie;
  if (existing) {
    return existing;
  }
  const minted = crypto.randomUUID();
  res.cookie(getClientSessionCookieName(), minted, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: CLIENT_SESSION_COOKIE_MAX_AGE_MS,
  });
  return minted;
}

function deriveIpSubnet(ipRaw: string | undefined): string | null {
  if (!ipRaw) {
    return null;
  }
  const trimmed = ipRaw.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
  if (normalized.includes('.')) {
    const parts = normalized.split('.');
    if (parts.length !== 4) {
      return null;
    }
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  if (normalized.includes(':')) {
    const sections = normalized.split(':');
    const firstFour = sections.slice(0, 4).map((section) => section || '0');
    while (firstFour.length < 4) {
      firstFour.push('0');
    }
    return `${firstFour.join(':')}::/64`;
  }
  return null;
}

function normalizeUserAgent(userAgentRaw: unknown): string | null {
  if (typeof userAgentRaw !== 'string') {
    return null;
  }
  const trimmed = userAgentRaw.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, 512);
}

type SessionDrift = {
  client_id_changed: boolean;
  ip_subnet_changed: boolean;
  user_agent_changed: boolean;
};

function computeSessionDrift(
  reference: { clientId?: string | null; ipSubnet?: string | null; userAgent?: string | null },
  current: { clientId: string; ipSubnet: string | null; userAgent: string | null }
): SessionDrift {
  return {
    client_id_changed:
      typeof reference.clientId === 'string' &&
      reference.clientId.length > 0 &&
      reference.clientId !== current.clientId,
    ip_subnet_changed:
      typeof reference.ipSubnet === 'string' &&
      reference.ipSubnet.length > 0 &&
      reference.ipSubnet !== (current.ipSubnet ?? null),
    user_agent_changed:
      typeof reference.userAgent === 'string' &&
      reference.userAgent.length > 0 &&
      current.userAgent !== null &&
      reference.userAgent !== current.userAgent,
  };
}

function scoreSessionDrift(
  drift: SessionDrift,
  options: { adminSensitive: boolean }
): { score: number; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } {
  let score = 0;
  if (drift.client_id_changed) score += 45;
  if (drift.ip_subnet_changed) score += 30;
  if (drift.user_agent_changed) score += 20;
  if (options.adminSensitive && score > 0) score += 15;

  if (score >= 85) return { score, severity: 'CRITICAL' };
  if (score >= 65) return { score, severity: 'HIGH' };
  if (score >= 35) return { score, severity: 'MEDIUM' };
  return { score, severity: 'LOW' };
}

function logSessionAnomalySignal(
  eventName: string,
  drift: SessionDrift,
  context: {
    familyId?: string;
    endpoint: string;
    role?: string;
    userId: number;
    requestId?: string;
    adminSensitive: boolean;
  }
): void {
  if (!drift.client_id_changed && !drift.ip_subnet_changed && !drift.user_agent_changed) {
    return;
  }

  const { score, severity } = scoreSessionDrift(drift, {
    adminSensitive: context.adminSensitive,
  });

  try {
    Logger.getInstance().security(
      eventName,
      severity,
      {
        endpoint: context.endpoint,
        role: context.role,
        family_id: context.familyId,
        drift,
        score,
        admin_sensitive: context.adminSensitive,
      },
      context.requestId,
      context.userId
    );
  } catch {
    // Security signaling is best-effort and must never break auth flows.
  }
}

function logRefreshSessionAnomalySignal(
  refreshSession: { client_id?: string | null; ip_subnet?: string | null; user_agent?: string | null; family_id: string },
  current: {
    clientId: string;
    ipSubnet: string | null;
    userAgent: string | null;
    role: CanonicalAuthRole;
    userId: number;
    requestId?: string;
  }
): void {
  const drift = computeSessionDrift(
    {
      clientId: refreshSession.client_id ?? null,
      ipSubnet: refreshSession.ip_subnet ?? null,
      userAgent: refreshSession.user_agent ?? null,
    },
    {
      clientId: current.clientId,
      ipSubnet: current.ipSubnet,
      userAgent: current.userAgent,
    }
  );
  logSessionAnomalySignal('REFRESH_SESSION_ANOMALY_SIGNAL', drift, {
    familyId: refreshSession.family_id,
    endpoint: 'auth.refresh',
    role: current.role,
    userId: current.userId,
    requestId: current.requestId,
    adminSensitive: requiresAdminTwoFactor(current.role),
  });
}

function logAdminEndpointAnomalySignal(
  endpoint: string,
  reference: { clientId?: string | null; ipSubnet?: string | null; userAgent?: string | null },
  current: {
    clientId: string;
    ipSubnet: string | null;
    userAgent: string | null;
    userId: number;
    requestId?: string;
  }
): void {
  const drift = computeSessionDrift(reference, {
    clientId: current.clientId,
    ipSubnet: current.ipSubnet,
    userAgent: current.userAgent,
  });
  logSessionAnomalySignal('ADMIN_ENDPOINT_ANOMALY_SIGNAL', drift, {
    endpoint,
    role: 'system_admin',
    userId: current.userId,
    requestId: current.requestId,
    adminSensitive: true,
  });
}

function getRefreshTokenFromRequest(
  req: express.Request,
  options?: { allowBodyFallback?: boolean }
): string | null {
  const allowBodyFallback = options?.allowBodyFallback === true;
  const refreshFromCookie = getCookieValue(req, getRefreshCookieName());
  if (refreshFromCookie) {
    return refreshFromCookie;
  }
  if (!allowBodyFallback) {
    return null;
  }
  const bodyToken = req.body?.refreshToken;
  return typeof bodyToken === 'string' && bodyToken.trim().length > 0 ? bodyToken.trim() : null;
}

function computeRefreshCookieMaxAgeMs(rememberMe: boolean, expiresAt?: Date): number {
  const defaultMaxAgeMs = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  if (!expiresAt) {
    return defaultMaxAgeMs;
  }
  const remainingMs = expiresAt.getTime() - Date.now();
  const boundedRemainingMs = Math.max(1_000, remainingMs);
  return Math.min(defaultMaxAgeMs, boundedRemainingMs);
}

function setRefreshTokenCookie(
  res: express.Response,
  refreshToken: string,
  rememberMe: boolean,
  expiresAt?: Date
): void {
  const maxAgeMs = computeRefreshCookieMaxAgeMs(rememberMe, expiresAt);
  res.cookie(getRefreshCookieName(), refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: maxAgeMs,
  });
}

function setCsrfTokenCookie(
  res: express.Response,
  csrfToken: string,
  rememberMe: boolean,
  expiresAt?: Date
): void {
  const maxAgeMs = computeRefreshCookieMaxAgeMs(rememberMe, expiresAt);
  res.cookie(getCsrfCookieName(), csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: maxAgeMs,
  });
}

function clearRefreshTokenCookie(res: express.Response): void {
  res.clearCookie(getRefreshCookieName(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
}

function clearCsrfTokenCookie(res: express.Response): void {
  res.clearCookie(getCsrfCookieName(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
}

function validateRefreshCsrf(req: express.Request): void {
  const csrfFromCookie = getCookieValue(req, getCsrfCookieName());
  const csrfFromHeader = req.header('x-csrf-token');
  if (!csrfFromCookie || !csrfFromHeader) {
    throw new ValidationError('CSRF token is required');
  }

  const cookieBuffer = Buffer.from(csrfFromCookie);
  const headerBuffer = Buffer.from(csrfFromHeader);
  if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    throw new AuthenticationError('Invalid CSRF token');
  }
}

function isAdminTwoFactorEnforced(): boolean {
  const raw = process.env.AUTH_ENFORCE_ADMIN_2FA?.trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

function requiresAdminTwoFactor(role: CanonicalAuthRole): boolean {
  return role === 'system_admin' || role === 'establishment_admin';
}

async function logAuditOrThrow(
  entry: Parameters<typeof AuditTrailModel.logAction>[0],
  context: string
): Promise<void> {
  try {
    await AuditTrailModel.logAction(entry);
  } catch (error) {
    Logger.getInstance().error(
      `Audit trail logging failed (${context})`,
      error as Error,
      'AUTH_ROUTE'
    );
    throw new AppError('Failed to persist audit trail entry', 500, 'AUDIT_LOG_FAILURE', { context });
  }
}

async function revokeTokenOrThrow(token: string, userId: number, reason: string): Promise<void> {
  try {
    await TokenBlocklistModel.revokeToken(token, { userId, reason });
  } catch (error) {
    Logger.getInstance().error(
      `Token revocation failed (${reason})`,
      error as Error,
      'AUTH_ROUTE'
    );
    throw new AppError('Failed to revoke token', 500, 'TOKEN_REVOCATION_FAILED', { reason });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', loginRateLimit, asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const kickPriorSessions = req.body?.kickPriorSessions === true;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  const clientSessionId = resolveClientSessionId(req, res);
  const ipSubnet = deriveIpSubnet(req.ip);

  if (!email || !password) {
    throw new ValidationError('Email and password required');
  }

  try {
    const user = await UserModel.findByEmail(email);

    if (!user) {
      await logAuditOrThrow({
        action_type: 'LOGIN_FAILED',
        action_details: { reason: 'User not found', email },
        ip_address: ip,
        user_agent: userAgent,
      }, 'LOGIN_FAILED_USER_NOT_FOUND');
      throw new AuthenticationError('Invalid credentials');
    }

    if (user.is_active === false) {
      await logAuditOrThrow({
        user_id: String(user.id),
        action_type: 'LOGIN_FAILED',
        action_details: { reason: 'User inactive', email },
        ip_address: ip,
        user_agent: userAgent,
      }, 'LOGIN_FAILED_USER_INACTIVE');
      throw new AuthorizationError('Account is inactive');
    }

    const now = new Date();
    if (user.locked_until && new Date(user.locked_until).getTime() > now.getTime()) {
      await logAuditOrThrow({
        user_id: String(user.id),
        action_type: 'LOGIN_BLOCKED',
        action_details: {
          reason: 'ACCOUNT_LOCKED',
          locked_until: new Date(user.locked_until).toISOString(),
          email,
        },
        ip_address: ip,
        user_agent: userAgent,
      }, 'LOGIN_BLOCKED_ACCOUNT_LOCKED');
      return res.status(423).json({
        error: 'Account is temporarily locked due to repeated failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: new Date(user.locked_until).toISOString(),
      });
    }

    const valid = await UserModel.verifyPassword(user, password);
    if (!valid) {
      const failedAttempts = await UserModel.incrementFailedLoginAttempts(user.id);
      const lockThreshold = toPositiveFiniteNumber(MAX_FAILED_LOGIN_ATTEMPTS, 5);
      if (failedAttempts >= lockThreshold) {
        const nextLockoutCount = (user.lockout_count ?? 0) + 1;
        const lockMinutes = computeLockoutDurationMinutes(nextLockoutCount);
        const lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
        await UserModel.applyLoginLockout(user.id, lockedUntil);
        await logAuditOrThrow({
          user_id: String(user.id),
          action_type: 'ACCOUNT_LOCKED',
          action_details: {
            email,
            failed_attempts: failedAttempts,
            lockout_count: nextLockoutCount,
            lockout_minutes: lockMinutes,
            locked_until: lockedUntil.toISOString(),
          },
          ip_address: ip,
          user_agent: userAgent,
        }, 'LOGIN_ACCOUNT_LOCKED');
      }
      await logAuditOrThrow({
        user_id: String(user.id),
        action_type: 'LOGIN_FAILED',
        action_details: { reason: 'Invalid password', email, failed_attempts: failedAttempts },
        ip_address: ip,
        user_agent: userAgent,
      }, 'LOGIN_FAILED_INVALID_PASSWORD');
      throw new AuthenticationError('Invalid credentials');
    }

    const loginRole = deriveCanonicalRole({
      roleFromDb: user.role,
      isAdminFlag: user.is_admin,
      establishmentId: user.establishment_id,
    });

    if (isAdminTwoFactorEnforced() && requiresAdminTwoFactor(loginRole)) {
      const mfaState = await UserModel.getMfaTotpState(user.id);
      if (!mfaState?.mfa_totp_enabled || !mfaState.mfa_totp_secret) {
        await logAuditOrThrow({
          user_id: String(user.id),
          action_type: 'LOGIN_BLOCKED',
          action_details: {
            reason: 'ADMIN_2FA_SETUP_REQUIRED',
            email,
            role: loginRole,
          },
          ip_address: ip,
          user_agent: userAgent,
        }, 'LOGIN_BLOCKED_ADMIN_2FA_SETUP_REQUIRED');
        throw new AppError(
          'Two-factor authentication setup is required for this admin account',
          403,
          'ADMIN_2FA_SETUP_REQUIRED'
        );
      }

      const totpCode = typeof req.body?.totpCode === 'string' ? req.body.totpCode.trim() : '';
      const isValidTotp =
        totpCode.length > 0 &&
        speakeasy.totp.verify({
          secret: mfaState.mfa_totp_secret,
          encoding: 'base32',
          token: totpCode,
          window: 1,
        });
      if (!isValidTotp) {
        await logAuditOrThrow({
          user_id: String(user.id),
          action_type: 'LOGIN_FAILED',
          action_details: {
            reason: 'INVALID_2FA_CODE',
            email,
            role: loginRole,
          },
          ip_address: ip,
          user_agent: userAgent,
        }, 'LOGIN_FAILED_INVALID_2FA_CODE');
        throw new AppError('Invalid two-factor authentication code', 401, 'INVALID_2FA_CODE');
      }
    }

    await UserModel.clearLoginLockoutState(user.id);

    // Fetch the full user record to build the JWT payload
    const d = await UserModel.getAuthLoginDetails(user.id);

    const is_admin: boolean = d?.is_admin ?? user.is_admin;
    const establishment_id: string | null = d?.establishment_id || null;
    const role: CanonicalAuthRole = deriveCanonicalRole({
      roleFromDb: d?.role,
      isAdminFlag: is_admin,
      establishmentId: establishment_id,
    });

    if (kickPriorSessions) {
      const revokeBeforeIat = Math.floor(Date.now() / 1000);
      await TokenBlocklistModel.revokeAllUserTokensIssuedBefore(
        user.id,
        revokeBeforeIat,
        'LOGIN_KICK_PRIOR_SESSIONS'
      );
    }

    const token = generateToken(
      { id: user.id, email: user.email, role, establishment_id },
      !!rememberMe
    );
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const { expiresAt, refreshExpiresIn } = computeRefreshExpiry(!!rememberMe);
    await RefreshTokenModel.create({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ipAddress: req.ip,
      ipSubnet: ipSubnet ?? undefined,
      userAgent: req.headers['user-agent'],
      clientId: clientSessionId,
    });
    setRefreshTokenCookie(res, refreshToken, !!rememberMe, expiresAt);
    setCsrfTokenCookie(res, csrfToken, !!rememberMe, expiresAt);

    await logAuditOrThrow({
      user_id: String(user.id),
      action_type: 'LOGIN',
      action_details: { email, rememberMe: !!rememberMe, kickPriorSessions },
      ip_address: ip,
      user_agent: userAgent,
    }, 'LOGIN_SUCCESS');

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        is_admin,
        role,
        first_name: d?.first_name || '',
        last_name: d?.last_name || '',
        establishment_id,
        permissions: [],
      },
      expiresIn: '15m',
      refreshExpiresIn,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    Logger.getInstance().error('Login error', error as Error);
    throw new AppError('Internal server error during login', 500, 'LOGIN_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// 2FA / TOTP enrollment and management
// ---------------------------------------------------------------------------
router.get('/2fa/totp/status', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new NotFoundError('User');
  }

  const role = deriveCanonicalRole({
    roleFromDb: dbUser.role,
    isAdminFlag: dbUser.is_admin,
    establishmentId: dbUser.establishment_id,
  });

  return res.json({
    enabled: dbUser.mfa_totp_enabled === true,
    required_for_role: isAdminTwoFactorEnforced() && requiresAdminTwoFactor(role),
    role,
  });
}));

router.post('/2fa/totp/setup', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new NotFoundError('User');
  }

  const generatedSecret = speakeasy.generateSecret({
    length: 20,
    name: `${TOTP_ISSUER}:${dbUser.email}`,
    issuer: TOTP_ISSUER,
  });
  const secret = generatedSecret.base32;
  const otpauthUrl = generatedSecret.otpauth_url;
  if (!secret || !otpauthUrl) {
    throw new AppError('Failed to generate TOTP setup material', 500, 'MFA_TOTP_SETUP_GENERATION_FAILED');
  }
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  await UserModel.setMfaTotpSecret(userId, secret);

  await logAuditOrThrow({
    user_id: String(userId),
    action_type: 'MFA_TOTP_SETUP_STARTED',
    action_details: { issuer: TOTP_ISSUER },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'MFA_TOTP_SETUP_STARTED');

  return res.json({
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  });
}));

router.post('/2fa/totp/enable', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!code) {
    throw new ValidationError('code is required');
  }

  const mfaState = await UserModel.getMfaTotpState(userId);
  if (!mfaState?.mfa_totp_secret) {
    throw new ValidationError('TOTP setup is required before enabling two-factor authentication');
  }

  if (!speakeasy.totp.verify({
    secret: mfaState.mfa_totp_secret,
    encoding: 'base32',
    token: code,
    window: 1,
  })) {
    throw new ValidationError('Invalid two-factor authentication code');
  }

  await UserModel.enableMfaTotp(userId);
  await logAuditOrThrow({
    user_id: String(userId),
    action_type: 'MFA_TOTP_ENABLED',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'MFA_TOTP_ENABLED');

  return res.json({ message: 'Two-factor authentication enabled' });
}));

router.post('/2fa/totp/disable', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!code || !password) {
    throw new ValidationError('code and password are required');
  }

  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new NotFoundError('User');
  }

  const validPassword = await UserModel.verifyPassword(dbUser, password);
  if (!validPassword) {
    throw new AuthenticationError('Invalid credentials');
  }

  const mfaState = await UserModel.getMfaTotpState(userId);
  if (!mfaState?.mfa_totp_enabled || !mfaState.mfa_totp_secret) {
    throw new ValidationError('Two-factor authentication is not enabled');
  }
  if (!speakeasy.totp.verify({
    secret: mfaState.mfa_totp_secret,
    encoding: 'base32',
    token: code,
    window: 1,
  })) {
    throw new ValidationError('Invalid two-factor authentication code');
  }

  await UserModel.disableMfaTotp(userId);
  await logAuditOrThrow({
    user_id: String(userId),
    action_type: 'MFA_TOTP_DISABLED',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'MFA_TOTP_DISABLED');

  return res.json({ message: 'Two-factor authentication disabled' });
}));

// ---------------------------------------------------------------------------
// GET /api/auth/me — returns current user info and permissions
// Two lightweight indexed queries: users by PK + permissions join
// ---------------------------------------------------------------------------
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user!.id;

    const [userResult, permissions] = await Promise.all([
      UserModel.getAuthMeProfile(userId),
      UserModel.getUserPermissions(userId).catch(() => [] as string[]),
    ]);

    const userRow = userResult;

    return res.json({
      id: userId,
      email: req.user!.email,
      is_admin: req.user!.is_admin,
      role: req.user!.role,
      establishment_id: req.user!.establishment_id,
      first_name: userRow?.first_name || '',
      last_name: userRow?.last_name || '',
      email_verified: userRow?.email_verified ?? false,
      permissions,
      support_impersonation: req.user!.support_impersonation ?? null,
    });
  } catch {
    throw new AppError('Internal server error', 500, 'AUTH_ME_FAILED');
  }
}));

router.get('/sessions', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const currentRefreshToken = getRefreshTokenFromRequest(req);
  let currentFamilyId: string | null = null;
  if (currentRefreshToken) {
    const currentSession = await RefreshTokenModel.findActiveByRawToken(currentRefreshToken);
    if (currentSession?.user_id === userId) {
      currentFamilyId = currentSession.family_id;
    }
  }

  const sessions = await RefreshTokenModel.listActiveSessionsByUser(userId);
  return res.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      familyId: session.familyId,
      issuedAt: session.issuedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      ipAddress: session.ipAddress,
      ipSubnet: session.ipSubnet,
      userAgent: session.userAgent,
      clientId: session.clientId,
      isCurrent: currentFamilyId === session.familyId,
    })),
  });
}));

router.post('/sessions/revoke-others', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const refreshTokenRaw = getRefreshTokenFromRequest(req);
  if (!refreshTokenRaw) {
    throw new ValidationError('Refresh token cookie is required to revoke other sessions');
  }

  const currentSession = await RefreshTokenModel.findActiveByRawToken(refreshTokenRaw);
  if (!currentSession || currentSession.user_id !== userId) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  const revokedCount = await RefreshTokenModel.revokeAllForUserExceptFamily(
    userId,
    currentSession.family_id,
    'USER_REVOKE_OTHER_SESSIONS'
  );

  await logAuditOrThrow({
    user_id: String(userId),
    action_type: 'REVOKE_OTHER_SESSIONS',
    action_details: {
      revoked_count: revokedCount,
      preserved_family_id: currentSession.family_id,
    },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'REVOKE_OTHER_SESSIONS');

  return res.json({
    message: 'Other sessions revoked',
    revokedCount,
  });
}));

// ---------------------------------------------------------------------------
// POST /api/auth/refresh — re-issue token with current DB state
// ---------------------------------------------------------------------------
router.post('/refresh', refreshRateLimit, asyncHandler(async (req, res) => {
  const lockClient = await pool.connect();
  let refreshFamilyId: string | null = null;
  let refreshUserId: number | null = null;
  try {
    await lockClient.query('BEGIN');
    const refreshTokenRaw = getRefreshTokenFromRequest(req);
    const rememberMe = req.body?.rememberMe === true;
    if (!refreshTokenRaw || typeof refreshTokenRaw !== 'string') {
      throw new ValidationError('Refresh token cookie is required');
    }
    validateRefreshCsrf(req);
    const clientSessionId = resolveClientSessionId(req, res);
    const ipSubnet = deriveIpSubnet(req.ip);
    const currentUserAgent = normalizeUserAgent(req.headers['user-agent']);

    const refreshSession = await RefreshTokenModel.findActiveByRawToken(refreshTokenRaw);
    if (!refreshSession) {
      clearRefreshTokenCookie(res);
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    refreshFamilyId = refreshSession.family_id;
    const userId = refreshSession.user_id;
    refreshUserId = userId;
    const familyIssuedAt = await RefreshTokenModel.getFamilyIssuedAt(refreshSession.family_id);
    const refreshSessionStartedAt = familyIssuedAt ?? refreshSession.issued_at ?? new Date();

    await lockClient.query('SELECT pg_advisory_xact_lock($1::bigint)', [userId]);

    // Re-fetch role and establishment_id in case they changed since last login
    const d = await UserModel.getAuthRoleState(userId);
    if (!d) {
      throw new NotFoundError('User');
    }
    const userRow = await UserModel.findById(userId);
    if (!userRow) {
      throw new NotFoundError('User');
    }
    const now = new Date();
    if (userRow.is_active === false) {
      await RefreshTokenModel.revokeAllForUser(userId, 'USER_INACTIVE_REFRESH_BLOCK');
      clearRefreshTokenCookie(res);
      clearCsrfTokenCookie(res);
      await logAuditOrThrow({
        user_id: String(userId),
        action_type: 'TOKEN_REFRESH_BLOCKED',
        action_details: { reason: 'USER_INACTIVE' },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      }, 'TOKEN_REFRESH_BLOCKED_USER_INACTIVE');
      throw new AuthorizationError('Account is inactive');
    }

    const lockedUntil = userRow.locked_until ? new Date(userRow.locked_until) : null;
    if (lockedUntil && lockedUntil.getTime() > now.getTime()) {
      await RefreshTokenModel.revokeAllForUser(userId, 'ACCOUNT_LOCKED_REFRESH_BLOCK');
      clearRefreshTokenCookie(res);
      clearCsrfTokenCookie(res);
      await logAuditOrThrow({
        user_id: String(userId),
        action_type: 'TOKEN_REFRESH_BLOCKED',
        action_details: {
          reason: 'ACCOUNT_LOCKED',
          locked_until: lockedUntil.toISOString(),
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      }, 'TOKEN_REFRESH_BLOCKED_ACCOUNT_LOCKED');
      throw new AuthorizationError('Account is locked');
    }
    const is_admin: boolean = d.is_admin;
    const establishment_id: string | null = d.establishment_id || null;
    const role: CanonicalAuthRole = deriveCanonicalRole({
      roleFromDb: d.role,
      isAdminFlag: is_admin,
      establishmentId: establishment_id,
    });
    logRefreshSessionAnomalySignal(refreshSession, {
      clientId: clientSessionId,
      ipSubnet,
      userAgent: currentUserAgent,
      role,
      userId,
      requestId: req.requestId,
    });

    const token = generateToken(
      { id: userId, email: userRow.email, role, establishment_id },
      !!rememberMe
    );
    const nextRefreshToken = crypto.randomBytes(32).toString('hex');
    const nextCsrfToken = crypto.randomBytes(32).toString('hex');
    const { expiresAt, refreshExpiresIn } = computeRefreshExpiry(!!rememberMe, refreshSessionStartedAt);
    if (expiresAt.getTime() <= Date.now()) {
      await RefreshTokenModel.revokeFamily(refreshSession.family_id, 'ABSOLUTE_SESSION_CAP_REACHED');
      clearRefreshTokenCookie(res);
      clearCsrfTokenCookie(res);
      throw new AuthenticationError('Session expired. Please log in again.');
    }
    await RefreshTokenModel.rotate(refreshTokenRaw, nextRefreshToken, {
      userId,
      familyId: refreshSession.family_id,
      expiresAt,
      ipAddress: req.ip,
      ipSubnet: ipSubnet ?? undefined,
      userAgent: currentUserAgent ?? undefined,
      clientId: clientSessionId,
    });

    await logAuditOrThrow({
      user_id: String(userId),
      action_type: 'TOKEN_REFRESH',
      action_details: { rememberMe: !!rememberMe },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'TOKEN_REFRESH');

    await lockClient.query('COMMIT');
    setRefreshTokenCookie(res, nextRefreshToken, !!rememberMe, expiresAt);
    setCsrfTokenCookie(res, nextCsrfToken, !!rememberMe, expiresAt);
    return res.json({
      token,
      expiresIn: '15m',
      refreshExpiresIn,
    });
  } catch (error) {
    await lockClient.query('ROLLBACK');
    if (error instanceof Error && error.message === 'REFRESH_TOKEN_ALREADY_USED_OR_EXPIRED') {
      if (refreshFamilyId) {
        try {
          await RefreshTokenModel.revokeFamily(refreshFamilyId, 'REUSE_DETECTED');
          if (refreshUserId !== null) {
            const revokeBeforeIat = Math.floor(Date.now() / 1000);
            await TokenBlocklistModel.revokeAllUserTokensIssuedBefore(
              refreshUserId,
              revokeBeforeIat,
              'REFRESH_REUSE_DETECTED'
            );
          }
        } catch (revokeError) {
          Logger.getInstance().error(
            `Failed to revoke refresh token family ${refreshFamilyId} after reuse detection`,
            revokeError as Error,
            'AUTH_ROUTE'
          );
        }
      }
      clearRefreshTokenCookie(res);
      clearCsrfTokenCookie(res);
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Internal server error', 500, 'TOKEN_REFRESH_FAILED');
  } finally {
    lockClient.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/auth/support/impersonation/start
// Time-bounded support impersonation to one establishment (audited).
// ---------------------------------------------------------------------------
router.post('/support/impersonation/start', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const actorUserId = req.user!.id;
  const actorEmail = req.user!.email;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  const clientSessionId = resolveClientSessionId(req, res);
  const ipSubnet = deriveIpSubnet(req.ip);
  const currentUserAgent = normalizeUserAgent(userAgent);

  const establishmentIdRaw = req.body?.establishment_id;
  const reasonRaw = req.body?.reason;
  const durationRaw = req.body?.duration_minutes;

  const establishment_id = typeof establishmentIdRaw === 'string' ? establishmentIdRaw.trim() : '';
  const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : '';
  const duration_minutes = Number.isFinite(Number(durationRaw))
    ? Math.max(1, Math.min(MAX_SUPPORT_IMPERSONATION_MINUTES, Math.floor(Number(durationRaw))))
    : 30;

  if (!establishment_id) {
    throw new ValidationError('establishment_id is required');
  }
  if (!reason || reason.length < 5) {
    throw new ValidationError('reason is required (minimum 5 characters)');
  }

  try {
    const activeSessions = await RefreshTokenModel.listActiveSessionsByUser(actorUserId);
    const latestSession = activeSessions[0];
    if (latestSession) {
      logAdminEndpointAnomalySignal(
        'auth.support_impersonation.start',
        {
          clientId: latestSession.clientId,
          ipSubnet: latestSession.ipSubnet,
          userAgent: latestSession.userAgent,
        },
        {
          clientId: clientSessionId,
          ipSubnet,
          userAgent: currentUserAgent,
          userId: actorUserId,
          requestId: req.requestId,
        }
      );
    }
  } catch {
    // Best-effort anomaly signaling; do not block impersonation start on telemetry issues.
  }

  if (isAdminTwoFactorEnforced()) {
    const mfaState = await UserModel.getMfaTotpState(actorUserId);
    if (!mfaState?.mfa_totp_enabled || !mfaState.mfa_totp_secret) {
      await logAuditOrThrow({
        user_id: String(actorUserId),
        action_type: 'SUPPORT_IMPERSONATION_BLOCKED',
        action_details: {
          reason: 'ADMIN_2FA_SETUP_REQUIRED',
          establishment_id,
        },
        ip_address: ip,
        user_agent: userAgent,
      }, 'SUPPORT_IMPERSONATION_BLOCKED_ADMIN_2FA_SETUP_REQUIRED');
      throw new AppError(
        'Two-factor authentication setup is required for support impersonation',
        403,
        'SUPPORT_IMPERSONATION_2FA_SETUP_REQUIRED'
      );
    }

    const totpCode = typeof req.body?.totpCode === 'string' ? req.body.totpCode.trim() : '';
    const isValidTotp =
      totpCode.length > 0 &&
      speakeasy.totp.verify({
        secret: mfaState.mfa_totp_secret,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });
    if (!isValidTotp) {
      await logAuditOrThrow({
        user_id: String(actorUserId),
        action_type: 'SUPPORT_IMPERSONATION_BLOCKED',
        action_details: {
          reason: 'INVALID_2FA_CODE',
          establishment_id,
        },
        ip_address: ip,
        user_agent: userAgent,
      }, 'SUPPORT_IMPERSONATION_BLOCKED_INVALID_2FA_CODE');
      throw new AppError(
        'Invalid two-factor authentication code',
        401,
        'SUPPORT_IMPERSONATION_INVALID_2FA_CODE'
      );
    }
  }

  try {
    const estResult = await pool.query('SELECT id, name FROM establishments WHERE id = $1', [establishment_id]);
    if (estResult.rows.length === 0) {
      throw new NotFoundError('Target establishment');
    }
    const estName = String(estResult.rows[0].name ?? '');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration_minutes * 60 * 1000);
    const supportToken = generateToken(
      {
        id: actorUserId,
        email: actorEmail,
        role: 'system_admin',
        establishment_id,
        support_impersonation: {
          actor_user_id: actorUserId,
          reason,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
      },
      false,
      `${duration_minutes}m`
    );

    await logAuditOrThrow({
      user_id: String(actorUserId),
      establishment_id,
      action_type: 'SUPPORT_IMPERSONATION_STARTED',
      resource_type: 'ESTABLISHMENT',
      resource_id: establishment_id,
      action_details: {
        target_establishment_name: estName,
        reason,
        duration_minutes,
        token_expires_at: expiresAt.toISOString(),
      },
      ip_address: ip,
      user_agent: userAgent,
    }, 'SUPPORT_IMPERSONATION_STARTED');

    const authorization = req.headers.authorization;
    const currentToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (currentToken) {
      await revokeTokenOrThrow(currentToken, actorUserId, 'SUPPORT_IMPERSONATION_STARTED');
    }

    return res.json({
      message: 'Support impersonation started',
      token: supportToken,
      expires_at: expiresAt.toISOString(),
      establishment_id,
      reason,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    Logger.getInstance().error('Failed to start support impersonation', error as Error, 'AUTH_ROUTE');
    throw new AppError('Failed to start support impersonation', 500, 'SUPPORT_IMPERSONATION_START_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// POST /api/auth/support/impersonation/stop
// End support impersonation and return a standard system_admin token.
// ---------------------------------------------------------------------------
router.post('/support/impersonation/stop', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const actorUserId = req.user!.id;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  const clientSessionId = resolveClientSessionId(req, res);
  const ipSubnet = deriveIpSubnet(req.ip);
  const currentUserAgent = normalizeUserAgent(userAgent);
  const currentImpersonation = req.user?.support_impersonation;

  if (!currentImpersonation || !req.user?.establishment_id) {
    throw new ValidationError('No active support impersonation session in this token');
  }

  try {
    const activeSessions = await RefreshTokenModel.listActiveSessionsByUser(actorUserId);
    const latestSession = activeSessions[0];
    if (latestSession) {
      logAdminEndpointAnomalySignal(
        'auth.support_impersonation.stop',
        {
          clientId: latestSession.clientId,
          ipSubnet: latestSession.ipSubnet,
          userAgent: latestSession.userAgent,
        },
        {
          clientId: clientSessionId,
          ipSubnet,
          userAgent: currentUserAgent,
          userId: actorUserId,
          requestId: req.requestId,
        }
      );
    }
  } catch {
    // Best-effort anomaly signaling; do not block impersonation stop on telemetry issues.
  }

  try {
    const d = await UserModel.getAuthRoleState(actorUserId);
    if (!d) {
      throw new NotFoundError('User');
    }

    const resetToken = generateToken(
      {
        id: actorUserId,
        email: req.user!.email,
        role: 'system_admin',
        establishment_id: null,
      },
      false
    );

    await logAuditOrThrow({
      user_id: String(actorUserId),
      establishment_id: req.user.establishment_id,
      action_type: 'SUPPORT_IMPERSONATION_ENDED',
      resource_type: 'ESTABLISHMENT',
      resource_id: req.user.establishment_id,
      action_details: {
        reason: currentImpersonation.reason,
        started_at: currentImpersonation.started_at,
        ended_at: new Date().toISOString(),
      },
      ip_address: ip,
      user_agent: userAgent,
    }, 'SUPPORT_IMPERSONATION_ENDED');

    const authorization = req.headers.authorization;
    const currentToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (currentToken) {
      await revokeTokenOrThrow(currentToken, actorUserId, 'SUPPORT_IMPERSONATION_ENDED');
    }

    return res.json({
      message: 'Support impersonation ended',
      token: resetToken,
      expiresIn: '15m',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    Logger.getInstance().error('Failed to stop support impersonation', error as Error, 'AUTH_ROUTE');
    throw new AppError('Failed to stop support impersonation', 500, 'SUPPORT_IMPERSONATION_STOP_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req, { allowBodyFallback: true });
  const authorization = req.headers.authorization;
  const currentToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (currentToken) {
    await revokeTokenOrThrow(currentToken, req.user!.id, 'LOGOUT');
  }
  if (refreshToken) {
    await RefreshTokenModel.revokeByRawToken(refreshToken, 'LOGOUT');
  }
  clearRefreshTokenCookie(res);
  clearCsrfTokenCookie(res);

  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'LOGOUT',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'LOGOUT');
  return res.json({ message: 'Logged out' });
}));

export default router;

