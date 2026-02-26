import express from 'express';
import { UserModel } from '../models/user';
import { pool } from '../app';
import { AuditTrailModel } from '../models/auditTrail';
import { Logger } from '../utils/logger';

// Middleware lives in middleware/auth.ts (single source of truth).
// Re-exported here so existing `import { requireAuth } from '../routes/auth'`
// statements keep working without a mass-rename.
import {
  generateToken,
  requireAuth,
  requireAdmin,
  requireEstablishmentAdmin,
  requirePermission,
} from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';

export {
  generateToken,
  requireAuth,
  requireAdmin,
  requireEstablishmentAdmin,
  requirePermission,
};
export type { JwtPayload };

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

    const token = generateToken({ id: user.id, email: user.email, is_admin, role, establishment_id }, !!rememberMe);

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

// ---------------------------------------------------------------------------
// POST /api/auth/register — create a system-level user (system_admin only).
// Does NOT set establishment_id or role. For creating establishment users,
// use POST /api/auth/users which is scoped by requireEstablishmentAdmin.
// ---------------------------------------------------------------------------
router.post('/register', requireAuth, requireAdmin, async (req, res) => {
  const { email, password, is_admin } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!email || !password) {
    await AuditTrailModel.logAction({
      user_id: String(req.user!.id),
      action_type: 'CREATE_USER_FAILED',
      action_details: { reason: 'Missing email or password', email },
      ip_address: ip,
      user_agent: userAgent,
    }).catch(() => {});
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = await UserModel.createUser(email, password, !!is_admin);
    await AuditTrailModel.logAction({
      user_id: String(req.user!.id),
      action_type: 'CREATE_USER',
      resource_type: 'USER',
      resource_id: String(user.id),
      action_details: { email, is_admin },
      ip_address: ip,
      user_agent: userAgent,
    }).catch(() => {});
    return res.status(201).json({ id: user.id, email: user.email, is_admin: user.is_admin });
  } catch {
    await AuditTrailModel.logAction({
      user_id: String(req.user!.id),
      action_type: 'CREATE_USER_FAILED',
      action_details: { reason: 'User already exists or invalid data', email },
      ip_address: ip,
      user_agent: userAgent,
    }).catch(() => {});
    return res.status(400).json({ error: 'User already exists or invalid data' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/users — list users scoped to the requester's establishment
// ---------------------------------------------------------------------------
router.get('/users', requireAuth, requireEstablishmentAdmin, async (req, res) => {
  const establishmentId = req.user!.establishment_id;
  const result = await pool.query(
    'SELECT id, email, is_admin, role, establishment_id, first_name, last_name, created_at FROM users WHERE establishment_id = $1 ORDER BY id',
    [establishmentId]
  );
  return res.json(result.rows);
});

// ---------------------------------------------------------------------------
// GET /api/auth/users/:id/permissions — establishment-scoped
// ---------------------------------------------------------------------------
router.get('/users/:id/permissions', requireAuth, requireEstablishmentAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id;

  const ownership = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND establishment_id = $2',
    [userId, establishmentId]
  );
  if (ownership.rows.length === 0) {
    return res.status(403).json({ error: 'User does not belong to your establishment' });
  }

  const permissions = await UserModel.getUserPermissions(userId);
  return res.json({ userId, permissions });
});

// ---------------------------------------------------------------------------
// POST /api/auth/users/:id/permissions — establishment-scoped
// ---------------------------------------------------------------------------
router.post('/users/:id/permissions', requireAuth, requireEstablishmentAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id;
  const { permissions } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Permissions must be an array' });
  }

  const ownership = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND establishment_id = $2',
    [userId, establishmentId]
  );
  if (ownership.rows.length === 0) {
    return res.status(403).json({ error: 'User does not belong to your establishment' });
  }

  await UserModel.setUserPermissions(userId, permissions);
  await AuditTrailModel.logAction({
    user_id: String(req.user!.id),
    action_type: 'SET_PERMISSIONS',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: { permissions },
    ip_address: ip,
    user_agent: userAgent,
  }).catch(() => {});

  return res.json({ userId, permissions });
});

// ---------------------------------------------------------------------------
// PUT /api/auth/users/:id/permissions — alias used by the frontend
// ---------------------------------------------------------------------------
router.put('/users/:id/permissions', requireAuth, requireEstablishmentAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Permissions must be an array' });
  }

  const ownership = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND establishment_id = $2',
    [userId, establishmentId]
  );
  if (ownership.rows.length === 0) {
    return res.status(403).json({ error: 'User does not belong to your establishment' });
  }

  await UserModel.setUserPermissions(userId, permissions);
  await AuditTrailModel.logAction({
    user_id: String(req.user!.id),
    action_type: 'SET_PERMISSIONS',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: { permissions },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }).catch(() => {});

  return res.json({ userId, permissions });
});

// ---------------------------------------------------------------------------
// POST /api/auth/users — create user within the requester's establishment
// ---------------------------------------------------------------------------
router.post('/users', requireAuth, requireEstablishmentAdmin, async (req, res) => {
  const { email, password, role = 'cashier' } = req.body;
  const establishmentId = req.user!.establishment_id;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (!establishmentId) {
    return res.status(400).json({ error: 'No establishment associated with your account' });
  }

  const allowedRoles = ['cashier', 'manager', 'establishment_admin'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${allowedRoles.join(', ')}` });
  }

  try {
    const user = await UserModel.createUserForEstablishment(email, password, role, establishmentId);
    await AuditTrailModel.logAction({
      user_id: String(req.user!.id),
      action_type: 'CREATE_USER',
      resource_type: 'USER',
      resource_id: String(user.id),
      action_details: { email, role },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }).catch(() => {});
    return res.status(201).json({ id: user.id, email: user.email, role, establishment_id: establishmentId });
  } catch {
    return res.status(400).json({ error: 'User already exists or invalid data' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/auth/users/:id — remove user from the requester's establishment
// ---------------------------------------------------------------------------
router.delete('/users/:id', requireAuth, requireEstablishmentAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id;

  if (userId === req.user!.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const ownership = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND establishment_id = $2',
    [userId, establishmentId]
  );
  if (ownership.rows.length === 0) {
    return res.status(403).json({ error: 'User does not belong to your establishment' });
  }

  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  await AuditTrailModel.logAction({
    user_id: String(req.user!.id),
    action_type: 'DELETE_USER',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: {},
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }).catch(() => {});

  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// PUT /api/auth/users/:id/role — update role within the establishment
// ---------------------------------------------------------------------------
router.put('/users/:id/role', requireAuth, requireEstablishmentAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id;
  const { role } = req.body;

  const allowedRoles = ['cashier', 'manager', 'establishment_admin'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${allowedRoles.join(', ')}` });
  }

  const ownership = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND establishment_id = $2',
    [userId, establishmentId]
  );
  if (ownership.rows.length === 0) {
    return res.status(403).json({ error: 'User does not belong to your establishment' });
  }

  await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
  await AuditTrailModel.logAction({
    user_id: String(req.user!.id),
    action_type: 'UPDATE_USER_ROLE',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: { role },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }).catch(() => {});

  return res.json({ userId, role });
});

// ---------------------------------------------------------------------------
// POST /api/auth/setup — one-time system bootstrap (only works if no admin exists)
// ---------------------------------------------------------------------------
router.post('/setup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existingAdmin = await pool.query('SELECT COUNT(*) FROM users WHERE is_admin = true');
    if (parseInt(existingAdmin.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Admin user already exists' });
    }

    const user = await UserModel.createUser(email, password, true);
    await pool.query(
      `UPDATE users SET first_name = 'System', last_name = 'Administrator', role = 'system_admin', email_verified = true WHERE id = $1`,
      [user.id]
    );

    return res.status(201).json({
      message: 'Admin user created successfully',
      user: { id: user.id, email: user.email, is_admin: user.is_admin },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create admin user' });
  }
});

export default router;
