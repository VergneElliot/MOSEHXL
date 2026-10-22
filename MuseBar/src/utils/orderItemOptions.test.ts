import { describe, expect, it } from 'vitest';
import type { OrderItemOption } from '../types';
import {
  formatOrderItemOptionLabel,
  mapOrderItemOptionsToApiPayload,
} from './orderItemOptions';

function opt(partial: Partial<OrderItemOption>): OrderItemOption {
  return {
    groupName: 'Group',
    displayOrder: 0,
    ...partial,
  };
}

describe('formatOrderItemOptionLabel', () => {
  it('prefers choice labels with optional group prefix', () => {
    expect(formatOrderItemOptionLabel(opt({ choiceLabel: 'Large', groupName: 'Size' }))).toBe(
      'Size: Large'
    );
    expect(formatOrderItemOptionLabel(opt({ choiceLabel: 'Large', groupName: '' }))).toBe('Large');
  });

  it('formats free text and skips group prefix for line notes', () => {
    expect(
      formatOrderItemOptionLabel(opt({ freeText: 'sans glace', groupId: 'g1', groupName: 'Extra' }))
    ).toBe('Extra: sans glace');
    expect(
      formatOrderItemOptionLabel(opt({ freeText: 'note', groupId: undefined, groupName: 'Note' }))
    ).toBe('note');
  });

  it('falls back to group name alone', () => {
    expect(formatOrderItemOptionLabel(opt({ groupName: 'Only' }))).toBe('Only');
  });
});

describe('mapOrderItemOptionsToApiPayload', () => {
  it('returns undefined for empty input', () => {
    expect(mapOrderItemOptionsToApiPayload(undefined)).toBeUndefined();
    expect(mapOrderItemOptionsToApiPayload([])).toBeUndefined();
  });

  it('maps ids to numbers and trims free text', () => {
    expect(
      mapOrderItemOptionsToApiPayload([
        opt({ groupId: '10', choiceId: '20', freeText: '  hi  ' }),
        opt({ groupId: '', choiceId: null, freeText: '   ' }),
      ])
    ).toEqual([
      { group_id: 10, choice_id: 20, free_text: 'hi' },
      { group_id: null, choice_id: null, free_text: null },
    ]);
  });
});
