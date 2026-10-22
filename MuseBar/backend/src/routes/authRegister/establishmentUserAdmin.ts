import express from 'express';
import { UserModel } from '../../models/user';
import {
  asyncHandler,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { logSoftwareEventBestEffort } from '../../services/legal/softwareEventJournal';
import { canManageUsers, ESTABLISHMENT_USER_ROLES, logAuditOrThrow } from './shared';

const router = express.Router();

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

export default router;
