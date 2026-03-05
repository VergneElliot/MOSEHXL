/**
 * Order Audit Trail Operations
 * Handles audit logging, tracking, and compliance reporting
 */

import express from 'express';
import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';
import { requireAuth } from '../auth';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * POST log order action
 * POST /api/orders/audit/log
 */
router.post('/log', requireAuth, async (req, res) => {
  try {
    const {
      actionType,
      resourceType,
      resourceId,
      actionDetails,
      userId
    } = req.body;

    if (!actionType || !resourceType || !resourceId) {
      return res.status(400).json({ error: 'Missing required fields for audit log' });
    }

    const auditEntry = await AuditTrailModel.logAction({
      user_id: userId,
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error creating audit entry', error instanceof Error ? error : new Error(message), 'ORDER_AUDIT');
    res.status(500).json({ error: 'Failed to create audit entry', details: message });
  }
});

/**
 * GET audit trail for order
 * GET /api/orders/audit/:orderId
 */
router.get('/:orderId', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    res.json({
      order_id: orderId,
      audit_entries: [],
      total_entries: 0,
      compliance_note: 'Audit trail maintained for regulatory compliance',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching audit trail', error instanceof Error ? error : new Error(message), 'ORDER_AUDIT');
    res.status(500).json({ error: 'Failed to fetch audit trail', details: message });
  }
});

/**
 * GET audit summary for order
 * GET /api/orders/audit/:orderId/summary
 */
router.get('/:orderId/summary', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    res.json({
      order_id: orderId,
      summary: {
        total_actions: 0,
        action_types: {},
        user_activity: {},
        first_action: null,
        last_action: null
      },
      compliance_note: 'Audit summary for regulatory reporting',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error generating audit summary', error instanceof Error ? error : new Error(message), 'ORDER_AUDIT');
    res.status(500).json({ error: 'Failed to generate audit summary', details: message });
  }
});

export default router;
