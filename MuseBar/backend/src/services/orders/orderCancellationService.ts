import {
  auditChangeCancellation,
  auditOrderCancellation,
  journalChangeCancellation,
  journalOrderCancellation,
  journalTipReversal,
} from './cancellationActorWrites';
import {
  cleanupCompensatingOrders,
  createChangeReversalOrder,
  createSaleCancellationRecords,
  createTipReversalOrder,
  dispatchCancellationKitchenTickets,
} from './orderCancellationTickets';
import { computeCancellationAmounts, validateUnifiedCancellation } from './orderCancellationValidate';
import type {
  UnifiedCancellationRequest,
  UnifiedCancellationResponse,
} from './orderCancellationTypes';

export type { UnifiedCancellationRequest, UnifiedCancellationResponse } from './orderCancellationTypes';

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
      performedByDisplayName,
      ipAddress,
      userAgent,
      actor,
    } = input;

    const validated = await validateUnifiedCancellation(input);
    if (!validated.ok) return validated.response;
    const {
      originalOrder,
      originalItems,
      originalSubBills,
      salesAttribution,
      isChangeOperation,
      performedBy,
    } = validated.data;

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

      const reversalOrder = await createChangeReversalOrder({
        establishmentId,
        originalOrder,
        orderId,
        reason,
        amount,
        performedBy,
        salesAttribution,
      });

      try {
        await journalChangeCancellation({
          establishmentId,
          orderId: reversalOrder.id,
          amount: -amount,
          userId,
          actor,
        });
      } catch (error) {
        await cleanupCompensatingOrders(establishmentId, [reversalOrder.id]);
        throw error;
      }

      auditChangeCancellation({
        userId,
        actor,
        reversalOrderId: reversalOrder.id,
        originalOrderId: orderId,
        amount,
        reason,
        ipAddress,
        userAgent,
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

    const amounts = computeCancellationAmounts(
      cancellationType,
      originalOrder,
      originalItems,
      itemsToCancel
    );
    if (!amounts.ok) return amounts.response;
    const { cancellationAmount, cancellationTax, cancelledItems } = amounts;

    const { cancellationOrder, cancellationOrderItems, cancellationSubBills } =
      await createSaleCancellationRecords({
        establishmentId,
        originalOrder,
        orderId,
        reason,
        cancellationType,
        cancellationAmount,
        cancellationTax,
        cancelledItems,
        originalSubBills,
        performedBy,
        salesAttribution,
      });
    const createdOrderIds: number[] = [cancellationOrder.id];

    const rawTipAmount =
      includeTipReversal && originalOrder.tips && originalOrder.tips > 0
        ? Number(originalOrder.tips)
        : 0;
    const tipAmountToReverse = Number.isFinite(rawTipAmount) ? rawTipAmount : 0;
    if (tipAmountToReverse > 0) {
      const tipReversalOrder = await createTipReversalOrder({
        establishmentId,
        originalOrder,
        orderId,
        reason,
        tipAmountToReverse,
        performedBy,
        salesAttribution,
      });
      createdOrderIds.push(tipReversalOrder.id);

      try {
        await journalTipReversal({
          establishmentId,
          orderId: tipReversalOrder.id,
          amount: -tipAmountToReverse,
          userId,
          actor,
        });
      } catch (error) {
        await cleanupCompensatingOrders(establishmentId, [...createdOrderIds].reverse());
        throw error;
      }
    }

    try {
      await journalOrderCancellation({
        establishmentId,
        cancellationOrderId: cancellationOrder.id,
        originalOrderId: orderId,
        cancellationType,
        reason,
        cancellationAmount,
        cancellationTax,
        paymentMethod: originalOrder.payment_method,
        cancelledItems,
        userId,
        actor,
      });
    } catch (error) {
      await cleanupCompensatingOrders(establishmentId, [...createdOrderIds].reverse());
      throw error;
    }

    await auditOrderCancellation({
      userId,
      actor,
      cancellationOrderId: cancellationOrder.id,
      originalOrderId: orderId,
      cancellationType,
      reason,
      cancelledItems,
      cancellationAmount,
      performedByDisplayName,
      attributedWaiterUserId: salesAttribution.waiter_user_id,
      ipAddress,
      userAgent,
    });

    await dispatchCancellationKitchenTickets({
      establishmentId,
      originalOrderId: orderId,
      cancellationType,
      cancelledItems,
      userId,
    });

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
