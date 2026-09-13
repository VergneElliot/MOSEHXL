import type { OngoingOrderItemDto } from '../../services/api/floorOngoingOrders';
import { formatResumeQty } from '../floor/tableResumeDisplay';

export type OngoingGroupedLine = {
  key: string;
  product_name: string;
  quantity: number;
  total_price: number;
  unit_price: number;
  fulfillment_status: OngoingOrderItemDto['fulfillment_status'];
  /** Earliest timestamp for the current fulfillment step (age label). */
  ageItem: OngoingOrderItemDto;
  itemIds: number[];
};

function earlierIso(a: string | null, b: string | null): string | null {
  if (a == null) return b;
  if (b == null) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

function pickAgeItem(current: OngoingOrderItemDto, next: OngoingOrderItemDto): OngoingOrderItemDto {
  const status = current.fulfillment_status;
  const curTs =
    status === 'served'
      ? current.served_at
      : status === 'sent'
        ? current.kitchen_sent_at
        : current.validated_at;
  const nextTs =
    status === 'served'
      ? next.served_at
      : status === 'sent'
        ? next.kitchen_sent_at
        : next.validated_at;
  const earlier = earlierIso(curTs, nextTs);
  if (earlier === nextTs && nextTs != null) return next;
  return current;
}

/** Consult grouping: same product + unit price + fulfillment status. */
export function groupOngoingItems(items: OngoingOrderItemDto[]): OngoingGroupedLine[] {
  const map = new Map<string, OngoingGroupedLine>();
  for (const item of items) {
    const key = [
      item.product_name,
      Number(item.unit_price),
      item.fulfillment_status,
    ].join('\u001f');
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        product_name: item.product_name,
        quantity: Number(item.quantity) || 0,
        total_price: Number(item.total_price) || 0,
        unit_price: Number(item.unit_price) || 0,
        fulfillment_status: item.fulfillment_status,
        ageItem: item,
        itemIds: [item.id],
      });
      continue;
    }
    existing.quantity += Number(item.quantity) || 0;
    existing.total_price += Number(item.total_price) || 0;
    existing.itemIds.push(item.id);
    existing.ageItem = pickAgeItem(existing.ageItem, item);
  }
  return [...map.values()];
}

export { formatResumeQty as formatOngoingQty };
