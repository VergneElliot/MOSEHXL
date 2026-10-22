import { describe, expect, it } from 'vitest';
import type { OrderItemOption } from '../types';
import {
  getLineNoteFromOptions,
  isLineNoteOption,
  LINE_NOTE_DISPLAY_ORDER,
  LINE_NOTE_GROUP_NAME,
  LINE_NOTE_MAX_LENGTH,
  upsertLineNoteInOptions,
} from './lineItemNote';

describe('lineItemNote', () => {
  it('isLineNoteOption is true when groupId missing', () => {
    expect(isLineNoteOption({ groupName: 'Note', freeText: 'x' })).toBe(true);
    expect(isLineNoteOption({ groupId: 'g', groupName: 'Size' })).toBe(false);
  });

  it('getLineNoteFromOptions reads trimmed freeText', () => {
    expect(getLineNoteFromOptions(undefined)).toBe('');
    expect(
      getLineNoteFromOptions([
        { groupId: 'g', groupName: 'Size', choiceLabel: 'L' },
        { groupName: 'Note', freeText: '  sans glace  ' },
      ])
    ).toBe('sans glace');
  });

  it('upsertLineNoteInOptions adds, replaces, clears, and truncates', () => {
    const preset: OrderItemOption[] = [{ groupId: 'g', groupName: 'Size', choiceLabel: 'L' }];
    const withNote = upsertLineNoteInOptions(preset, '  hello  ');
    expect(withNote).toEqual([
      ...preset,
      {
        groupName: LINE_NOTE_GROUP_NAME,
        freeText: 'hello',
        displayOrder: LINE_NOTE_DISPLAY_ORDER,
      },
    ]);

    const replaced = upsertLineNoteInOptions(withNote, 'new');
    expect(replaced.filter((o) => isLineNoteOption(o))).toHaveLength(1);
    expect(getLineNoteFromOptions(replaced)).toBe('new');

    expect(upsertLineNoteInOptions(withNote, '   ')).toEqual(preset);

    const long = 'x'.repeat(LINE_NOTE_MAX_LENGTH + 20);
    expect(getLineNoteFromOptions(upsertLineNoteInOptions([], long)).length).toBe(LINE_NOTE_MAX_LENGTH);
  });
});
