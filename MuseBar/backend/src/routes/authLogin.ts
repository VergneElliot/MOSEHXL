import express from 'express';
import { UserModel } from '../models/user';
import { AuditTrailModel } from '../models/auditTrail';
import { Logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import {
  generateToken,
  requireAdmin,
  requireAuth,
} from '../middleware/auth';
import { pool } from '../app';

const router = express.Router();

type CanonicalRole = 'system_admin' | 'establishment_admin' | 'staff';
const MAX_SUPPORT_IMPERSONATION_MINUTES = 120;

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

function normalizeRole(raw: unknown): CanonicalRole | null {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (!v) return null;

  // Canonical roles
  if (v === 'system_admin' || v === 'establishment_admin' || v === 'staff') return v;

  // Legacy / transitional roles
  if (v === 'system_operator') return 'system_admin';
  if (v === 'admin') return 'establishment_admin';
  if (v === 'cashier' || v === 'manager') return 'staff';

  // Unknown role string: treat as non-admin staff (fail-safe).
  return 'staff';
}

function deriveRole(opts: { roleFromDb: unknown; isAdminFlag: boolean; establishmentId: string | null }): CanonicalRole {
  const normalized = normalizeRole(opts.roleFromDb);
  if (normalized) return normalized;

  // Backward-compatible fallback: if role is absent in DB, rely on legacy is_admin.
  if (opts.isAdminFlag) return 'system_admin';

  // If the user belongs to an establishment, default to staff (least privilege).
  if (opts.establishmentId) return 'staff';

  // No establishment + not admin: treat as system scope staff (least privilege).
  return 'staff';
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await UserModel.verifyPassword(user, password);
    if (!valid) {
      await logAuditOrThrow({
        user_id: String(user.id),
        action_type: 'LOGIN_FAILED',
        action_details: { reason: 'Invalid password', email },
        ip_address: ip,
        user_agent: userAgent,
      }, 'LOGIN_FAILED_INVALID_PASSWORD');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch the full user record to build the JWT payload
    const d = await UserModel.getAuthLoginDetails(user.id);

    const is_admin: boolean = d?.is_admin ?? user.is_admin;
    const establishment_id: string | null = d?.establishment_id || null;
    const role: CanonicalRole = deriveRole({ roleFromDb: d?.role, isAdminFlag: is_admin, establishmentId: establishment_id });

    const token = generateToken(
      { id: user.id, email: user.email, is_admin, role, establishment_id },
      !!rememberMe
    );

    await logAuditOrThrow({
      user_id: String(user.id),
      action_type: 'LOGIN',
      action_details: { email, rememberMe: !!rememberMe },
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
      expiresIn: !!rememberMe ? '7d' : '12h',
    });
  } catch (error) {
    Logger.getInstance().error('Login error', error as Error);
    throw new AppError('Internal server error during login', 500, 'LOGIN_FAILED');
  }
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

// ---------------------------------------------------------------------------
// POST /api/auth/refresh — re-issue token with current DB state
// ---------------------------------------------------------------------------
router.post('/refresh', requireAuth, asyncHandler(async (req, res) => {
  try {
    if (req.user?.support_impersonation) {
      return res.status(400).json({
        error: 'Impersonation tokens cannot be refreshed. Start a new support impersonation session instead.'
      });
    }
    const { rememberMe } = req.body;
    const userId = req.user!.id;

    // Re-fetch role and establishment_id in case they changed since last login
    const d = await UserModel.getAuthRoleState(userId);
    if (!d) {
      return res.status(404).json({ error: 'User not found' });
    }
    const is_admin: boolean = d.is_admin;
    const establishment_id: string | null = d.establishment_id || null;
    const role: CanonicalRole = deriveRole({ roleFromDb: d.role, isAdminFlag: is_admin, establishmentId: establishment_id });

    const token = generateToken(
      { id: userId, email: req.user!.email, is_admin, role, establishment_id },
      !!rememberMe
    );

    await logAuditOrThrow({
      user_id: String(userId),
      action_type: 'TOKEN_REFRESH',
      action_details: { email: req.user!.email, rememberMe: !!rememberMe },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'TOKEN_REFRESH');

    return res.json({ token, expiresIn: rememberMe ? '7d' : '12h' });
  } catch {
    throw new AppError('Internal server error', 500, 'TOKEN_REFRESH_FAILED');
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

  const establishmentIdRaw = req.body?.establishment_id;
  const reasonRaw = req.body?.reason;
  const durationRaw = req.body?.duration_minutes;

  const establishment_id = typeof establishmentIdRaw === 'string' ? establishmentIdRaw.trim() : '';
  const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : '';
  const duration_minutes = Number.isFinite(Number(durationRaw))
    ? Math.max(1, Math.min(MAX_SUPPORT_IMPERSONATION_MINUTES, Math.floor(Number(durationRaw))))
    : 30;

  if (!establishment_id) {
    return res.status(400).json({ error: 'establishment_id is required' });
  }
  if (!reason || reason.length < 5) {
    return res.status(400).json({ error: 'reason is required (minimum 5 characters)' });
  }

  try {
    const estResult = await pool.query('SELECT id, name FROM establishments WHERE id = $1', [establishment_id]);
    if (estResult.rows.length === 0) {
      return res.status(404).json({ error: 'Target establishment not found' });
    }
    const estName = String(estResult.rows[0].name ?? '');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration_minutes * 60 * 1000);
    const supportToken = generateToken(
      {
        id: actorUserId,
        email: actorEmail,
        is_admin: req.user!.is_admin,
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

    return res.json({
      message: 'Support impersonation started',
      token: supportToken,
      expires_at: expiresAt.toISOString(),
      establishment_id,
      reason,
    });
  } catch (error) {
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
  const currentImpersonation = req.user?.support_impersonation;

  if (!currentImpersonation || !req.user?.establishment_id) {
    return res.status(400).json({ error: 'No active support impersonation session in this token' });
  }

  try {
    const d = await UserModel.getAuthRoleState(actorUserId);
    if (!d) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = generateToken(
      {
        id: actorUserId,
        email: req.user!.email,
        is_admin: d.is_admin,
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

    return res.json({
      message: 'Support impersonation ended',
      token: resetToken,
      expiresIn: '12h',
    });
  } catch (error) {
    Logger.getInstance().error('Failed to stop support impersonation', error as Error, 'AUTH_ROUTE');
    throw new AppError('Failed to stop support impersonation', 500, 'SUPPORT_IMPERSONATION_STOP_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'LOGOUT',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'LOGOUT');
  return res.json({ message: 'Logged out' });
}));

export default router;

