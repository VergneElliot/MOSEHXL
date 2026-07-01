import type { OrderItemOption } from '../types';

export function formatOrderItemOptionLabel(option: OrderItemOption): string {
  if (option.choiceLabel) {
    return option.groupName ? `${option.groupName}: ${option.choiceLabel}` : option.choiceLabel;
  }
  if (option.freeText) {
    return option.groupName ? `${option.groupName}: ${option.freeText}` : option.freeText;
  }
  return option.groupName;
}

export function mapOrderItemOptionsToApiPayload(options?: OrderItemOption[]) {
  if (!options?.length) return undefined;
  return options.map((option) => ({
    group_id: parseInt(option.groupId, 10),
    choice_id: option.choiceId ? parseInt(option.choiceId, 10) : null,
    free_text: option.freeText?.trim() || null,
  }));
}
