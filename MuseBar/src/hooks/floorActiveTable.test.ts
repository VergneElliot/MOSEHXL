import { describe, expect, it } from 'vitest';
import type { DiningTableStatusDto } from '../services/api/floor';
import type { OrderItem } from '../types';
import type { PinActorState } from '../contexts/pinSessionsState';
import {
  buildActiveTableState,
  cartHasValidatedTableLine,
  withTableDraftStatus,
} from './floorActiveTable';

function line(partial: Partial<OrderItem> & Pick<OrderItem, 'id'>): OrderItem {
  return {
    productId: 'p1',
    productName: 'Item',
    quantity: 1,
    unitPrice: 1,
    totalPrice: 1,
    taxRate: 0.1,
    taxAmount: 0.09,
    isHappyHourApplied: false,
    ...partial,
  };
}

const pinActor: PinActorState = {
  token: 'tok',
  userId: 7,
  displayName: 'Alice',
  email: 'a@b.c',
  role: 'staff',
  permissions: [],
};

function diningTable(partial: Partial<DiningTableStatusDto> = {}): DiningTableStatusDto {
  return {
    id: 3,
    establishment_id: 'e',
    floor_plan_id: 2,
    label: '12',
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

describe('floorActiveTable', () => {
  it('withTableDraftStatus defaults non-tips to draft', () => {
    const tip = line({ id: 't', isTip: true });
    const sale = line({ id: 's' });
    const validated = line({ id: 'v', tableLineStatus: 'validated' });
    expect(withTableDraftStatus([tip, sale, validated])).toEqual([
      tip,
      { ...sale, tableLineStatus: 'draft' },
      validated,
    ]);
  });

  it('cartHasValidatedTableLine ignores tips', () => {
    expect(cartHasValidatedTableLine([line({ id: '1', tableLineStatus: 'draft' })])).toBe(false);
    expect(
      cartHasValidatedTableLine([
        line({ id: 'tip', isTip: true, tableLineStatus: 'validated' }),
        line({ id: '2', tableLineStatus: 'validated' }),
      ])
    ).toBe(true);
  });

  it('buildActiveTableState falls back to PIN actor waiter', () => {
    expect(buildActiveTableState(diningTable(), 99, null, null, pinActor)).toEqual({
      id: 3,
      label: '12',
      floorPlanId: 2,
      ticketId: 99,
      assignedWaiterUserId: 7,
      assignedWaiterDisplayName: 'Alice',
    });
    expect(buildActiveTableState(diningTable(), 1, 9, 'Bob', pinActor).assignedWaiterDisplayName).toBe(
      'Bob'
    );
    expect(
      buildActiveTableState(diningTable(), 1, 9, null, pinActor).assignedWaiterDisplayName
    ).toBeNull();
  });
});
