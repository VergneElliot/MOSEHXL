import express from 'express';
import { AuditTrailModel } from '../../models/auditTrail';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const router = express.Router();

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

export default router;
