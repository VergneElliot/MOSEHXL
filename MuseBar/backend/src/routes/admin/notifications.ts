import express from 'express';
import { getEstablishmentId, requireAuth } from '../auth';
import { asyncHandler, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { NotificationModel } from '../../models/notifications';
import { UserModel } from '../../models/user';

const router = express.Router();

async function viewerContext(req: express.Request, establishmentId: string) {
  const userId = req.user!.id;
  const role = req.user!.role;
  const isEstablishmentAdmin = role === 'establishment_admin' || role === 'system_admin';
  const permissions = isEstablishmentAdmin
    ? []
    : await UserModel.getUserPermissions(userId, establishmentId);
  return { userId, permissions, isEstablishmentAdmin };
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const ctx = await viewerContext(req, establishmentId);
    const items = await NotificationModel.listForUser({
      establishmentId,
      userId: ctx.userId,
      permissions: ctx.permissions,
      isEstablishmentAdmin: ctx.isEstablishmentAdmin,
    });
    res.json({ success: true, data: items });
  })
);

router.get(
  '/unread-count',
  requireAuth,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const ctx = await viewerContext(req, establishmentId);
    const count = await NotificationModel.unreadCount({
      establishmentId,
      userId: ctx.userId,
      permissions: ctx.permissions,
      isEstablishmentAdmin: ctx.isEstablishmentAdmin,
    });
    res.json({ success: true, count });
  })
);

router.post(
  '/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const ctx = await viewerContext(req, establishmentId);
    const marked = await NotificationModel.markAllRead({
      establishmentId,
      userId: ctx.userId,
      permissions: ctx.permissions,
      isEstablishmentAdmin: ctx.isEstablishmentAdmin,
    });
    res.json({ success: true, marked });
  })
);

router.post(
  '/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(String(req.params.id ?? ''), 10);
    if (!Number.isFinite(id)) throw new ValidationError('Invalid notification id');
    const ok = await NotificationModel.markRead(establishmentId, req.user!.id, id);
    if (!ok) throw new NotFoundError('Notification not found');
    res.json({ success: true });
  })
);

export default router;
