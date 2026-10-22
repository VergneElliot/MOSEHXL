import express from 'express';
import { UserModel } from '../../models/user';
import {
  asyncHandler,
  AuthorizationError,
  ValidationError,
} from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { applyPermissionGrants } from '../../services/auth/permissionGrantService';
import { logSoftwareEventBestEffort } from '../../services/legal/softwareEventJournal';
import { canManageUsers, logAuditOrThrow } from './shared';

const router = express.Router();

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

  const result = await applyPermissionGrants({
    targetUserId: userId,
    establishmentId,
    requested: permissions,
  });
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'SET_PERMISSIONS',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: { permissions: result.granted, pin_cleared: result.pin_cleared },
    ip_address: ip,
    user_agent: userAgent,
  }, 'SET_USER_PERMISSIONS_POST');
  await logSoftwareEventBestEffort({
    establishmentId,
    eventType: 'USER_PERMISSIONS_UPDATED',
    userId: String(req.user!.id),
    eventData: {
      target_user_id: userId,
      permissions_count: result.granted.length,
      pin_cleared: result.pin_cleared,
      method: 'POST',
    },
  });

  return res.json({ userId, permissions: result.permissions, pin_cleared: result.pin_cleared });
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

  const result = await applyPermissionGrants({
    targetUserId: userId,
    establishmentId,
    requested: permissions,
  });
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'SET_PERMISSIONS',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: { permissions: result.granted, pin_cleared: result.pin_cleared },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'SET_USER_PERMISSIONS_PUT');
  await logSoftwareEventBestEffort({
    establishmentId,
    eventType: 'USER_PERMISSIONS_UPDATED',
    userId: String(req.user!.id),
    eventData: {
      target_user_id: userId,
      permissions_count: result.granted.length,
      pin_cleared: result.pin_cleared,
      method: 'PUT',
    },
  });

  return res.json({ userId, permissions: result.permissions, pin_cleared: result.pin_cleared });
}));

export default router;
