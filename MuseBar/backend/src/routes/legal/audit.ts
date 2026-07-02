/**
 * Establishment audit trail (Journal de Sécurité) — tenant-scoped security log.
 */
import express from 'express';
import { AuditTrailModel } from '../../models/auditTrail';
import { getEstablishmentId, requireAuth, requireEstablishmentAdmin } from '../auth';
import { asyncHandler } from '../../middleware/errorHandler';

const router = express.Router();

router.use(requireAuth, requireEstablishmentAdmin);

/**
 * GET /api/legal/audit/trail
 * Paginated audit log for the authenticated establishment (admin only).
 */
router.get('/trail', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  const { user_id, action_type, resource_type, start, end, limit, offset } = req.query;

  const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : 25;
  const parsedOffset = typeof offset === 'string' ? parseInt(offset, 10) : 0;

  const { entries, total } = await AuditTrailModel.getEstablishmentAuditTrail(establishmentId, {
    user_id: typeof user_id === 'string' && user_id ? user_id : undefined,
    action_type: typeof action_type === 'string' && action_type ? action_type : undefined,
    resource_type: typeof resource_type === 'string' && resource_type ? resource_type : undefined,
    start: typeof start === 'string' && start ? start : undefined,
    end: typeof end === 'string' && end ? end : undefined,
    limit: Number.isFinite(parsedLimit) ? parsedLimit : 25,
    offset: Number.isFinite(parsedOffset) ? parsedOffset : 0,
  });

  res.json({
    audit_entries: entries,
    total,
  });
}));

export default router;
