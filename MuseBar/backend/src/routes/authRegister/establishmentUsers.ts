import express from 'express';
import { UserModel } from '../../models/user';
import { MembershipModel } from '../../models/membership';
import { Logger } from '../../utils/logger';
import {
  AppError,
  asyncHandler,
  AuthorizationError,
  ValidationError,
} from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { deactivateStaffAccount } from '../../services/auth/staffAccountLifecycle';
import { logSoftwareEventBestEffort } from '../../services/legal/softwareEventJournal';
import { validatePasswordWithBreachCheck } from '../../utils/passwordValidation';
import { canManageUsers, ESTABLISHMENT_USER_ROLES, logAuditOrThrow } from './shared';

const router = express.Router();

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
// DELETE /api/auth/users/:id — deactivate; the account stays for traceability.
// Hard deletion lives in routes/staffAccounts.ts and requires an empty footprint.
// ---------------------------------------------------------------------------
router.delete('/users/:id', requireAuth, canManageUsers, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id ?? '', 10);
  const establishmentId = req.user!.establishment_id!;

  if (userId === req.user!.id) {
    throw new ValidationError('You cannot deactivate your own account');
  }

  const owns = await UserModel.userBelongsToEstablishment(userId, establishmentId);
  if (!owns) {
    throw new AuthorizationError('User does not belong to your establishment');
  }

  const result = await deactivateStaffAccount(userId, establishmentId);
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'DEACTIVATE_USER',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: { establishment_id: establishmentId, ...result },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'DEACTIVATE_ESTABLISHMENT_USER');
  await logSoftwareEventBestEffort({
    establishmentId,
    eventType: 'ESTABLISHMENT_USER_DELETED',
    userId: String(req.user!.id),
    eventData: {
      target_user_id: userId,
      deactivated: true,
    },
  });

  return res.json({ success: true, ...result });
}));

export default router;
