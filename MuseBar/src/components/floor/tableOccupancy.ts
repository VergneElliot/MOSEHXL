import type { DiningTableStatusDto } from '../../services/api/floor';

/** True when the table has draft or validated lines (an order lives there). */
export function tableHasActiveOrder(table: DiningTableStatusDto): boolean {
  if (typeof table.has_active_items === 'boolean') {
    return table.has_active_items;
  }
  // Older payloads: fall back to validated-only flag.
  return table.has_validated_items === true;
}

/** Transfer destination is free when no active order lines exist. */
export function tableIsTransferDestination(table: DiningTableStatusDto): boolean {
  return !tableHasActiveOrder(table);
}
