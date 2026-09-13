import { describe, expect, it } from 'vitest';
import type { OpenTicketItemDto } from '../../services/api/floor';
import type { ResumeTicketItem } from './tableResumeTimers';
import {
  formatResumeQty,
  groupResumeLines,
  resolveResumeDisplayStatus,
  resumeStatusLabel,
  summarizeResumeDisplay,
} from './tableResumeDisplay';

function item(
  partial: Partial<ResumeTicketItem> & Pick<OpenTicketItemDto, 'id' | 'product_name'>
): ResumeTicketItem {
  return {
    open_ticket_id: 1,
    product_id: 1,
    quantity: 1,
    unit_price: 10,
    total_price: 10,
    tax_rate: 0.1,
    tax_amount: 0.91,
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

describe('tableResumeDisplay', () => {
  it('formats unit quantities without decimals', () => {
    expect(formatResumeQty(1)).toBe('1×');
    expect(formatResumeQty(1.0)).toBe('1×');
    expect(formatResumeQty(1.000)).toBe('1×');
    expect(formatResumeQty(2.4)).toBe('2×');
  });

  it('resolves fulfillment beyond validated', () => {
    expect(
      resolveResumeDisplayStatus(
        item({ id: 1, product_name: 'A', line_status: 'validated', validated_at: 'x' })
      )
    ).toBe('validated');
    expect(
      resolveResumeDisplayStatus(
        item({
          id: 2,
          product_name: 'A',
          line_status: 'validated',
          kitchen_sent_at: 'x',
        })
      )
    ).toBe('sent');
    expect(
      resolveResumeDisplayStatus(
        item({
          id: 3,
          product_name: 'A',
          line_status: 'validated',
          kitchen_sent_at: 'x',
          served_at: 'y',
        })
      )
    ).toBe('served');
    expect(resumeStatusLabel('served')).toBe('Servi');
  });

  it('groups identical products with the same status', () => {
    const grouped = groupResumeLines([
      item({
        id: 1,
        product_id: 9,
        product_name: 'IPA',
        line_status: 'validated',
        served_at: '2026-09-10T18:00:00.000Z',
        kitchen_sent_at: '2026-09-10T17:59:00.000Z',
        quantity: 1,
        total_price: 7.5,
        sort_order: 1,
      }),
      item({
        id: 2,
        product_id: 9,
        product_name: 'IPA',
        line_status: 'validated',
        served_at: '2026-09-10T18:01:00.000Z',
        kitchen_sent_at: '2026-09-10T17:59:30.000Z',
        quantity: 1,
        total_price: 7.5,
        sort_order: 2,
      }),
      item({
        id: 3,
        product_id: 9,
        product_name: 'IPA',
        line_status: 'validated',
        kitchen_sent_at: null,
        served_at: null,
        quantity: 1,
        total_price: 7.5,
        sort_order: 3,
      }),
    ]);
    expect(grouped).toHaveLength(2);
    const served = grouped.find((g) => g.status === 'served');
    const validated = grouped.find((g) => g.status === 'validated');
    expect(served?.quantity).toBe(2);
    expect(served?.total_price).toBe(15);
    expect(served?.stepIso).toBe('2026-09-10T18:00:00.000Z');
    expect(validated?.quantity).toBe(1);
  });

  it('summarizes fulfillment counts', () => {
    expect(
      summarizeResumeDisplay([
        item({ id: 1, product_name: 'A', line_status: 'draft', total_price: 5 }),
        item({
          id: 2,
          product_name: 'B',
          line_status: 'validated',
          kitchen_sent_at: 'x',
          total_price: 8,
        }),
        item({
          id: 3,
          product_name: 'C',
          line_status: 'validated',
          served_at: 'y',
          total_price: 4,
        }),
        item({ id: 4, product_name: 'D', line_status: 'cancelled', total_price: 99 }),
      ])
    ).toEqual({
      draftCount: 1,
      validatedCount: 0,
      sentCount: 1,
      servedCount: 1,
      activeTotalTtc: 17,
    });
  });
});
