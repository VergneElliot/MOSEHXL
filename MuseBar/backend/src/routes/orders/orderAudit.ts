/**
 * Order Audit Trail Operations
 * Handles audit logging, tracking, and compliance reporting
 */

import express from 'express';
import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';
import { getEstablishmentId, requireAnyPermission, requireAuth, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * POST log order action
 * POST /api/orders/audit/log
 */
router.post('/log', requireAuth, requirePermission(P.access_pos), asyncHandler(async (req, res) => {
  try {
    const {
      actionType,
      resourceType,
      resourceId,
      actionDetails
    } = req.body;

    if (!actionType || !resourceType || !resourceId) {
      return res.status(400).json({ error: 'Missing required fields for audit log' });
    }

    const auditEntry = await AuditTrailModel.logAction({
      user_id: String(req.user!.id),
      action_type: actionType,
      resource_type: resourceType,
      resource_id: String(resourceId),
      action_details: actionDetails,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(201).json({
      message: 'Audit entry created successfully',
      entry: auditEntry
    });
  } catch (error: unknown) {
    logger.error(
      'Error creating audit entry',
      error instanceof Error ? error : new Error(String(error)),
      'ORDER_AUDIT'
    );
    throw new AppError('Failed to create audit entry', 500, 'ORDER_AUDIT_LOG_FAILED');
  }
}));

/**
 * GET audit trail for order
 * GET /api/orders/audit/:orderId
 */
router.get('/:orderId', requireAuth, requireAnyPermission([P.access_pos, P.access_compliance]), asyncHandler(async (req, res) => {
  try {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const entries = await AuditTrailModel.getOrderAuditEntries(establishmentId, orderId);

    res.json({
      order_id: orderId,
      audit_entries: entries,
      total_entries: entries.length,
      compliance_note: 'Audit trail maintained for regulatory compliance',
    });
  } catch (error: unknown) {
    logger.error(
      'Error fetching audit trail',
      error instanceof Error ? error : new Error(String(error)),
      'ORDER_AUDIT'
    );
    throw new AppError('Failed to fetch audit trail', 500, 'ORDER_AUDIT_READ_FAILED');
  }
}));

/**
 * GET audit summary for order
 * GET /api/orders/audit/:orderId/summary
 */
router.get('/:orderId/summary', requireAuth, asyncHandler(async (req, res) => {
  try {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const entries = await AuditTrailModel.getOrderAuditEntries(establishmentId, orderId);
    const actionTypes = entries.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.action_type] = (acc[entry.action_type] ?? 0) + 1;
      return acc;
    }, {});
    const userActivity = entries.reduce<Record<string, number>>((acc, entry) => {
      const userKey = entry.user_id ?? 'unknown';
      acc[userKey] = (acc[userKey] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      order_id: orderId,
      summary: {
        total_actions: entries.length,
        action_types: actionTypes,
        user_activity: userActivity,
        first_action: entries.length > 0 ? entries[0] : null,
        last_action: entries.length > 0 ? entries[entries.length - 1] : null
      },
      compliance_note: 'Audit summary for regulatory reporting',
    });
  } catch (error: unknown) {
    logger.error(
      'Error generating audit summary',
      error instanceof Error ? error : new Error(String(error)),
      'ORDER_AUDIT'
    );
    throw new AppError('Failed to generate audit summary', 500, 'ORDER_AUDIT_SUMMARY_FAILED');
  }
}));

export default router;
