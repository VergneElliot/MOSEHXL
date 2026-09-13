import { describe, expect, it } from 'vitest';
import type { OngoingOrderItemDto } from '../../services/api/floorOngoingOrders';
import { formatOngoingQty, groupOngoingItems } from './ongoingOrderGroupLines';

function item(partial: Partial<OngoingOrderItemDto> & Pick<OngoingOrderItemDto, 'id' | 'product_name'>): OngoingOrderItemDto {
  return {
    quantity: 1,
    unit_price: 7.5,
    total_price: 7.5,
    line_status: 'validated',
    kitchen_sent_at: null,
    validated_at: '2026-09-10T18:00:00.000Z',
    served_at: null,
    fulfillment_status: 'validated',
    ...partial,
  };
}

describe('ongoingOrderGroupLines', () => {
  it('formats unit qty', () => {
    expect(formatOngoingQty(1.0)).toBe('1×');
  });

  it('groups same product and status; keeps different statuses apart', () => {
    const grouped = groupOngoingItems([
      item({ id: 1, product_name: 'IPA', fulfillment_status: 'served', served_at: 'a', kitchen_sent_at: 'b' }),
      item({ id: 2, product_name: 'IPA', fulfillment_status: 'served', served_at: 'c', kitchen_sent_at: 'd' }),
      item({ id: 3, product_name: 'IPA', fulfillment_status: 'validated' }),
    ]);
    expect(grouped).toHaveLength(2);
    const served = grouped.find((g) => g.fulfillment_status === 'served');
    expect(served?.quantity).toBe(2);
    expect(served?.itemIds).toEqual([1, 2]);
    expect(grouped.find((g) => g.fulfillment_status === 'validated')?.itemIds).toEqual([3]);
  });
});
