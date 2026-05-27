import express from 'express';
import { UserModel } from '../models/user';
import { AuditTrailModel } from '../models/auditTrail';
import { Logger } from '../utils/logger';
import {
  AppError,
  asyncHandler,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorHandler';
import {
  requireAuth,
  requireAdmin,
  requireEstablishmentAdminOrPermission,
  requireSetupSecret,
} from '../middleware/auth';
import { P } from '../permissions/registry';
import { logSoftwareEventBestEffort } from '../services/legal/softwareEventJournal';
import { validatePasswordWithBreachCheck } from '../utils/passwordValidation';

const canManageUsers = requireEstablishmentAdminOrPermission(P.access_user_management);

const router = express.Router();

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

/** Roles assignable for establishment users via POST/PUT `/api/auth/users` (not system_admin). */
const ESTABLISHMENT_USER_ROLES: readonly string[] = ['establishment_admin', 'staff'];

// ---------------------------------------------------------------------------
// POST /api/auth/register — create a system-level user (system_admin only).
// Does NOT set establishment_id or role. For creating establishment users,
// use POST /api/auth/users which is scoped by requireEstablishmentAdmin.
// ---------------------------------------------------------------------------
router.post('/register', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { email, password, is_admin } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!email || !password) {
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'CREATE_USER_FAILED',
      action_details: { reason: 'Missing email or password', email },
      ip_address: ip,
      user_agent: userAgent,
    }, 'REGISTER_SYSTEM_USER_MISSING_FIELDS');
    throw new ValidationError('Email and password required');
  }

  const passwordValidation = await validatePasswordWithBreachCheck(password);
  if (!passwordValidation.isValid) {
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'CREATE_USER_FAILED',
      action_details: { reason: passwordValidation.error ?? 'Invalid password', email },
      ip_address: ip,
      user_agent: userAgent,
    }, 'REGISTER_SYSTEM_USER_PASSWORD_POLICY');
    throw new ValidationError(passwordValidation.error ?? 'Invalid password');
  }

  try {
    const user = await UserModel.createUser(email, password, !!is_admin);
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'CREATE_USER',
      resource_type: 'USER',
      resource_id: String(user.id),
      action_details: { email, is_admin },
      ip_address: ip,
      user_agent: userAgent,
    }, 'REGISTER_SYSTEM_USER_SUCCESS');
    return res.status(201).json({ id: user.id, email: user.email, is_admin: user.is_admin });
  } catch (err) {
    Logger.getInstance().error(
      'Create user failed',
      { error: err instanceof Error ? err : new Error(String(err)), email },
      'AUTH_ROUTE'
    );
    throw new AppError('User already exists or invalid data', 400, 'REGISTER_SYSTEM_USER_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// GET /api/auth/users — list users scoped to the requester's establishment
// ---------------------------------------------------------------------------
router.get('/users', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const establishmentId = req.user!.establishment_id!;
  const rows = await UserModel.listUsersByEstablishment(establishmentId);
  return res.json(rows);
}));

// ---------------------------------------------------------------------------
// GET /api/auth/users/:id/permissions — establishment-scoped
// ---------------------------------------------------------------------------
router.get('/users/:id/permissions', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id!;

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    throw new AuthorizationError('User does not belong to your establishment');
  }

  const permissions = await UserModel.getUserPermissions(userId);
  return res.json({ userId, permissions });
}));

// ---------------------------------------------------------------------------
// POST /api/auth/users/:id/permissions — establishment-scoped
// ---------------------------------------------------------------------------
router.post('/users/:id/permissions', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id!;
  const { permissions } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!Array.isArray(permissions)) {
    throw new ValidationError('Permissions must be an array');
  }

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    throw new AuthorizationError('User does not belong to your establishment');
  }

  await UserModel.setUserPermissions(userId, permissions);
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'SET_PERMISSIONS',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: { permissions },
    ip_address: ip,
    user_agent: userAgent,
  }, 'SET_USER_PERMISSIONS_POST');
  await logSoftwareEventBestEffort({
    establishmentId,
    eventType: 'USER_PERMISSIONS_UPDATED',
    userId: String(req.user!.id),
    eventData: {
      target_user_id: userId,
      permissions_count: permissions.length,
      method: 'POST',
    },
  });

  return res.json({ userId, permissions });
}));

// ---------------------------------------------------------------------------
// PUT /api/auth/users/:id/permissions — alias used by the frontend
// ---------------------------------------------------------------------------
router.put('/users/:id/permissions', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id!;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    throw new ValidationError('Permissions must be an array');
  }

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    throw new AuthorizationError('User does not belong to your establishment');
  }

  await UserModel.setUserPermissions(userId, permissions);
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'SET_PERMISSIONS',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: { permissions },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'SET_USER_PERMISSIONS_PUT');
  await logSoftwareEventBestEffort({
    establishmentId,
    eventType: 'USER_PERMISSIONS_UPDATED',
    userId: String(req.user!.id),
    eventData: {
      target_user_id: userId,
      permissions_count: permissions.length,
      method: 'PUT',
    },
  });

  return res.json({ userId, permissions });
}));

// ---------------------------------------------------------------------------
// POST /api/auth/users — create user within the requester's establishment
// ---------------------------------------------------------------------------
router.post('/users', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const { email, password, role = 'staff' } = req.body;
  const establishmentId = req.user!.establishment_id;

  if (!email || !password) {
    throw new ValidationError('Email and password required');
  }

  const passwordValidation = await validatePasswordWithBreachCheck(password);
  if (!passwordValidation.isValid) {
    throw new ValidationError(passwordValidation.error ?? 'Invalid password');
  }

  if (!establishmentId) {
    throw new ValidationError('No establishment associated with your account');
  }

  if (!ESTABLISHMENT_USER_ROLES.includes(role)) {
    throw new ValidationError(`Role must be one of: ${ESTABLISHMENT_USER_ROLES.join(', ')}`);
  }

  try {
    const user = await UserModel.createUserForEstablishment(email, password, role, establishmentId);
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'CREATE_USER',
      resource_type: 'USER',
      resource_id: String(user.id),
      action_details: { email, role },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'REGISTER_ESTABLISHMENT_USER_SUCCESS');
    await logSoftwareEventBestEffort({
      establishmentId,
      eventType: 'ESTABLISHMENT_USER_CREATED',
      userId: String(req.user!.id),
      eventData: {
        target_user_id: user.id,
        email,
        role,
      },
    });
    return res.status(201).json({ id: user.id, email: user.email, role, establishment_id: establishmentId });
  } catch (err) {
    Logger.getInstance().error(
      'Create establishment user failed',
      { error: err instanceof Error ? err : new Error(String(err)), email, establishmentId },
      'AUTH_ROUTE'
    );
    throw new AppError('User already exists or invalid data', 400, 'REGISTER_ESTABLISHMENT_USER_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// DELETE /api/auth/users/:id — remove user from the requester's establishment
// ---------------------------------------------------------------------------
router.delete('/users/:id', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id!;

  if (userId === req.user!.id) {
    throw new ValidationError('You cannot delete your own account');
  }

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    throw new AuthorizationError('User does not belong to your establishment');
  }

  await UserModel.deleteUserById(userId);
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'DELETE_USER',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: {},
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'DELETE_ESTABLISHMENT_USER');
  await logSoftwareEventBestEffort({
    establishmentId,
    eventType: 'ESTABLISHMENT_USER_DELETED',
    userId: String(req.user!.id),
    eventData: {
      target_user_id: userId,
    },
  });

  return res.json({ success: true });
}));

// ---------------------------------------------------------------------------
// PUT /api/auth/users/:id/role — update role within the establishment
// ---------------------------------------------------------------------------
router.put('/users/:id/role', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id!;
  const { role } = req.body;

  if (!ESTABLISHMENT_USER_ROLES.includes(role)) {
    throw new ValidationError(`Role must be one of: ${ESTABLISHMENT_USER_ROLES.join(', ')}`);
  }

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    throw new AuthorizationError('User does not belong to your establishment');
  }

  if (role === 'establishment_admin' && !req.user!.is_admin) {
    throw new AuthorizationError('Only system administrators can grant establishment_admin role');
  }

  await UserModel.updateUserRoleById(userId, role);
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'UPDATE_USER_ROLE',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: { role },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'UPDATE_ESTABLISHMENT_USER_ROLE');
  await logSoftwareEventBestEffort({
    establishmentId,
    eventType: 'USER_ROLE_UPDATED',
    userId: String(req.user!.id),
    eventData: {
      target_user_id: userId,
      role,
    },
  });

  return res.json({ userId, role });
}));

// ---------------------------------------------------------------------------
// PUT /api/auth/users/:id/unlock — clear lockout state within establishment
// ---------------------------------------------------------------------------
router.put('/users/:id/unlock', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const establishmentId = req.user!.establishment_id!;

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    throw new AuthorizationError('User does not belong to your establishment');
  }

  const unlocked = await UserModel.unlockUserAccount(userId);
  if (!unlocked) {
    throw new NotFoundError('User');
  }

  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'ACCOUNT_UNLOCKED',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: {
      unlocked_by_user_id: req.user!.id,
    },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'UNLOCK_ESTABLISHMENT_USER_ACCOUNT');

  return res.json({ userId, unlocked: true });
}));

// ---------------------------------------------------------------------------
// POST /api/auth/setup — one-time system bootstrap (only works if no admin exists)
// ---------------------------------------------------------------------------
router.post('/setup', requireSetupSecret, asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ValidationError('Email and password required');
    }
    const passwordValidation = await validatePasswordWithBreachCheck(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.error ?? 'Invalid password');
    }

    const user = await UserModel.bootstrapSystemAdmin(email, password);

    return res.status(201).json({
      message: 'Admin user created successfully',
      user: { id: user.id, email: user.email, is_admin: user.is_admin },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 400) {
      throw new AppError(e.message || 'Admin user already exists', 400, 'SETUP_ADMIN_ALREADY_EXISTS');
    }
    throw new AppError('Failed to create admin user', 500, 'SETUP_ADMIN_CREATE_FAILED');
  }
}));

export default router;

