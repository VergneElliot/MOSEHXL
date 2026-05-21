import { OrderItemModel, OrderModel, SubBillModel } from '../../models';
import LegalJournalModel from '../../models/legalJournal';
import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

type CancellationType = 'full' | 'partial' | 'items-only';

export type UnifiedCancellationRequest = {
  establishmentId: string;
  orderId: number;
  reason: string;
  cancellationType: CancellationType;
  itemsToCancel?: number[];
  includeTipReversal?: boolean;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export type UnifiedCancellationResponse = {
  status: number;
  body: Record<string, unknown>;
};

const logger = Logger.getInstance();

async function cleanupCompensatingOrders(establishmentId: string, orderIds: number[]) {
  for (const orderId of orderIds) {
    try {
      await OrderModel.delete(orderId, establishmentId);
    } catch (cleanupError: unknown) {
      logger.error(
        `Compensating delete failed for order ${orderId}`,
        cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)),
        'ORDER_PAYMENT'
      );
    }
  }
}

export class OrderCancellationService {
  static async cancelUnified(input: UnifiedCancellationRequest): Promise<UnifiedCancellationResponse> {
    const {
      establishmentId,
      orderId,
      reason,
      cancellationType,
      itemsToCancel,
      includeTipReversal = false,
      userId,
      ipAddress,
      userAgent,
    } = input;

    if (!orderId || !reason || typeof reason !== 'string' || !reason.trim()) {
      return {
        status: 400,
        body: { error: 'Order ID and cancellation reason are required' },
      };
    }

    const validTypes: CancellationType[] = ['full', 'partial', 'items-only'];
    if (!validTypes.includes(cancellationType)) {
      return {
        status: 400,
        body: { error: 'Invalid cancellation type' },
      };
    }

    const originalOrder = await OrderModel.getById(orderId, establishmentId);
    if (!originalOrder) {
      return {
        status: 404,
        body: { error: 'Order not found' },
      };
    }

    if (originalOrder.status !== 'completed') {
      return {
        status: 400,
        body: { error: 'Only completed orders can be cancelled' },
      };
    }

    const isChangeOperation =
      originalOrder.total_amount === 0 &&
      originalOrder.total_tax === 0 &&
      originalOrder.notes &&
      originalOrder.notes.includes('Faire de la Monnaie');

    const originalItems = await OrderItemModel.getByOrderId(orderId, establishmentId);
    const originalSubBills =
      originalOrder.payment_method === 'split'
        ? await SubBillModel.getByOrderId(orderId, establishmentId)
        : [];

    if (isChangeOperation) {
      const amount =
        (typeof originalOrder.change === 'number' && originalOrder.change !== 0
          ? originalOrder.change
          : originalOrder.change_amount) || 0;

      if (amount <= 0) {
        return {
          status: 400,
          body: { error: 'Cannot cancel this change operation: invalid amount' },
        };
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
        await LegalJournalModel.logChange(establishmentId, reversalOrder.id, -amount, userId);
      } catch (journalError) {
        logger.error(
          `Legal journal error (change cancellation) for order ${reversalOrder.id}`,
          journalError instanceof Error ? journalError : new Error(String(journalError)),
          'LEGAL_JOURNAL'
        );
        await cleanupCompensatingOrders(establishmentId, [reversalOrder.id]);
        throw new AppError(
          'Failed to persist legal journal entry for change cancellation',
          500,
          'ORDER_CANCEL_CHANGE_JOURNAL_FAILED'
        );
      }

      AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'CASH_REGISTER_CHANGE_CANCELLED',
        resource_type: 'ORDER',
        resource_id: String(reversalOrder.id),
        action_details: { original_order_id: orderId, amount, reason },
        ip_address: ipAddress,
        user_agent: userAgent,
      }).catch((auditError: unknown) => {
        logger.error(
          `Audit log error (change cancellation) for order ${reversalOrder.id}`,
          auditError instanceof Error ? auditError : new Error(String(auditError)),
          'AUDIT_TRAIL'
        );
      });

      return {
        status: 201,
        body: {
          message: 'Opération "faire de la monnaie" annulée avec succès',
          cancellation_order: reversalOrder,
          cancelled_amount: -amount,
        },
      };
    }

    let cancellationAmount = 0;
    let cancellationTax = 0;
    let cancelledItems: typeof originalItems = [];

    if (cancellationType === 'full') {
      const rawTotal = Number(originalOrder.total_amount);
      const rawTax = Number(originalOrder.total_tax);
      cancellationAmount = Number.isFinite(rawTotal) ? rawTotal : 0;
      cancellationTax = Number.isFinite(rawTax) ? rawTax : 0;
      cancelledItems = originalItems;
    } else {
      if (!itemsToCancel || !Array.isArray(itemsToCancel) || itemsToCancel.length === 0) {
        return {
          status: 400,
          body: { error: 'Items to cancel are required for partial cancellation' },
        };
      }

      for (const itemId of itemsToCancel) {
        const item = originalItems.find((i) => i.id === itemId);
        if (item) {
          const itemTotal = Number(item.total_price);
          const itemTax = Number(item.tax_amount);
          if (Number.isFinite(itemTotal)) cancellationAmount += itemTotal;
          if (Number.isFinite(itemTax)) cancellationTax += itemTax;
          cancelledItems.push(item);
        }
      }
    }

    if (!Number.isFinite(cancellationAmount) || !Number.isFinite(cancellationTax)) {
      return {
        status: 400,
        body: {
          error: 'Invalid cancellation totals computed from original order; data appears corrupted',
        },
      };
    }

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
    const createdOrderIds: number[] = [cancellationOrder.id];

    const cancellationOrderItems = await Promise.all(
      cancelledItems.map(async (item) => {
        return await OrderItemModel.create(
          {
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
            is_manual_happy_hour: item.is_manual_happy_hour === true,
          },
          establishmentId
        );
      })
    );

    let cancellationSubBills: Awaited<ReturnType<typeof SubBillModel.getByOrderId>> = [];
    if (originalOrder.payment_method === 'split' && originalSubBills.length > 0) {
      if (cancellationType === 'full') {
        cancellationSubBills = await Promise.all(
          originalSubBills.map(async (sb) =>
            SubBillModel.create(
              {
                order_id: cancellationOrder.id,
                payment_method: sb.payment_method,
                amount: -sb.amount,
                status: sb.status,
              },
              establishmentId
            )
          )
        );
      } else if (cancellationAmount > 0) {
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
                amountToCancel = remaining;
              } else {
                amountToCancel = Number((Number(sb.amount) * ratio).toFixed(4));
                remaining -= amountToCancel;
              }

              return SubBillModel.create(
                {
                  order_id: cancellationOrder.id,
                  payment_method: sb.payment_method,
                  amount: -amountToCancel,
                  status: sb.status,
                },
                establishmentId
              );
            })
          );
        }
      }
    }

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
      createdOrderIds.push(tipReversalOrder.id);

      try {
        await LegalJournalModel.logChange(establishmentId, tipReversalOrder.id, -tipAmountToReverse, userId);
      } catch (journalError) {
        logger.error(
          `Legal journal error (tip reversal) for order ${tipReversalOrder.id}`,
          journalError instanceof Error ? journalError : new Error(String(journalError)),
          'LEGAL_JOURNAL'
        );
        await cleanupCompensatingOrders(establishmentId, [...createdOrderIds].reverse());
        throw new AppError(
          'Failed to persist legal journal entry for tip reversal',
          500,
          'ORDER_CANCEL_TIP_REVERSAL_JOURNAL_FAILED'
        );
      }
    }

    try {
      await LegalJournalModel.addEntry(
        establishmentId,
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
      await cleanupCompensatingOrders(establishmentId, [...createdOrderIds].reverse());
      throw new AppError(
        'Failed to persist legal journal entry for order cancellation',
        500,
        'ORDER_CANCEL_JOURNAL_FAILED'
      );
    }

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
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    } catch (auditError) {
      logger.error(
        `Audit log error (cancellation) for order ${cancellationOrder.id}`,
        auditError instanceof Error ? auditError : new Error(String(auditError)),
        'AUDIT_TRAIL'
      );
    }

    return {
      status: 201,
      body: {
        message: 'Annulation enregistrée avec succès',
        cancellation_order: cancellationOrder,
        cancellation_items: cancellationOrderItems,
        cancellation_sub_bills: cancellationSubBills,
        cancelled_amount: -cancellationAmount,
      },
    };
  }
}
