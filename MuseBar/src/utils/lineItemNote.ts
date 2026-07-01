import type { OrderItemOption } from '../types';

export const LINE_NOTE_GROUP_NAME = 'Note';
export const LINE_NOTE_MAX_LENGTH = 120;
export const LINE_NOTE_DISPLAY_ORDER = 9999;

export function isLineNoteOption(option: OrderItemOption): boolean {
  return !option.groupId;
}

export function getLineNoteFromOptions(options?: OrderItemOption[]): string {
  const lineNote = options?.find((option) => isLineNoteOption(option));
  return lineNote?.freeText?.trim() ?? '';
}

export function upsertLineNoteInOptions(
  options: OrderItemOption[] | undefined,
  text: string
): OrderItemOption[] {
  const presetOptions = (options ?? []).filter((option) => !isLineNoteOption(option));
  const trimmed = text.trim().slice(0, LINE_NOTE_MAX_LENGTH);
  if (!trimmed) return presetOptions;

  return [
    ...presetOptions,
    {
      groupName: LINE_NOTE_GROUP_NAME,
      freeText: trimmed,
      displayOrder: LINE_NOTE_DISPLAY_ORDER,
    },
  ];
}
