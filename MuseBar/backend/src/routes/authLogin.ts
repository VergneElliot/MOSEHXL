import express from 'express';
import { UserModel } from '../models/user';
import { AuditTrailModel } from '../models/auditTrail';
import { Logger } from '../utils/logger';
import {
  generateToken,
  requireAuth,
} from '../middleware/auth';

const router = express.Router();

type CanonicalRole = 'system_admin' | 'establishment_admin' | 'staff';

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
router.post('/login', async (req, res) => {
  const logger = Logger.getInstance();
  const { email, password, rememberMe } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = await UserModel.findByEmail(email);

    if (!user) {
      await AuditTrailModel.logAction({
        action_type: 'LOGIN_FAILED',
        action_details: { reason: 'User not found', email },
        ip_address: ip,
        user_agent: userAgent,
      }).catch(() => {});
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await UserModel.verifyPassword(user, password);
    if (!valid) {
      await AuditTrailModel.logAction({
        user_id: String(user.id),
        action_type: 'LOGIN_FAILED',
        action_details: { reason: 'Invalid password', email },
        ip_address: ip,
        user_agent: userAgent,
      }).catch(() => {});
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

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'LOGIN',
      action_details: { email, rememberMe: !!rememberMe },
      ip_address: ip,
      user_agent: userAgent,
    }).catch(() => {});

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
    logger.error('Login error', error as Error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — returns current user info and permissions
// Two lightweight indexed queries: users by PK + permissions join
// ---------------------------------------------------------------------------
router.get('/me', requireAuth, async (req, res) => {
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
    });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh — re-issue token with current DB state
// ---------------------------------------------------------------------------
router.post('/refresh', requireAuth, async (req, res) => {
  try {
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

    await AuditTrailModel.logAction({
      user_id: String(userId),
      action_type: 'TOKEN_REFRESH',
      action_details: { email: req.user!.email, rememberMe: !!rememberMe },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }).catch(() => {});

    return res.json({ token, expiresIn: rememberMe ? '7d' : '12h' });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', requireAuth, async (req, res) => {
  await AuditTrailModel.logAction({
    user_id: String(req.user!.id),
    action_type: 'LOGOUT',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }).catch(() => {});
  return res.json({ message: 'Logged out' });
});

export default router;

