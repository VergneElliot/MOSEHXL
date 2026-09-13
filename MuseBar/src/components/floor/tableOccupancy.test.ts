import { describe, expect, it } from 'vitest';
import type { DiningTableStatusDto } from '../../services/api/floor';
import { tableHasActiveOrder, tableIsTransferDestination } from './tableOccupancy';

function table(partial: Partial<DiningTableStatusDto>): DiningTableStatusDto {
  return {
    id: 1,
    establishment_id: 'e',
    floor_plan_id: 1,
    label: '1',
    pos_x: 0,
    pos_y: 0,
    width: 80,
    height: 80,
    capacity: null,
    shape: 'rectangle',
    sort_order: 0,
    is_active: true,
    open_ticket_id: null,
    open_ticket_updated_at: null,
    opened_by_user_id: null,
    last_served_by_user_id: null,
    has_validated_items: false,
    ...partial,
  };
}

describe('tableOccupancy', () => {
  it('treats empty open ticket shells as free', () => {
    const t = table({
      open_ticket_id: 99,
      has_active_items: false,
      has_validated_items: false,
    });
    expect(tableHasActiveOrder(t)).toBe(false);
    expect(tableIsTransferDestination(t)).toBe(true);
  });

  it('treats draft or validated lines as occupied', () => {
    expect(tableHasActiveOrder(table({ has_active_items: true }))).toBe(true);
    expect(tableIsTransferDestination(table({ has_active_items: true }))).toBe(false);
  });
});
