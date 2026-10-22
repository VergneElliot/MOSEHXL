import { OrderItemModel, OrderModel, SubBillModel } from '../../models';
import type { Order } from '../../models/interfaces';
import { Logger } from '../../utils/logger';
import { pool } from '../../db/pool';
import { attachOptionsToOrderItems } from './orderItemOptionsService';
import { dispatchKitchenTicketsForCancellation } from '../kitchenPrinting/kitchenTicketDispatchService';
import { appendPerformedByNote, type CancellationType } from './orderCancellationTypes';

const logger = Logger.getInstance();

export async function cleanupCompensatingOrders(establishmentId: string, orderIds: number[]) {
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

export async function createChangeReversalOrder(input: {
  establishmentId: string;
  originalOrder: Order;
  orderId: number;
  reason: string;
  amount: number;
  performedBy: { userId?: string; displayName?: string };
  salesAttribution: ReturnType<typeof import('./orderCancellationTypes').salesAttributionFromOrder>;
}): Promise<Order> {
  return OrderModel.create(
    {
      total_amount: 0,
      total_tax: 0,
      payment_method: input.originalOrder.payment_method,
      status: 'completed',
      notes: appendPerformedByNote(
        `ANNULATION FAIRE DE LA MONNAIE - Raison: ${input.reason} - Order ID: ${input.orderId}`,
        input.performedBy
      ),
      tips: 0,
      change: -input.amount,
      operation_type: 'change',
      change_amount: -input.amount,
      establishment_id: input.establishmentId,
      ...input.salesAttribution,
    },
    input.establishmentId
  );
}

export async function createSaleCancellationRecords(input: {
  establishmentId: string;
  originalOrder: Order;
  orderId: number;
  reason: string;
  cancellationType: CancellationType;
  cancellationAmount: number;
  cancellationTax: number;
  cancelledItems: Awaited<ReturnType<typeof OrderItemModel.getByOrderId>>;
  originalSubBills: Awaited<ReturnType<typeof SubBillModel.getByOrderId>>;
  performedBy: { userId?: string; displayName?: string };
  salesAttribution: ReturnType<typeof import('./orderCancellationTypes').salesAttributionFromOrder>;
}): Promise<{
  cancellationOrder: Order;
  cancellationOrderItems: Awaited<ReturnType<typeof OrderItemModel.create>>[];
  cancellationSubBills: Awaited<ReturnType<typeof SubBillModel.getByOrderId>>;
}> {
  const cancellationOrder = await OrderModel.create(
    {
      total_amount: -input.cancellationAmount,
      total_tax: -input.cancellationTax,
      payment_method: input.originalOrder.payment_method,
      status: 'completed',
      notes: appendPerformedByNote(
        `ANNULATION - ${input.cancellationType.toUpperCase()} - Raison: ${input.reason} - Order ID: ${input.orderId}`,
        input.performedBy
      ),
      establishment_id: input.establishmentId,
      ...input.salesAttribution,
    },
    input.establishmentId
  );

  const cancellationOrderItems = await Promise.all(
    input.cancelledItems.map(async (item) => {
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
        input.establishmentId
      );
    })
  );

  let cancellationSubBills: Awaited<ReturnType<typeof SubBillModel.getByOrderId>> = [];
  if (input.originalOrder.payment_method === 'split' && input.originalSubBills.length > 0) {
    if (input.cancellationType === 'full') {
      cancellationSubBills = await Promise.all(
        input.originalSubBills.map(async (sb) =>
          SubBillModel.create(
            {
              order_id: cancellationOrder.id,
              payment_method: sb.payment_method,
              amount: -sb.amount,
              status: sb.status,
            },
            input.establishmentId
          )
        )
      );
    } else if (input.cancellationAmount > 0) {
      const totalOriginalSplitAmount = input.originalSubBills.reduce(
        (sum, sb) => sum + Number(sb.amount),
        0
      );

      if (totalOriginalSplitAmount > 0) {
        const ratio = input.cancellationAmount / totalOriginalSplitAmount;
        let remaining = input.cancellationAmount;

        cancellationSubBills = await Promise.all(
          input.originalSubBills.map(async (sb, index) => {
            let amountToCancel: number;
            if (index === input.originalSubBills.length - 1) {
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
              input.establishmentId
            );
          })
        );
      }
    }
  }

  return { cancellationOrder, cancellationOrderItems, cancellationSubBills };
}

export async function createTipReversalOrder(input: {
  establishmentId: string;
  originalOrder: Order;
  orderId: number;
  reason: string;
  tipAmountToReverse: number;
  performedBy: { userId?: string; displayName?: string };
  salesAttribution: ReturnType<typeof import('./orderCancellationTypes').salesAttributionFromOrder>;
}): Promise<Order> {
  return OrderModel.create(
    {
      total_amount: 0,
      total_tax: 0,
      payment_method: input.originalOrder.payment_method,
      status: 'completed',
      notes: appendPerformedByNote(
        `ANNULATION POURBOIRE - Raison: ${input.reason} - Order ID: ${input.orderId}`,
        input.performedBy
      ),
      tips: 0,
      change: -input.tipAmountToReverse,
      operation_type: 'change',
      change_amount: -input.tipAmountToReverse,
      establishment_id: input.establishmentId,
      ...input.salesAttribution,
    },
    input.establishmentId
  );
}

export async function dispatchCancellationKitchenTickets(input: {
  establishmentId: string;
  originalOrderId: number;
  cancellationType: CancellationType;
  cancelledItems: Awaited<ReturnType<typeof OrderItemModel.getByOrderId>>;
  userId?: string;
}): Promise<void> {
  const cancelledItemsWithOptions = await attachOptionsToOrderItems(
    input.cancelledItems,
    input.establishmentId
  );
  void dispatchKitchenTicketsForCancellation(pool, {
    establishmentId: input.establishmentId,
    originalOrderId: input.originalOrderId,
    cancellationType: input.cancellationType,
    cancelledItems: cancelledItemsWithOptions,
    createdByUserId: input.userId != null ? Number(input.userId) : undefined,
    logger,
  });
}
