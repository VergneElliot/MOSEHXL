import type { OrderItem } from '../../types';
import { mapOrderItemOptionsToApiPayload } from '../../utils/orderItemOptions';
import type { OpenTicketItemDto } from './floorTicketTypes';

export function mapOrderItemToTicketPayload(item: OrderItem, index: number) {
  return {
    product_id: item.productId
      ? Number.isNaN(parseInt(String(item.productId), 10))
        ? null
        : parseInt(String(item.productId), 10)
      : null,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    tax_rate: item.taxRate,
    tax_amount: item.taxAmount ?? (item.totalPrice * item.taxRate) / (1 + item.taxRate),
    happy_hour_applied: item.isHappyHourApplied,
    happy_hour_discount_amount: item.isHappyHourApplied
      ? item.originalPrice
        ? (item.originalPrice - item.unitPrice) * item.quantity
        : 0
      : 0,
    is_manual_happy_hour: item.isHappyHourApplied === true && item.isManualHappyHour === true,
    description: item.description || '',
    options_json: mapOrderItemOptionsToApiPayload(item.options) ?? [],
    sort_order: index,
  };
}

export function mapTicketItemsToOrderItems(items: OpenTicketItemDto[]): OrderItem[] {
  return items.map((item) => {
    const optionsRaw = Array.isArray(item.options_json) ? item.options_json : [];
    const lineStatus =
      item.line_status === 'validated' || item.line_status === 'draft'
        ? item.line_status
        : 'validated';
    return {
      id: `ticket-line-${item.id}`,
      ticketLineId: item.id,
      tableLineStatus: lineStatus,
      productId: item.product_id != null ? String(item.product_id) : null,
      productName: item.product_name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
      taxRate: Number(item.tax_rate),
      taxAmount: Number(item.tax_amount),
      isHappyHourApplied: item.happy_hour_applied === true,
      isManualHappyHour: item.is_manual_happy_hour === true,
      description: item.description || undefined,
      options: optionsRaw.map((opt: unknown, optIndex: number) => {
        const row = (opt && typeof opt === 'object' ? opt : {}) as Record<string, unknown>;
        return {
          groupId: row.group_id != null ? String(row.group_id) : row.groupId != null ? String(row.groupId) : undefined,
          groupName: String(row.group_name ?? row.groupName ?? 'Option'),
          choiceId: row.choice_id != null ? String(row.choice_id) : row.choiceId != null ? String(row.choiceId) : null,
          choiceLabel:
            row.choice_label != null
              ? String(row.choice_label)
              : row.choiceLabel != null
                ? String(row.choiceLabel)
                : null,
          freeText:
            row.free_text != null ? String(row.free_text) : row.freeText != null ? String(row.freeText) : null,
          displayOrder: typeof row.display_order === 'number' ? row.display_order : optIndex,
        };
      }),
    };
  });
}
