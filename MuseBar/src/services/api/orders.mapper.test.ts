import { vi } from 'vitest';
import { getOrders, getOrdersPaginated } from './orders';
import { request } from './core';

vi.mock('./core', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

describe('orders API DTO mapper', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('maps wire DTO order shape to frontend Order view-model', async () => {
    mockedRequest.mockResolvedValueOnce([
      {
        id: 42,
        total_amount: '30.50',
        total_tax: '5.08',
        created_at: '2026-04-30T10:20:00.000Z',
        status: 'completed',
        payment_method: 'card',
        tips: 2,
        change: 0,
        operation_type: 'sale',
        change_amount: null,
        notes: 'table 7',
        items: [
          {
            id: 700,
            product_id: 5,
            product_name: 'Pint',
            quantity: '2',
            unit_price: '7.50',
            total_price: '15.00',
            tax_rate: '20',
            tax_amount: '2.50',
            happy_hour_applied: true,
            is_manual_happy_hour: true,
          },
        ],
        sub_bills: [
          {
            id: 1,
            payment_method: 'card',
            amount: '30.50',
            status: 'paid',
            created_at: '2026-04-30T10:21:00.000Z',
          },
        ],
      },
    ]);

    const orders = await getOrders();
    expect(orders).toHaveLength(1);
    const firstOrder = orders[0];
    expect(firstOrder).toBeDefined();
    if (!firstOrder) {
      throw new Error('Expected first order to be defined');
    }
    expect(firstOrder).toEqual(
      expect.objectContaining({
        id: '42',
        totalAmount: 30.5,
        taxAmount: 5.08,
        finalAmount: 30.5,
        paymentMethod: 'card',
        status: 'completed',
        tips: 2,
        notes: 'table 7',
      })
    );
    const firstOrderItem = firstOrder.items[0];
    expect(firstOrderItem).toBeDefined();
    if (!firstOrderItem) {
      throw new Error('Expected first order item to be defined');
    }
    expect(firstOrderItem).toEqual(
      expect.objectContaining({
        id: '700',
        productId: '5',
        productName: 'Pint',
        quantity: 2,
        unitPrice: 7.5,
        totalPrice: 15,
        taxRate: 0.2,
        taxAmount: 2.5,
        isHappyHourApplied: true,
        isManualHappyHour: true,
        isOffert: false,
      })
    );
    expect(firstOrder.subBills?.[0]).toEqual(
      expect.objectContaining({
        id: '1',
        orderId: '42',
        paymentMethod: 'card',
        amount: 30.5,
        status: 'paid',
      })
    );
  });

  it('supports both paginated and legacy array response shapes', async () => {
    mockedRequest
      .mockResolvedValueOnce([
        {
          id: 1,
          total_amount: 10,
          total_tax: 1.67,
          created_at: '2026-04-30T12:00:00.000Z',
          status: 'completed',
          payment_method: 'cash',
        },
      ])
      .mockResolvedValueOnce({
        orders: [
          {
            id: 2,
            total_amount: 20,
            total_tax: 3.33,
            created_at: '2026-04-30T13:00:00.000Z',
            status: 'completed',
            payment_method: 'card',
          },
        ],
        total: 50,
      });

    const legacy = await getOrdersPaginated({ limit: 1, offset: 0 });
    expect(legacy.total).toBe(1);
    const firstLegacyOrder = legacy.orders[0];
    expect(firstLegacyOrder).toBeDefined();
    if (!firstLegacyOrder) {
      throw new Error('Expected first legacy order to be defined');
    }
    expect(firstLegacyOrder.id).toBe('1');

    const paginated = await getOrdersPaginated({ limit: 1, offset: 1 });
    expect(paginated.total).toBe(50);
    const firstPaginatedOrder = paginated.orders[0];
    expect(firstPaginatedOrder).toBeDefined();
    if (!firstPaginatedOrder) {
      throw new Error('Expected first paginated order to be defined');
    }
    expect(firstPaginatedOrder.id).toBe('2');
  });
});
