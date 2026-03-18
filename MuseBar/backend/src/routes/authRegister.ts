import express from 'express';
import { UserModel } from '../models/user';
import { pool } from '../app';
import { AuditTrailModel } from '../models/auditTrail';
import { Logger } from '../utils/logger';
import {
  requireAuth,
  requireAdmin,
  requireEstablishmentAdmin,
} from '../middleware/auth';

const router = express.Router();

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
  } catch (err) {
    const logger = Logger.getInstance();
    logger.error(
      'Create user failed',
      { error: err instanceof Error ? err : new Error(String(err)), email },
      'AUTH_ROUTE'
    );
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
  } catch (err) {
    const logger = Logger.getInstance();
    logger.error(
      'Create establishment user failed',
      { error: err instanceof Error ? err : new Error(String(err)), email, establishmentId },
      'AUTH_ROUTE'
    );
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

