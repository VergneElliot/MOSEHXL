import express from 'express';
import { UserModel } from '../../models/user';
import { Logger } from '../../utils/logger';
import {
  AppError,
  asyncHandler,
  NotFoundError,
  ValidationError,
} from '../../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { validatePasswordWithBreachCheck } from '../../utils/passwordValidation';
import { logAuditOrThrow } from './shared';

const router = express.Router();

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

export default router;
