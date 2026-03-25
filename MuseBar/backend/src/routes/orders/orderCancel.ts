/**
 * Unified cancellation endpoint.
 * POST /api/orders/payment/cancel-unified
 */

import express from 'express';
import { OrderModel, OrderItemModel, SubBillModel } from '../../models';
import LegalJournalModel from '../../models/legalJournal';
import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';
import { getEstablishmentId, requireAuth } from '../auth';
import { validateBody } from '../../middleware/validation';

const router = express.Router();
const logger = Logger.getInstance();

router.post(
  '/cancel-unified',
  requireAuth,
  validateBody([
    { field: 'orderId', required: true },
    { field: 'reason', required: true },
  ]),
  async (req, res) => {
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

      // Get the original order — scoped to this establishment
      const originalOrder = await OrderModel.getById(orderId, establishmentId);
      if (!originalOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (originalOrder.status !== 'completed') {
        return res
          .status(400)
          .json({ error: 'Only completed orders can be cancelled' });
      }

      // Check if this is a "Faire de la monnaie" operation
      const isChangeOperation =
        originalOrder.total_amount === 0 &&
        originalOrder.total_tax === 0 &&
        originalOrder.notes &&
        originalOrder.notes.includes('Faire de la Monnaie');

      // Get original order items and sub-bills
      const originalItems = await OrderItemModel.getByOrderId(orderId);
      const originalSubBills =
        originalOrder.payment_method === 'split'
          ? await SubBillModel.getByOrderId(orderId)
          : [];

      // If this is a pure "faire de la monnaie" operation, cancellation is handled as
      // an inverse change operation: -X card, +X cash, zero total amount.
      const userId = req.user ? String(req.user.id) : undefined;
      if (isChangeOperation) {
        const amount =
          (typeof originalOrder.change === 'number' && originalOrder.change !== 0
            ? originalOrder.change
            : originalOrder.change_amount) || 0;

        if (amount <= 0) {
          return res
            .status(400)
            .json({ error: 'Cannot cancel this change operation: invalid amount' });
        }

        const reversalOrder = await OrderModel.create(
          {
            total_amount: 0,
            total_tax: 0,
            payment_method: originalOrder.payment_method,
            status: 'completed',
            notes: `ANNULATION FAIRE DE LA MONNAIE - Raison: ${reason} - Order ID: ${orderId}`,
            tips: 0,
            change: -amount,
            operation_type: 'change',
            change_amount: -amount,
            establishment_id: establishmentId,
          },
          establishmentId
        );

        try {
          await LegalJournalModel.logChange(reversalOrder.id, -amount, userId);
        } catch (journalError) {
          logger.error(
            `Legal journal error (change cancellation) for order ${reversalOrder.id}`,
            journalError instanceof Error ? journalError : new Error(String(journalError)),
            'LEGAL_JOURNAL'
          );
        }

        AuditTrailModel.logAction({
          user_id: userId,
          action_type: 'CASH_REGISTER_CHANGE_CANCELLED',
          resource_type: 'ORDER',
          resource_id: String(reversalOrder.id),
          action_details: { original_order_id: orderId, amount, reason },
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        }).catch((auditError: unknown) => {
          logger.error(
            `Audit log error (change cancellation) for order ${reversalOrder.id}`,
            auditError instanceof Error ? auditError : new Error(String(auditError)),
            'AUDIT_TRAIL'
          );
        });

        return res.status(201).json({
          message: 'Opération "faire de la monnaie" annulée avec succès',
          cancellation_order: reversalOrder,
          cancelled_amount: -amount,
        });
      }

      // Calculate cancellation amounts for normal sales
      let cancellationAmount = 0;
      let cancellationTax = 0;
      let cancelledItems: typeof originalItems = [];

      if (cancellationType === 'full') {
        // Defensive: treat any non-finite DB values as 0 so we don't block
        // cancellations on legacy corrupted data.
        const rawTotal = Number(originalOrder.total_amount);
        const rawTax = Number(originalOrder.total_tax);
        cancellationAmount = Number.isFinite(rawTotal) ? rawTotal : 0;
        cancellationTax = Number.isFinite(rawTax) ? rawTax : 0;
        cancelledItems = originalItems;
      } else if (cancellationType === 'partial' || cancellationType === 'items-only') {
        if (!itemsToCancel || !Array.isArray(itemsToCancel) || itemsToCancel.length === 0) {
          return res.status(400).json({
            error: 'Items to cancel are required for partial cancellation',
          });
        }

        // Calculate amounts for specific items
        for (const itemId of itemsToCancel) {
          const item = originalItems.find((i) => i.id === itemId);
          if (item) {
            const itemTotal = Number(item.total_price);
            const itemTax = Number(item.tax_amount);

            // If legacy data has NaN here, just skip its contribution instead
            // of poisoning the whole cancellation.
            if (Number.isFinite(itemTotal)) {
              cancellationAmount += itemTotal;
            }
            if (Number.isFinite(itemTax)) {
              cancellationTax += itemTax;
            }

            cancelledItems.push(item);
          }
        }
      }

      // Final safety check: never create a cancellation order with NaN totals.
      if (!Number.isFinite(cancellationAmount) || !Number.isFinite(cancellationTax)) {
        return res.status(400).json({
          error:
            'Invalid cancellation totals computed from original order; data appears corrupted',
        });
      }

      // Create cancellation order scoped to this establishment
      const cancellationOrder = await OrderModel.create(
        {
          total_amount: -cancellationAmount,
          total_tax: -cancellationTax,
          payment_method: originalOrder.payment_method,
          status: 'completed',
          notes: `ANNULATION - ${cancellationType.toUpperCase()} - Raison: ${reason} - Order ID: ${orderId}`,
          establishment_id: establishmentId,
        },
        establishmentId
      );

      // Create cancellation items
      const cancellationOrderItems = await Promise.all(
        cancelledItems.map(async (item) => {
          return await OrderItemModel.create({
            order_id: cancellationOrder.id,
            product_id: item.product_id,
            product_name: `[ANNULATION] ${item.product_name}`,
            quantity: -Math.abs(item.quantity),
            unit_price: item.unit_price,
            total_price: -item.total_price,
            tax_rate: item.tax_rate,
            tax_amount: -item.tax_amount,
            happy_hour_applied: item.happy_hour_applied,
            happy_hour_discount_amount: -item.happy_hour_discount_amount,
          });
        })
      );

      // If the original payment was split, mirror the cancellation into sub_bills so that
      // card/cash breakdowns remain accurate for closures and live stats.
      let cancellationSubBills: Awaited<ReturnType<typeof SubBillModel.getByOrderId>> = [];
      if (originalOrder.payment_method === 'split' && originalSubBills.length > 0) {
        if (cancellationType === 'full') {
          // Full cancellation: create exact negative copies of the original sub_bills.
          cancellationSubBills = await Promise.all(
            originalSubBills.map(async (sb) =>
              SubBillModel.create({
                order_id: cancellationOrder.id,
                payment_method: sb.payment_method,
                amount: -sb.amount,
                status: sb.status,
              })
            )
          );
        } else if (cancellationAmount > 0) {
          // Partial/items-only cancellation: distribute the cancelled amount proportionally
          // across the original sub_bills (card/cash) so totals stay consistent.
          const totalOriginalSplitAmount = originalSubBills.reduce(
            (sum, sb) => sum + Number(sb.amount),
            0
          );

          if (totalOriginalSplitAmount > 0) {
            const ratio = cancellationAmount / totalOriginalSplitAmount;
            let remaining = cancellationAmount;

            cancellationSubBills = await Promise.all(
              originalSubBills.map(async (sb, index) => {
                let amountToCancel: number;
                if (index === originalSubBills.length - 1) {
                  // Last sub-bill gets the remainder to avoid rounding drift.
                  amountToCancel = remaining;
                } else {
                  amountToCancel = Number((Number(sb.amount) * ratio).toFixed(4));
                  remaining -= amountToCancel;
                }

                return SubBillModel.create({
                  order_id: cancellationOrder.id,
                  payment_method: sb.payment_method,
                  amount: -amountToCancel,
                  status: sb.status,
                });
              })
            );
          }
        }
      }

      // If we reversed the tip, create a dedicated zero-total change order so that
      // card/cash subtotals are rebalanced (-tip on card, +tip on cash) without
      // affecting the day's total TTC.
      let tipReversalOrder: Awaited<ReturnType<typeof OrderModel.create>> | null = null;
      const rawTipAmount =
        includeTipReversal && originalOrder.tips && originalOrder.tips > 0
          ? Number(originalOrder.tips)
          : 0;
      const tipAmountToReverse = Number.isFinite(rawTipAmount) ? rawTipAmount : 0;
      if (tipAmountToReverse > 0) {
        tipReversalOrder = await OrderModel.create(
          {
            total_amount: 0,
            total_tax: 0,
            payment_method: originalOrder.payment_method,
            status: 'completed',
            notes: `ANNULATION POURBOIRE - Raison: ${reason} - Order ID: ${orderId}`,
            tips: 0,
            change: -tipAmountToReverse,
            operation_type: 'change',
            change_amount: -tipAmountToReverse,
            establishment_id: establishmentId,
          },
          establishmentId
        );

        try {
          await LegalJournalModel.logChange(tipReversalOrder.id, -tipAmountToReverse, userId);
        } catch (journalError) {
          logger.error(
            `Legal journal error (tip reversal) for order ${tipReversalOrder.id}`,
            journalError instanceof Error ? journalError : new Error(String(journalError)),
            'LEGAL_JOURNAL'
          );
        }
      }

      // Log to legal journal
      try {
        await LegalJournalModel.addEntry(
          'REFUND',
          cancellationOrder.id,
          -cancellationAmount,
          -cancellationTax,
          originalOrder.payment_method,
          {
            type: 'ORDER_CANCELLATION',
            cancellation_type: cancellationType,
            reason,
            original_order_id: orderId,
            cancelled_items: cancelledItems.map((item) => ({
              product_name: item.product_name,
              quantity: item.quantity,
              total_price: item.total_price,
            })),
            total_cancelled: -cancellationAmount,
            tax_cancelled: -cancellationTax,
          },
          userId
        );
      } catch (journalError) {
        logger.error(
          `Legal journal error (cancellation) for order ${cancellationOrder.id}`,
          journalError instanceof Error ? journalError : new Error(String(journalError)),
          'LEGAL_JOURNAL'
        );
      }

      // Log audit trail
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];
      try {
        await AuditTrailModel.logAction({
          user_id: userId,
          action_type: 'CANCEL_ORDER',
          resource_type: 'ORDER',
          resource_id: String(cancellationOrder.id),
          action_details: {
            original_order_id: orderId,
            cancellation_type: cancellationType,
            reason,
            cancelled_items: cancelledItems,
            cancellation_amount: -cancellationAmount,
          },
          ip_address: ip,
          user_agent: userAgent,
        });
      } catch (auditError) {
        logger.error(
          `Audit log error (cancellation) for order ${cancellationOrder.id}`,
          auditError instanceof Error ? auditError : new Error(String(auditError)),
          'AUDIT_TRAIL'
        );
      }

      res.status(201).json({
        message: 'Annulation enregistrée avec succès',
        cancellation_order: cancellationOrder,
        cancellation_items: cancellationOrderItems,
        cancellation_sub_bills: cancellationSubBills,
        cancelled_amount: -cancellationAmount,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        'Error processing cancellation',
        error instanceof Error ? error : new Error(message),
        'ORDER_PAYMENT'
      );
      res
        .status(500)
        .json({ error: "Erreur lors de l'annulation", details: message });
    }
  }
);

export default router;

