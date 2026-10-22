import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order, OrderItem } from '../../models/interfaces';

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  getItemsByOrderId: vi.fn(),
  getSubBillsByOrderId: vi.fn(),
}));

vi.mock('../../models', () => ({
  OrderModel: { getById: mocks.getOrderById },
  OrderItemModel: { getByOrderId: mocks.getItemsByOrderId },
  SubBillModel: { getByOrderId: mocks.getSubBillsByOrderId },
}));

import {
  computeCancellationAmounts,
  validateUnifiedCancellation,
} from './orderCancellationValidate';

const EST = 'est-test-uuid';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 42,
    establishment_id: EST,
    total_amount: 33,
    total_tax: 3,
    payment_method: 'card',
    status: 'completed',
    notes: 'Table 1',
    waiter_user_id: 7,
    waiter_display_name: 'Alice',
    table_label: 'T1',
    created_at: new Date('2026-01-01T12:00:00Z'),
    updated_at: new Date('2026-01-01T12:00:00Z'),
    ...overrides,
  };
}

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 1,
    order_id: 42,
    product_name: 'Café',
    quantity: 1,
    unit_price: 11,
    total_price: 11,
    tax_rate: 0.1,
    tax_amount: 1,
    happy_hour_applied: false,
    happy_hour_discount_amount: 0,
    created_at: new Date('2026-01-01T12:00:00Z'),
    ...overrides,
  };
}

describe('validateUnifiedCancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getItemsByOrderId.mockResolvedValue([makeItem()]);
    mocks.getSubBillsByOrderId.mockResolvedValue([]);
  });

  it('rejects missing orderId or blank reason', async () => {
    const missingId = await validateUnifiedCancellation({
      establishmentId: EST,
      orderId: 0,
      reason: 'oops',
      cancellationType: 'full',
    });
    expect(missingId).toEqual({
      ok: false,
      response: {
        status: 400,
        body: { error: 'Order ID and cancellation reason are required' },
      },
    });

    const blankReason = await validateUnifiedCancellation({
      establishmentId: EST,
      orderId: 1,
      reason: '   ',
      cancellationType: 'full',
    });
    expect(blankReason.ok).toBe(false);
    expect(mocks.getOrderById).not.toHaveBeenCalled();
  });

  it('rejects invalid cancellation type', async () => {
    const result = await validateUnifiedCancellation({
      establishmentId: EST,
      orderId: 1,
      reason: 'client',
      // @ts-expect-error intentional invalid type
      cancellationType: 'refund',
    });
    expect(result).toEqual({
      ok: false,
      response: { status: 400, body: { error: 'Invalid cancellation type' } },
    });
  });

  it('returns 404 when order is missing', async () => {
    mocks.getOrderById.mockResolvedValue(null);
    const result = await validateUnifiedCancellation({
      establishmentId: EST,
      orderId: 99,
      reason: 'client',
      cancellationType: 'full',
    });
    expect(result).toEqual({
      ok: false,
      response: { status: 404, body: { error: 'Order not found' } },
    });
    expect(mocks.getOrderById).toHaveBeenCalledWith(99, EST);
  });

  it('rejects non-completed orders', async () => {
    mocks.getOrderById.mockResolvedValue(makeOrder({ status: 'pending' }));
    const result = await validateUnifiedCancellation({
      establishmentId: EST,
      orderId: 42,
      reason: 'client',
      cancellationType: 'full',
    });
    expect(result).toEqual({
      ok: false,
      response: { status: 400, body: { error: 'Only completed orders can be cancelled' } },
    });
  });

  it('loads items and skips sub-bills for non-split payments', async () => {
    const order = makeOrder({ payment_method: 'card' });
    const items = [makeItem({ id: 1 }), makeItem({ id: 2, total_price: 22, tax_amount: 2 })];
    mocks.getOrderById.mockResolvedValue(order);
    mocks.getItemsByOrderId.mockResolvedValue(items);

    const result = await validateUnifiedCancellation({
      establishmentId: EST,
      orderId: 42,
      reason: 'erreur',
      cancellationType: 'full',
      userId: 'u-1',
      performedByDisplayName: 'Bob',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.originalOrder).toBe(order);
    expect(result.data.originalItems).toBe(items);
    expect(result.data.originalSubBills).toEqual([]);
    expect(result.data.salesAttribution).toEqual({
      waiter_user_id: 7,
      waiter_display_name: 'Alice',
      table_label: 'T1',
    });
    expect(result.data.isChangeOperation).toBe(false);
    expect(result.data.performedBy).toEqual({ userId: 'u-1', displayName: 'Bob' });
    expect(mocks.getSubBillsByOrderId).not.toHaveBeenCalled();
  });

  it('loads sub-bills for split payments', async () => {
    const order = makeOrder({ payment_method: 'split' });
    const subBills = [{ id: 1, order_id: 42, amount: 10 }];
    mocks.getOrderById.mockResolvedValue(order);
    mocks.getSubBillsByOrderId.mockResolvedValue(subBills);

    const result = await validateUnifiedCancellation({
      establishmentId: EST,
      orderId: 42,
      reason: 'erreur',
      cancellationType: 'partial',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.originalSubBills).toBe(subBills);
    expect(mocks.getSubBillsByOrderId).toHaveBeenCalledWith(42, EST);
  });

  it('flags Faire de la Monnaie zero-total orders as change operations', async () => {
    mocks.getOrderById.mockResolvedValue(
      makeOrder({
        total_amount: 0,
        total_tax: 0,
        notes: 'Faire de la Monnaie — 20€',
      })
    );

    const result = await validateUnifiedCancellation({
      establishmentId: EST,
      orderId: 42,
      reason: 'annulation monnaie',
      cancellationType: 'full',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.isChangeOperation).toBe(true);
  });
});

describe('computeCancellationAmounts', () => {
  const items = [
    makeItem({ id: 1, total_price: 11, tax_amount: 1 }),
    makeItem({ id: 2, total_price: 22, tax_amount: 2 }),
  ];

  it('uses full order totals for full cancellation', () => {
    const order = makeOrder({ total_amount: 33, total_tax: 3 });
    const result = computeCancellationAmounts('full', order, items);
    expect(result).toEqual({
      ok: true,
      cancellationAmount: 33,
      cancellationTax: 3,
      cancelledItems: items,
    });
  });

  it('falls back to 0 when full totals are non-finite', () => {
    const order = makeOrder({
      total_amount: Number.NaN,
      total_tax: Number.POSITIVE_INFINITY,
    });
    const result = computeCancellationAmounts('full', order, items);
    expect(result).toEqual({
      ok: true,
      cancellationAmount: 0,
      cancellationTax: 0,
      cancelledItems: items,
    });
  });

  it('requires itemsToCancel for partial / items-only', () => {
    const order = makeOrder();
    expect(computeCancellationAmounts('partial', order, items)).toEqual({
      ok: false,
      response: {
        status: 400,
        body: { error: 'Items to cancel are required for partial cancellation' },
      },
    });
    expect(computeCancellationAmounts('items-only', order, items, [])).toEqual({
      ok: false,
      response: {
        status: 400,
        body: { error: 'Items to cancel are required for partial cancellation' },
      },
    });
  });

  it('sums selected items for partial cancellation', () => {
    const order = makeOrder();
    const result = computeCancellationAmounts('partial', order, items, [2]);
    expect(result).toEqual({
      ok: true,
      cancellationAmount: 22,
      cancellationTax: 2,
      cancelledItems: [items[1]],
    });
  });

  it('ignores unknown item ids when summing', () => {
    const order = makeOrder();
    const result = computeCancellationAmounts('items-only', order, items, [1, 999]);
    expect(result).toEqual({
      ok: true,
      cancellationAmount: 11,
      cancellationTax: 1,
      cancelledItems: [items[0]],
    });
  });
});
