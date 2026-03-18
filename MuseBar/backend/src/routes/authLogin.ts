import express from 'express';
import { UserModel } from '../models/user';
import { pool } from '../app';
import { AuditTrailModel } from '../models/auditTrail';
import { Logger } from '../utils/logger';
import {
  generateToken,
  requireAuth,
} from '../middleware/auth';

const router = express.Router();

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
    const detailsResult = await pool.query(
      `SELECT first_name, last_name, role, establishment_id, is_admin, email_verified
       FROM users WHERE id = $1`,
      [user.id]
    );
    const d = detailsResult.rows[0] || {};

    const is_admin: boolean = d.is_admin ?? user.is_admin;
    const role: string = is_admin ? 'system_admin' : (d.role || 'establishment_admin');
    const establishment_id: string | null = d.establishment_id || null;

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
        first_name: d.first_name || '',
        last_name: d.last_name || '',
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
      pool.query(
        'SELECT first_name, last_name, email_verified FROM users WHERE id = $1',
        [userId]
      ),
      UserModel.getUserPermissions(userId).catch(() => [] as string[]),
    ]);

    const userRow = userResult.rows[0] || {};

    return res.json({
      id: userId,
      email: req.user!.email,
      is_admin: req.user!.is_admin,
      role: req.user!.role,
      establishment_id: req.user!.establishment_id,
      first_name: userRow.first_name || '',
      last_name: userRow.last_name || '',
      email_verified: userRow.email_verified ?? false,
      permissions,
    });
  } catch (error) {
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
    const result = await pool.query(
      'SELECT role, establishment_id, is_admin FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const d = result.rows[0];
    const is_admin: boolean = d.is_admin;
    const role: string = is_admin ? 'system_admin' : (d.role || 'establishment_admin');
    const establishment_id: string | null = d.establishment_id || null;

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
  } catch (error) {
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

