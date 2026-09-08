import type { OrderItem } from '../types';
import type { DiningTableStatusDto } from '../services/api/floor';
import type { ActiveTableState, PinActorState } from '../contexts/PinSessionsContext';

export function withTableDraftStatus(items: OrderItem[]): OrderItem[] {
  return items.map((line) =>
    line.isTip ? line : { ...line, tableLineStatus: line.tableLineStatus ?? ('draft' as const) }
  );
}

export function cartHasValidatedTableLine(items: OrderItem[]): boolean {
  return items.some((line) => !line.isTip && line.tableLineStatus === 'validated');
}

export function buildActiveTableState(
  table: DiningTableStatusDto,
  ticketId: number,
  waiterUserId: number | null | undefined,
  waiterDisplayName: string | null | undefined,
  pinActor: PinActorState
): ActiveTableState {
  const assignedWaiterUserId = waiterUserId ?? pinActor.userId;
  const assignedWaiterDisplayName =
    waiterDisplayName ?? (assignedWaiterUserId === pinActor.userId ? pinActor.displayName : null);
  return {
    id: table.id,
    label: table.label,
    floorPlanId: table.floor_plan_id,
    ticketId,
    assignedWaiterUserId,
    assignedWaiterDisplayName,
  };
}
