import { describe, expect, it } from 'vitest';
import type { OrderItem } from '../types';
import {
  isFullCartSelection,
  resolveTargetIndices,
  resolveTargetOrderItems,
  ticketLineIdsFromItems,
} from './posCartSelection';

function item(partial: Partial<OrderItem> & Pick<OrderItem, 'id'>): OrderItem {
  return {
    productId: '1',
    productName: 'X',
    quantity: 1,
    unitPrice: 1,
    totalPrice: 1,
    taxRate: 0.2,
    taxAmount: 0,
    isHappyHourApplied: false,
    ...partial,
  };
}

describe('posCartSelection', () => {
  const order = [
    item({ id: 'a' }),
    item({ id: 'tip', isTip: true }),
    item({ id: 'b' }),
  ];

  it('resolveTargetOrderItems treats empty selection as all non-tips', () => {
    expect(resolveTargetOrderItems(order, new Set()).map((i) => i.id)).toEqual(['a', 'b']);
    expect(resolveTargetOrderItems(order, new Set(['a', 'tip'])).map((i) => i.id)).toEqual(['a']);
  });

  it('resolveTargetIndices returns original indices for targets', () => {
    expect(resolveTargetIndices(order, new Set())).toEqual([0, 2]);
    expect(resolveTargetIndices(order, new Set(['b']))).toEqual([2]);
  });

  it('isFullCartSelection', () => {
    expect(isFullCartSelection([], new Set())).toBe(false);
    expect(isFullCartSelection(order, new Set())).toBe(true);
    expect(isFullCartSelection(order, new Set(['a', 'b']))).toBe(true);
    expect(isFullCartSelection(order, new Set(['a']))).toBe(false);
  });

  it('ticketLineIdsFromItems filters positive integers', () => {
    expect(
      ticketLineIdsFromItems([
        item({ id: '1', ticketLineId: 5 }),
        item({ id: '2', ticketLineId: 0 }),
        item({ id: '3', ticketLineId: 1.5 }),
        item({ id: '4' }),
      ])
    ).toEqual([5]);
  });
});
