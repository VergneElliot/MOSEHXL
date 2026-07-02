export interface PrintableReceiptLineItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function receiptLineGroupingKey(item: PrintableReceiptLineItem): string {
  return [
    item.product_name.trim(),
    roundMoney(Number(item.unit_price) || 0).toFixed(2),
    String(Number(item.tax_rate) || 0),
  ].join('\0');
}

/** Merge identical receipt/invoice lines for thermal, bridge, and PDF output only. */
export function groupReceiptLineItemsForPrint<T extends PrintableReceiptLineItem>(items: T[]): T[] {
  if (items.length <= 1) return items;

  const grouped = new Map<string, T>();
  for (const item of items) {
    const key = receiptLineGroupingKey(item);
    const qty = Number(item.quantity) || 0;
    const total = Number(item.total_price) || 0;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity = (Number(existing.quantity) || 0) + qty;
      existing.total_price = roundMoney((Number(existing.total_price) || 0) + total);
    } else {
      grouped.set(key, {
        ...item,
        quantity: qty,
        unit_price: roundMoney(Number(item.unit_price) || 0),
        total_price: roundMoney(total),
      });
    }
  }
  return [...grouped.values()];
}
