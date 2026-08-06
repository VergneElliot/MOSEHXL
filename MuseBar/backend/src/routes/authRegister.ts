import express from 'express';
import { UserModel } from '../models/user';
import { MembershipModel } from '../models/membership';
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
// POST /api/auth/register — create a system_admin (platform) user.
// Does NOT set establishment_id. For establishment users use POST /api/auth/users.
// ---------------------------------------------------------------------------
router.post('/register', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name } = req.body;
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
    const user = await UserModel.createSystemAdmin({
      email,
      password,
      first_name,
      last_name,
    });
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'CREATE_USER',
      resource_type: 'USER',
      resource_id: String(user.id),
      action_details: { email, role: 'system_admin' },
      ip_address: ip,
      user_agent: userAgent,
    }, 'REGISTER_SYSTEM_USER_SUCCESS');
    return res.status(201).json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: 'system_admin',
      is_active: user.is_active !== false,
      last_login: user.last_login ?? null,
      created_at: user.created_at,
    });
  } catch (err) {
    Logger.getInstance().error(
      'Create user failed',
      { error: err instanceof Error ? err : new Error(String(err)), email },
      'AUTH_ROUTE'
    );
    throw new AppError('User already exists or invalid data', 400, 'REGISTER_SYSTEM_USER_FAILED');
  }
}));

function serializeSystemUser(user: {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  last_login: Date | null;
  created_at: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    role: 'system_admin' as const,
    is_active: user.is_active !== false,
    last_login: user.last_login ?? null,
    created_at: user.created_at,
  };
}

// ---------------------------------------------------------------------------
// GET /api/auth/system-users — list platform system admins
// ---------------------------------------------------------------------------
router.get('/system-users', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const rows = await UserModel.listSystemAdmins();
  return res.json(rows.map(serializeSystemUser));
}));

// ---------------------------------------------------------------------------
// PATCH /api/auth/system-users/:id — activate/deactivate a system admin
// ---------------------------------------------------------------------------
router.patch('/system-users/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id ?? '', 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new ValidationError('Invalid user id');
  }
  if (typeof req.body?.is_active !== 'boolean') {
    throw new ValidationError('is_active boolean is required');
  }
  if (userId === req.user!.id && req.body.is_active === false) {
    throw new ValidationError('You cannot deactivate your own account');
  }

  const updated = await UserModel.setSystemAdminActive(userId, req.body.is_active);
  if (!updated) {
    throw new NotFoundError('System user');
  }

  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: req.body.is_active ? 'ACTIVATE_SYSTEM_USER' : 'DEACTIVATE_SYSTEM_USER',
    resource_type: 'USER',
    resource_id: String(updated.id),
    action_details: { email: updated.email, is_active: updated.is_active },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'SYSTEM_USER_ACTIVE_TOGGLE');

  return res.json(serializeSystemUser(updated));
}));

// ---------------------------------------------------------------------------
// GET /api/auth/system-security-logs — platform-wide audit trail (system_admin)
// ---------------------------------------------------------------------------
router.get('/system-security-logs', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { user_id, action_type, resource_type, start, end, limit, offset } = req.query;
  const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : 50;
  const parsedOffset = typeof offset === 'string' ? parseInt(offset, 10) : 0;

  const actionTypes =
    typeof action_type === 'string' && action_type
      ? action_type.split(',').map((s) => s.trim()).filter(Boolean)
      : Array.isArray(action_type)
        ? action_type.flatMap((v) => String(v).split(',')).map((s) => s.trim()).filter(Boolean)
        : [];

  const { entries, total } = await AuditTrailModel.getPlatformAuditTrail({
    user_id: typeof user_id === 'string' && user_id ? user_id : undefined,
    action_types: actionTypes.length > 0 ? actionTypes : undefined,
    resource_type: typeof resource_type === 'string' && resource_type ? resource_type : undefined,
    start: typeof start === 'string' && start ? start : undefined,
    end: typeof end === 'string' && end ? end : undefined,
    limit: Number.isFinite(parsedLimit) ? parsedLimit : 50,
    offset: Number.isFinite(parsedOffset) ? parsedOffset : 0,
  });

  const logs = entries.map((entry) => {
    const action = String(entry.action_type || '');
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (/FAIL|ERROR|DENIED|LOCK|BREACH/i.test(action)) severity = 'high';
    else if (/DELETE|RESET|IMPERSONATION|DEACTIVATE/i.test(action)) severity = 'critical';
    else if (/CREATE|UPDATE|CHANGE|GRANT|REGISTER/i.test(action)) severity = 'medium';

    const details =
      typeof entry.action_details === 'string'
        ? entry.action_details
        : entry.action_details
          ? JSON.stringify(entry.action_details)
          : '';

    return {
      id: String(entry.id),
      user_id: entry.user_id != null ? String(entry.user_id) : '',
      action_type: action,
      resource_type: entry.resource_type || 'SYSTEM',
      resource_id: entry.resource_id || undefined,
      details,
      ip_address: entry.ip_address || undefined,
      user_agent: entry.user_agent || undefined,
      timestamp:
        entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : String(entry.timestamp),
      severity,
      establishment_id: entry.establishment_id ?? null,
    };
  });

  return res.json({ logs, total });
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
  const userId = parseInt(req.params.id ?? '', 10);
  const establishmentId = req.user!.establishment_id!;

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    throw new AuthorizationError('User does not belong to your establishment');
  }

  const permissions = await UserModel.getUserPermissions(userId, establishmentId);
  return res.json({ userId, permissions });
}));

// ---------------------------------------------------------------------------
// POST /api/auth/users/:id/permissions — establishment-scoped
// ---------------------------------------------------------------------------
router.post('/users/:id/permissions', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id ?? '', 10);
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

  await UserModel.setUserPermissions(userId, permissions, establishmentId);
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
  const userId = parseInt(req.params.id ?? '', 10);
  const establishmentId = req.user!.establishment_id!;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    throw new ValidationError('Permissions must be an array');
  }

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    throw new AuthorizationError('User does not belong to your establishment');
  }

  await UserModel.setUserPermissions(userId, permissions, establishmentId);
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
// POST /api/auth/users — create user or link existing email as membership
// ---------------------------------------------------------------------------
router.post('/users', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const { email, password, role = 'staff' } = req.body;
  const establishmentId = req.user!.establishment_id;

  if (!email) {
    throw new ValidationError('Email required');
  }

  if (!establishmentId) {
    throw new ValidationError('No establishment associated with your account');
  }

  if (!ESTABLISHMENT_USER_ROLES.includes(role)) {
    throw new ValidationError(`Role must be one of: ${ESTABLISHMENT_USER_ROLES.join(', ')}`);
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await UserModel.findByEmail(normalizedEmail);

  if (existing) {
    if (existing.role === 'system_admin') {
      throw new ValidationError('Cannot add a system administrator as an establishment member');
    }
    const alreadyMember = await UserModel.userBelongsToEstablishment(existing.id, establishmentId);
    if (alreadyMember) {
      throw new AppError('User already belongs to this establishment', 400, 'MEMBERSHIP_EXISTS');
    }
    await MembershipModel.upsert({
      user_id: existing.id,
      establishment_id: establishmentId,
      role,
    });
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'LINK_USER_MEMBERSHIP',
      resource_type: 'USER',
      resource_id: String(existing.id),
      action_details: { email: normalizedEmail, role, linked_existing: true },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'LINK_ESTABLISHMENT_MEMBERSHIP');
    await logSoftwareEventBestEffort({
      establishmentId,
      eventType: 'ESTABLISHMENT_USER_CREATED',
      userId: String(req.user!.id),
      eventData: {
        target_user_id: existing.id,
        email: normalizedEmail,
        role,
        linked_existing: true,
      },
    });
    return res.status(201).json({
      id: existing.id,
      email: existing.email,
      role,
      establishment_id: establishmentId,
      linked_existing: true,
    });
  }

  if (!password) {
    throw new ValidationError('Email and password required');
  }

  const passwordValidation = await validatePasswordWithBreachCheck(password);
  if (!passwordValidation.isValid) {
    throw new ValidationError(passwordValidation.error ?? 'Invalid password');
  }

  try {
    const user = await UserModel.createUserForEstablishment(
      normalizedEmail,
      password,
      role,
      establishmentId
    );
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'CREATE_USER',
      resource_type: 'USER',
      resource_id: String(user.id),
      action_details: { email: normalizedEmail, role },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'REGISTER_ESTABLISHMENT_USER_SUCCESS');
    await logSoftwareEventBestEffort({
      establishmentId,
      eventType: 'ESTABLISHMENT_USER_CREATED',
      userId: String(req.user!.id),
      eventData: {
        target_user_id: user.id,
        email: normalizedEmail,
        role,
      },
    });
    return res.status(201).json({
      id: user.id,
      email: user.email,
      role,
      establishment_id: establishmentId,
      linked_existing: false,
    });
  } catch (err) {
    Logger.getInstance().error(
      'Create establishment user failed',
      { error: err instanceof Error ? err : new Error(String(err)), email: normalizedEmail, establishmentId },
      'AUTH_ROUTE'
    );
    throw new AppError('User already exists or invalid data', 400, 'REGISTER_ESTABLISHMENT_USER_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// DELETE /api/auth/users/:id — remove membership from the requester's establishment
// ---------------------------------------------------------------------------
router.delete('/users/:id', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id ?? '', 10);
  const establishmentId = req.user!.establishment_id!;

  if (userId === req.user!.id) {
    throw new ValidationError('You cannot delete your own account');
  }

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    throw new AuthorizationError('User does not belong to your establishment');
  }

  await MembershipModel.remove(userId, establishmentId);
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'DELETE_USER',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: { removed_membership_establishment_id: establishmentId },
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
  const userId = parseInt(req.params.id ?? '', 10);
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

  await UserModel.updateUserRoleById(userId, role, establishmentId);
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
  const userId = parseInt(req.params.id ?? '', 10);
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

