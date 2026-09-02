import type { OrderItem } from '../types';

/** Non-tip lines targeted by cart selection (empty selection = all eligible). */
export function resolveTargetOrderItems(
  order: OrderItem[],
  selectedIds: Set<string>
): OrderItem[] {
  const eligible = order.filter((line) => !line.isTip);
  if (selectedIds.size === 0) return eligible;
  return eligible.filter((line) => selectedIds.has(line.id));
}

export function resolveTargetIndices(order: OrderItem[], selectedIds: Set<string>): number[] {
  const targetIds = new Set(resolveTargetOrderItems(order, selectedIds).map((line) => line.id));
  return order
    .map((line, index) => (targetIds.has(line.id) ? index : -1))
    .filter((index) => index >= 0);
}

export function isFullCartSelection(order: OrderItem[], selectedIds: Set<string>): boolean {
  const sale = order.filter((line) => !line.isTip);
  if (sale.length === 0) return false;
  if (selectedIds.size === 0) return true;
  return sale.every((line) => selectedIds.has(line.id));
}

export function ticketLineIdsFromItems(items: OrderItem[]): number[] {
  return items
    .map((line) => line.ticketLineId)
    .filter((id): id is number => id != null && Number.isInteger(id) && id > 0);
}
