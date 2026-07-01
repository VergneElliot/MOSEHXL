import type { OrderItem } from '../../models/interfaces';
import {
  OrderItemOptionModel,
  type OrderItemOptionRecord,
} from '../../models/database/orderItemOptionModel';

export type OrderItemWithOptions = OrderItem & {
  options?: OrderItemOptionRecord[];
};

export async function attachOptionsToOrderItems(
  items: OrderItem[],
  establishmentId: string
): Promise<OrderItemWithOptions[]> {
  if (items.length === 0) return [];
  const itemIds = items.map((item) => item.id);
  const optionsByItem = await OrderItemOptionModel.getByOrderItemIds(itemIds, establishmentId);
  return items.map((item) => ({
    ...item,
    options: optionsByItem.get(item.id) ?? [],
  }));
}
