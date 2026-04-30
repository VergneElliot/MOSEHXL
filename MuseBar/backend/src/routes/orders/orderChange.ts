/**
 * Cash register change operation ("Faire de la Monnaie").
 * POST /api/orders/payment/change
 */

import express from 'express';
import { OrderModel } from '../../models';
import LegalJournalModel from '../../models/legalJournal';
import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';
import { getEstablishmentId, requireAuth, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import { validateBody } from '../../middleware/validation';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

const router = express.Router();
const logger = Logger.getInstance();

router.post(
  '/change',
  requireAuth,
  requirePermission(P.access_pos),
  validateBody([{ field: 'amount', required: true }]),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    try {
      const { amount, direction } = req.body as {
        amount: number;
        direction?: 'card-to-cash' | 'cash-to-card';
      };

      if (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
      // Only card→cash is supported in practice
      if (direction != null && direction !== 'card-to-cash') {
        return res.status(400).json({
          error:
            'Only direction "card-to-cash" is supported (customer pays by card, receives cash)',
        });
      }

      const order = await OrderModel.create(
        {
          total_amount: 0,
          total_tax: 0,
          payment_method: 'card',
          status: 'completed',
          notes: `Faire de la Monnaie: ${amount}€ - Carte vers Espèces`,
          tips: 0,
          change: amount,
          operation_type: 'change',
          change_amount: amount,
          establishment_id: establishmentId,
        },
        establishmentId
      );

      const changeUserId = req.user ? String(req.user.id) : undefined;

      try {
        await LegalJournalModel.logChange(establishmentId, order.id, amount, changeUserId);
      } catch (journalError: unknown) {
        logger.error(
          `Legal journal error (change) for order ${order.id}`,
          journalError instanceof Error ? journalError : new Error(String(journalError)),
          'LEGAL_JOURNAL'
        );
        try {
          await OrderModel.delete(order.id, establishmentId);
        } catch (cleanupError: unknown) {
          logger.error(
            `Compensating delete failed after change journal error for order ${order.id}`,
            cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)),
            'ORDER_PAYMENT'
          );
        }
        throw new AppError(
          'Failed to persist legal journal entry for cash register change',
          500,
          'ORDER_CHANGE_JOURNAL_FAILED'
        );
      }

      AuditTrailModel.logAction({
        user_id: changeUserId,
        action_type: 'CASH_REGISTER_CHANGE',
        resource_type: 'ORDER',
        resource_id: String(order.id),
        action_details: { amount, direction: 'card-to-cash' },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      }).catch((err: unknown) => {
        logger.error(
          'Audit log error (change)',
          err instanceof Error ? err : new Error(String(err)),
          'AUDIT_TRAIL'
        );
      });

      res.status(201).json({ message: 'Changement de caisse enregistré', order });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Erreur lors du changement de caisse',
        500,
        'ORDER_CHANGE_FAILED',
        { details: message }
      );
    }
  })
);

export default router;

