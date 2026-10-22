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

  it('maps waiter/table/kitchen metadata and option rows', async () => {
    mockedRequest.mockResolvedValueOnce([
      {
        id: 9,
        total_amount: 'bad',
        total_tax: null,
        created_at: '2026-05-01T00:00:00.000Z',
        status: 'completed',
        payment_method: 'cash',
        waiter_user_id: 4,
        waiter_display_name: 'Bob',
        table_label: 'T2',
        legal_sequence_number: 12,
        kitchen_ticket_day_number: 3,
        kitchen_print_targets: [
          {
            printer_id: 1,
            printer_name: 'Cuisine',
            printer_slug: 'cuisine',
            kitchen_ticket_day_number: 3,
          },
        ],
        cashier_user_id: 8,
        cashier_display_name: 'Ann',
        items: [
          {
            product_name: 'Mystery',
            quantity: '1',
            unit_price: '5',
            total_price: '0',
            tax_rate: '10',
            tax_amount: '0',
            options: [
              {
                id: 50,
                group_id: 1,
                group_name_snapshot: 'Extra',
                choice_id: null,
                choice_label_snapshot: null,
                free_text: 'note',
                display_order: 2,
              },
            ],
          },
        ],
      },
    ]);

    const [order] = await getOrders();
    expect(order).toMatchObject({
      id: '9',
      totalAmount: 0,
      taxAmount: 0,
      waiterUserId: 4,
      waiterDisplayName: 'Bob',
      tableLabel: 'T2',
      legalSequenceNumber: 12,
      kitchenTicketDayNumber: 3,
      cashierUserId: 8,
      cashierDisplayName: 'Ann',
    });
    expect(order?.kitchenPrintTargets?.[0]).toMatchObject({
      printerId: 1,
      printerName: 'Cuisine',
      printerSlug: 'cuisine',
    });
    expect(order?.items[0]).toMatchObject({
      productId: 'unknown',
      productName: 'Mystery',
      isOffert: true,
      taxRate: 0.1,
    });
    expect(order?.items[0]?.options?.[0]).toMatchObject({
      id: '50',
      groupId: '1',
      freeText: 'note',
      choiceId: null,
    });
  });
});
