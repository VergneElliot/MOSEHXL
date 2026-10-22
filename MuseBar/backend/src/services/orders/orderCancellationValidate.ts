import { OrderItemModel, OrderModel, SubBillModel } from '../../models';
import type { Order } from '../../models/interfaces';
import {
  salesAttributionFromOrder,
  type CancellationType,
  type UnifiedCancellationRequest,
  type UnifiedCancellationResponse,
} from './orderCancellationTypes';

const validTypes: CancellationType[] = ['full', 'partial', 'items-only'];

export type ValidatedCancellation = {
  originalOrder: Order;
  originalItems: Awaited<ReturnType<typeof OrderItemModel.getByOrderId>>;
  originalSubBills: Awaited<ReturnType<typeof SubBillModel.getByOrderId>>;
  salesAttribution: ReturnType<typeof salesAttributionFromOrder>;
  isChangeOperation: boolean;
  performedBy: { userId?: string; displayName?: string };
};

export async function validateUnifiedCancellation(
  input: UnifiedCancellationRequest
): Promise<{ ok: true; data: ValidatedCancellation } | { ok: false; response: UnifiedCancellationResponse }> {
  const { establishmentId, orderId, reason, cancellationType, userId, performedByDisplayName } = input;

  if (!orderId || !reason || typeof reason !== 'string' || !reason.trim()) {
    return {
      ok: false,
      response: {
        status: 400,
        body: { error: 'Order ID and cancellation reason are required' },
      },
    };
  }

  if (!validTypes.includes(cancellationType)) {
    return {
      ok: false,
      response: {
        status: 400,
        body: { error: 'Invalid cancellation type' },
      },
    };
  }

  const originalOrder = await OrderModel.getById(orderId, establishmentId);
  if (!originalOrder) {
    return {
      ok: false,
      response: {
        status: 404,
        body: { error: 'Order not found' },
      },
    };
  }

  if (originalOrder.status !== 'completed') {
    return {
      ok: false,
      response: {
        status: 400,
        body: { error: 'Only completed orders can be cancelled' },
      },
    };
  }

  const originalItems = await OrderItemModel.getByOrderId(orderId, establishmentId);
  const originalSubBills =
    originalOrder.payment_method === 'split'
      ? await SubBillModel.getByOrderId(orderId, establishmentId)
      : [];

  const isChangeOperation =
    originalOrder.total_amount === 0 &&
    originalOrder.total_tax === 0 &&
    originalOrder.notes &&
    originalOrder.notes.includes('Faire de la Monnaie');

  return {
    ok: true,
    data: {
      originalOrder,
      originalItems,
      originalSubBills,
      salesAttribution: salesAttributionFromOrder(originalOrder),
      isChangeOperation: Boolean(isChangeOperation),
      performedBy: { userId, displayName: performedByDisplayName },
    },
  };
}

export function computeCancellationAmounts(
  cancellationType: CancellationType,
  originalOrder: Order,
  originalItems: Awaited<ReturnType<typeof OrderItemModel.getByOrderId>>,
  itemsToCancel?: number[]
):
  | { ok: true; cancellationAmount: number; cancellationTax: number; cancelledItems: typeof originalItems }
  | { ok: false; response: UnifiedCancellationResponse } {
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
        ok: false,
        response: {
          status: 400,
          body: { error: 'Items to cancel are required for partial cancellation' },
        },
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
      ok: false,
      response: {
        status: 400,
        body: {
          error: 'Invalid cancellation totals computed from original order; data appears corrupted',
        },
      },
    };
  }

  return { ok: true, cancellationAmount, cancellationTax, cancelledItems };
}
