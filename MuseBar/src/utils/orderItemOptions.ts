import type { OrderItemOption } from '../types';
import { isLineNoteOption } from './lineItemNote';

export function formatOrderItemOptionLabel(option: OrderItemOption): string {
  if (option.choiceLabel) {
    return option.groupName ? `${option.groupName}: ${option.choiceLabel}` : option.choiceLabel;
  }
  if (option.freeText) {
    return option.groupName && !isLineNoteOption(option)
      ? `${option.groupName}: ${option.freeText}`
      : option.freeText;
  }
  return option.groupName;
}

export function mapOrderItemOptionsToApiPayload(options?: OrderItemOption[]) {
  if (!options?.length) return undefined;
  return options.map((option) => ({
    group_id: option.groupId ? parseInt(option.groupId, 10) : null,
    choice_id: option.choiceId ? parseInt(option.choiceId, 10) : null,
    free_text: option.freeText?.trim() || null,
  }));
}
