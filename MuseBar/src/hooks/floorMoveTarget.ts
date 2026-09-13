import type { DiningTableStatusDto } from '../services/api/floor';
import { tableHasActiveOrder } from '../components/floor/tableOccupancy';

export type FloorMoveTargetAction = 'merge' | 'transfer' | 'noop';

/** Decide merge vs transfer for Caisse « Assigner à » / move-table. */
export function resolveFloorMoveTargetAction(
  table: DiningTableStatusDto,
  activeTicketId: number
): FloorMoveTargetAction {
  if (table.open_ticket_id === activeTicketId) return 'noop';
  if (tableHasActiveOrder(table) && table.open_ticket_id != null) return 'merge';
  if (!tableHasActiveOrder(table)) return 'transfer';
  return 'noop';
}
