/**
 * PIN-only staff CRUD routes (venue-login model).
 * Mounted at /api/auth/pin-staff
 */

import express from 'express';
import {
  requireAuth,
  getEstablishmentId,
  requireEstablishmentAdminOrPermission,
} from './auth';
import { P } from '../permissions/registry';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { createPinOnlyStaff } from '../services/auth/createPinOnlyStaff';
import { UserModel } from '../models/user';

const router = express.Router();
router.use(requireAuth, requireEstablishmentAdminOrPermission(P.access_user_management));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    const firstName = String(req.body.first_name || req.body.firstName || '').trim();
    const lastName = req.body.last_name ?? req.body.lastName ?? null;
    const pin = String(req.body.pin || '');
    const role =
      req.body.role === 'establishment_admin' ? 'establishment_admin' : 'staff';

    if (!firstName) throw new ValidationError('Prénom requis');
    if (!pin) throw new ValidationError('PIN requis');

    const user = await createPinOnlyStaff({
      establishmentId,
      firstName,
      lastName: lastName != null ? String(lastName) : null,
      pin,
      role,
    });

    const permissions = await UserModel.getUserPermissions(user.id, establishmentId);
    return res.status(201).json({ ...user, permissions, is_active: true });
  })
);

export default router;
