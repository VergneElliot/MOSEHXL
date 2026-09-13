import { describe, expect, it } from 'vitest';
import type { OpenTicketItemDto } from '../../services/api/floor';
import {
  elapsedSince,
  formatElapsedFr,
  lineAgeLabel,
  lineStatusLabel,
  resolveLineStatus,
  summarizeResumeLines,
  type ResumeTicketItem,
} from './tableResumeTimers';

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

describe('tableResumeTimers', () => {
  it('formats elapsed durations in French short form', () => {
    expect(formatElapsedFr(45_000)).toBe('45 s');
    expect(formatElapsedFr(5 * 60_000)).toBe('5 min');
    expect(formatElapsedFr(65 * 60_000)).toBe('1 h 05');
    expect(formatElapsedFr(50 * 60 * 60_000)).toBe('2 j 2 h');
  });

  it('maps line statuses and age labels', () => {
    const now = Date.parse('2026-09-10T12:00:00.000Z');
    const draft = item({
      id: 1,
      product_name: 'Café',
      line_status: 'draft',
      created_at: '2026-09-10T11:55:00.000Z',
    });
    const validated = item({
      id: 2,
      product_name: 'Plat',
      line_status: 'validated',
      validated_at: '2026-09-10T11:30:00.000Z',
      total_price: 20,
    });
    expect(resolveLineStatus(draft)).toBe('draft');
    expect(lineStatusLabel('validated')).toBe('Validée');
    expect(lineAgeLabel(draft, now)).toContain('Non validé depuis');
    expect(lineAgeLabel(validated, now)).toContain('Validée depuis');
    expect(elapsedSince('2026-09-10T11:00:00.000Z', now)).toBe('1 h');
  });

  it('summarizes active lines and TTC', () => {
    const summary = summarizeResumeLines([
      item({ id: 1, product_name: 'A', line_status: 'draft', total_price: 5 }),
      item({ id: 2, product_name: 'B', line_status: 'validated', total_price: 12 }),
      item({ id: 3, product_name: 'C', line_status: 'cancelled', total_price: 99 }),
    ]);
    expect(summary).toEqual({
      draftCount: 1,
      validatedCount: 1,
      activeTotalTtc: 17,
    });
  });
});
