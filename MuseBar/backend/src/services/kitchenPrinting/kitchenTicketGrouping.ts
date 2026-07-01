import type { OrderItemOptionRecord } from '../../models/database/orderItemOptionModel';
import type { KitchenPrinterLineSnapshot } from './kitchenPrinterSnapshot';
import type { KitchenTicketLine, KitchenTicketOptionLine, KitchenTicketPrinterGroup } from './kitchenTicketTypes';

export interface KitchenDispatchOrderItem {
  product_id?: number;
  product_name: string;
  quantity: number;
  kitchen_printer_ids_snapshot?: unknown;
  print_pickup_slip_snapshot?: boolean;
  options?: OrderItemOptionRecord[];
}

export function parseKitchenPrinterSnapshot(value: unknown): KitchenPrinterLineSnapshot[] {
  if (value == null) return [];
  let rows: unknown = value;
  if (typeof value === 'string') {
    try {
      rows = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(rows)) return [];

  const snapshots: KitchenPrinterLineSnapshot[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const id = Number(record.id);
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const slug = typeof record.slug === 'string' ? record.slug.trim() : '';
    if (!Number.isInteger(id) || id < 1 || !name || !slug) continue;
    snapshots.push({ id, name, slug });
  }
  return snapshots;
}

function mapOptions(options: OrderItemOptionRecord[] | undefined): KitchenTicketOptionLine[] {
  if (!options?.length) return [];
  return [...options]
    .sort((a, b) => a.display_order - b.display_order || a.id - b.id)
    .map((option) => ({
      group_name: option.group_name_snapshot,
      choice_label: option.choice_label_snapshot,
      free_text: option.free_text,
    }));
}

export function groupKitchenTicketLinesByPrinter(
  items: KitchenDispatchOrderItem[]
): KitchenTicketPrinterGroup[] {
  const groups = new Map<number, KitchenTicketPrinterGroup>();

  for (const item of items) {
    const printers = parseKitchenPrinterSnapshot(item.kitchen_printer_ids_snapshot);
    if (printers.length === 0) continue;

    const line: KitchenTicketLine = {
      quantity: Number(item.quantity) || 0,
      product_name: item.product_name,
      options: mapOptions(item.options),
    };

    for (const printer of printers) {
      const existing = groups.get(printer.id);
      if (existing) {
        existing.lines.push(line);
      } else {
        groups.set(printer.id, { printer, lines: [line] });
      }
    }
  }

  return [...groups.values()].filter((group) => group.lines.length > 0);
}
