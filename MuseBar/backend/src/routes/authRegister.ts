import express from 'express';
import { UserModel } from '../models/user';
import { AuditTrailModel } from '../models/auditTrail';
import { Logger } from '../utils/logger';
import {
  requireAuth,
  requireAdmin,
  requireEstablishmentAdmin,
  requireSetupSecret,
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
  const establishmentId = req.user!.establishment_id!;
  const rows = await UserModel.listUsersByEstablishment(establishmentId);
  return res.json(rows);
});

// ---------------------------------------------------------------------------
// GET /api/auth/users/:id/permissions — establishment-scoped
// ---------------------------------------------------------------------------
router.get('/users/:id/permissions', requireAuth, requireEstablishmentAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id!;

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
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
  const establishmentId = req.user!.establishment_id!;
  const { permissions } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Permissions must be an array' });
  }

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
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
  const establishmentId = req.user!.establishment_id!;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Permissions must be an array' });
  }

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
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
  const establishmentId = req.user!.establishment_id!;

  if (userId === req.user!.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    return res.status(403).json({ error: 'User does not belong to your establishment' });
  }

  await UserModel.deleteUserById(userId);
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
  const establishmentId = req.user!.establishment_id!;
  const { role } = req.body;

  const allowedRoles = ['cashier', 'manager', 'establishment_admin'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${allowedRoles.join(', ')}` });
  }

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    return res.status(403).json({ error: 'User does not belong to your establishment' });
  }

  await UserModel.updateUserRoleById(userId, role);
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
router.post('/setup', requireSetupSecret, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await UserModel.bootstrapSystemAdmin(email, password);

    return res.status(201).json({
      message: 'Admin user created successfully',
      user: { id: user.id, email: user.email, is_admin: user.is_admin },
    });
  } catch (error) {
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 400) {
      return res.status(400).json({ error: e.message || 'Admin user already exists' });
    }
    return res.status(500).json({ error: 'Failed to create admin user' });
  }
});

export default router;

