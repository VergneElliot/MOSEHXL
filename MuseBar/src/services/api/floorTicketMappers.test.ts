import { describe, expect, it } from 'vitest';
import type { OrderItem } from '../../types';
import { mapOrderItemToTicketPayload, mapTicketItemsToOrderItems } from './floorTicketMappers';
import type { OpenTicketItemDto } from './floorTicketTypes';

function orderItem(partial: Partial<OrderItem> & Pick<OrderItem, 'id'>): OrderItem {
  return {
    productId: '12',
    productName: 'Café',
    quantity: 2,
    unitPrice: 2.5,
    totalPrice: 5,
    taxRate: 0.1,
    taxAmount: 0.45,
    isHappyHourApplied: false,
    ...partial,
  };
}

function dto(partial: Partial<OpenTicketItemDto> & Pick<OpenTicketItemDto, 'id'>): OpenTicketItemDto {
  return {
    open_ticket_id: 1,
    product_id: 12,
    product_name: 'Café',
    quantity: 1,
    unit_price: 2.5,
    total_price: 2.5,
    tax_rate: 0.1,
    tax_amount: 0.23,
    happy_hour_applied: false,
    happy_hour_discount_amount: 0,
    is_manual_happy_hour: false,
    description: '',
    options_json: [],
    kitchen_printer_ids_snapshot: null,
    print_pickup_slip_snapshot: false,
    sort_order: 0,
    ...partial,
  };
}

describe('floorTicketMappers', () => {
  it('mapOrderItemToTicketPayload maps ids, tax fallback, and happy hour', () => {
    const payload = mapOrderItemToTicketPayload(
      orderItem({
        id: '1',
        isHappyHourApplied: true,
        isManualHappyHour: true,
        originalPrice: 3,
        unitPrice: 2,
        quantity: 2,
        totalPrice: 4,
        taxAmount: undefined as unknown as number,
        description: 'note',
        options: [{ groupId: 'g1', groupName: 'Size', choiceId: 'c1', choiceLabel: 'L' }],
      }),
      3
    );
    expect(payload.product_id).toBe(12);
    expect(payload.sort_order).toBe(3);
    expect(payload.happy_hour_applied).toBe(true);
    expect(payload.is_manual_happy_hour).toBe(true);
    expect(payload.happy_hour_discount_amount).toBe(2);
    expect(payload.description).toBe('note');
    expect(payload.tax_amount).toBeCloseTo((4 * 0.1) / 1.1, 10);
  });

  it('mapOrderItemToTicketPayload nulls non-numeric productId', () => {
    expect(mapOrderItemToTicketPayload(orderItem({ id: '1', productId: null }), 0).product_id).toBeNull();
    expect(mapOrderItemToTicketPayload(orderItem({ id: '1', productId: 'x' }), 0).product_id).toBeNull();
  });

  it('mapTicketItemsToOrderItems maps dto fields and options', () => {
    const items = mapTicketItemsToOrderItems([
      dto({
        id: 9,
        line_status: 'draft',
        happy_hour_applied: true,
        is_manual_happy_hour: true,
        description: 'desc',
        options_json: [
          {
            group_id: 1,
            group_name: 'Extra',
            choice_id: 2,
            choice_label: 'Oui',
            free_text: null,
            display_order: 1,
          },
        ],
      }),
      dto({ id: 10, product_id: null, line_status: 'weird' as 'validated', options_json: null }),
    ]);
    expect(items[0]).toMatchObject({
      id: 'ticket-line-9',
      ticketLineId: 9,
      tableLineStatus: 'draft',
      productId: '12',
      isHappyHourApplied: true,
      isManualHappyHour: true,
      description: 'desc',
    });
    expect(items[0]?.options?.[0]).toMatchObject({
      groupId: '1',
      groupName: 'Extra',
      choiceId: '2',
      choiceLabel: 'Oui',
      displayOrder: 1,
    });
    expect(items[1]?.productId).toBeNull();
    expect(items[1]?.tableLineStatus).toBe('validated');
    expect(items[1]?.options).toEqual([]);
  });
});
