/**
 * Unified cancellation endpoint.
 * POST /api/orders/payment/cancel-unified
 */

import express from 'express';
import { Logger } from '../../utils/logger';
import { getEstablishmentId, requireAuth, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import { validateBody } from '../../middleware/validation';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { OrderCancellationService } from '../../services/orders/orderCancellationService';

const router = express.Router();
const logger = Logger.getInstance();

router.post(
  '/cancel-unified',
  requireAuth,
  requirePermission(P.orders_cancel),
  validateBody([
    { field: 'orderId', required: true },
    { field: 'reason', required: true },
  ]),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    try {
      const {
        orderId,
        reason,
        cancellationType = 'full',
        itemsToCancel,
        includeTipReversal = false,
      } = req.body as {
        orderId: number;
        reason: string;
        cancellationType?: 'full' | 'partial' | 'items-only';
        itemsToCancel?: number[];
        includeTipReversal?: boolean;
      };

      if (!orderId || !reason || typeof reason !== 'string' || !reason.trim()) {
        return res
          .status(400)
          .json({ error: 'Order ID and cancellation reason are required' });
      }

      // Validate cancellation type
      const validTypes = ['full', 'partial', 'items-only'];
      if (!validTypes.includes(cancellationType)) {
        return res.status(400).json({ error: 'Invalid cancellation type' });
      }

      const userId = req.user ? String(req.user.id) : undefined;
      const rawUserAgent = req.headers['user-agent'];
      const result = await OrderCancellationService.cancelUnified({
        establishmentId,
        orderId,
        reason,
        cancellationType,
        itemsToCancel,
        includeTipReversal,
        userId,
        ipAddress: req.ip,
        userAgent: Array.isArray(rawUserAgent) ? rawUserAgent[0] : rawUserAgent,
      });
      res.status(result.status).json(result.body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        'Error processing cancellation',
        error instanceof Error ? error : new Error(message),
        'ORDER_PAYMENT'
      );
      if (error instanceof AppError) throw error;
      throw new AppError("Erreur lors de l'annulation", 500, 'ORDER_CANCEL_UNIFIED_FAILED', {
        details: message,
      });
    }
  })
);

export default router;

