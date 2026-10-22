import { describe, expect, it } from 'vitest';
import type { DiningTableStatusDto } from '../services/api/floor';
import { resolveFloorMoveTargetAction } from './floorMoveTarget';

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

describe('resolveFloorMoveTargetAction', () => {
  it('returns noop for the active ticket table', () => {
    expect(resolveFloorMoveTargetAction(table({ open_ticket_id: 5 }), 5)).toBe('noop');
  });

  it('returns merge when destination has an active order', () => {
    expect(
      resolveFloorMoveTargetAction(table({ open_ticket_id: 8, has_active_items: true }), 5)
    ).toBe('merge');
  });

  it('returns transfer when destination is free', () => {
    expect(
      resolveFloorMoveTargetAction(table({ open_ticket_id: null, has_active_items: false }), 5)
    ).toBe('transfer');
  });

  it('returns noop for occupied shell without open ticket id', () => {
    expect(
      resolveFloorMoveTargetAction(table({ open_ticket_id: null, has_active_items: true }), 5)
    ).toBe('noop');
  });
});
