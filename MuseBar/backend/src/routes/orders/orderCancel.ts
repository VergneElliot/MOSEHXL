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
import { resolveActor } from '../../services/auth/actorContext';
import { reopenTableFromCancelledOrder } from '../../services/floor/reopenTableFromCancelledOrder';

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
        reopen_table: reopenTable = false,
      } = req.body as {
        orderId: number;
        reason: string;
        cancellationType?: 'full' | 'partial' | 'items-only';
        itemsToCancel?: number[];
        includeTipReversal?: boolean;
        reopen_table?: boolean;
      };

      if (!orderId || !reason || typeof reason !== 'string' || !reason.trim()) {
        return res
          .status(400)
          .json({ error: 'Order ID and cancellation reason are required' });
      }

      const validTypes = ['full', 'partial', 'items-only'];
      if (!validTypes.includes(cancellationType)) {
        return res.status(400).json({ error: 'Invalid cancellation type' });
      }

      if (reopenTable && cancellationType !== 'full') {
        return res.status(400).json({
          error: 'La réouverture de table n’est possible qu’après une annulation complète',
        });
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
        performedByDisplayName: req.user?.email,
        ipAddress: req.ip,
        userAgent: Array.isArray(rawUserAgent) ? rawUserAgent[0] : rawUserAgent,
        actor: resolveActor(req),
      });

      if (result.status >= 200 && result.status < 300 && reopenTable) {
        const openedByUserId = req.user?.id != null ? Number(req.user.id) : NaN;
        try {
          const reopened = await reopenTableFromCancelledOrder({
            establishmentId,
            orderId: Number(orderId),
            openedByUserId,
          });
          result.body = {
            ...result.body,
            reopened_table: reopened,
          };
        } catch (reopenErr: unknown) {
          const message =
            reopenErr instanceof AppError
              ? reopenErr.message
              : reopenErr instanceof Error
                ? reopenErr.message
                : 'Réouverture de table impossible';
          logger.warn(`Cancel ok but reopen failed for order ${orderId}: ${message}`, {
            orderId,
            reopenError: message,
          }, 'ORDER_PAYMENT');
          result.body = {
            ...result.body,
            reopen_error: message,
          };
        }
      }

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
