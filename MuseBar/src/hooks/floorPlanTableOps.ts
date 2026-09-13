import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import type { ActiveTableState, PinActorState } from '../contexts/PinSessionsContext';
import { buildActiveTableState } from './floorActiveTable';
import { tableHasActiveOrder } from '../components/floor/tableOccupancy';
import type { TableDropPrompt } from '../components/floor/TableDropActionDialog';

export async function syncTicketItemsToServer(
  ticketId: number,
  token: string
): Promise<OrderItem[]> {
  const { items } = await floorApi.getTicket(ticketId);
  const orderItems = floorApi.mapTicketItemsToOrderItems(items);
  await floorApi.replaceTicketItems(ticketId, orderItems, token);
  return orderItems;
}

export async function primeDiningTableInSession(input: {
  table: floorApi.DiningTableStatusDto;
  pinActor: PinActorState;
  bindTable: (table: ActiveTableState, items: OrderItem[]) => void;
  clearActiveTable: () => void;
}): Promise<ActiveTableState | null> {
  const { table, pinActor, bindTable, clearActiveTable } = input;
  if (table.open_ticket_id != null) {
    const { ticket, items, served_by_display_name } = await floorApi.getTicket(table.open_ticket_id);
    const state = buildActiveTableState(
      table,
      ticket.id,
      ticket.last_served_by_user_id,
      served_by_display_name ?? null,
      pinActor
    );
    bindTable(state, floorApi.mapTicketItemsToOrderItems(items));
    return state;
  }
  clearActiveTable();
  return null;
}

export async function openDiningTableInSession(input: {
  table: floorApi.DiningTableStatusDto;
  pinActor: PinActorState;
  bindTable: (table: ActiveTableState, items: OrderItem[]) => void;
}): Promise<'loaded' | 'opened'> {
  const { table, pinActor, bindTable } = input;
  if (table.open_ticket_id != null) {
    const { ticket, items, served_by_display_name } = await floorApi.getTicket(table.open_ticket_id);
    bindTable(
      buildActiveTableState(
        table,
        ticket.id,
        ticket.last_served_by_user_id,
        served_by_display_name ?? null,
        pinActor
      ),
      floorApi.mapTicketItemsToOrderItems(items)
    );
    return 'loaded';
  }
  const { ticket } = await floorApi.openTicket(table.id, pinActor.token);
  bindTable(
    buildActiveTableState(
      table,
      ticket.id,
      ticket.last_served_by_user_id ?? pinActor.userId,
      pinActor.displayName,
      pinActor
    ),
    []
  );
  return 'opened';
}

export function buildTableDropPrompt(
  source: floorApi.DiningTableStatusDto,
  target: floorApi.DiningTableStatusDto
): TableDropPrompt {
  const sourceBusy = tableHasActiveOrder(source) || source.open_ticket_id != null;
  const targetBusy = tableHasActiveOrder(target);
  return {
    sourceLabel: source.label,
    targetLabel: target.label,
    canTransfer: sourceBusy && !targetBusy,
    canMerge: sourceBusy && targetBusy && source.open_ticket_id !== target.open_ticket_id,
  };
}

export async function transferActiveToDiningTable(input: {
  pinActor: PinActorState;
  activeTable: ActiveTableState;
  target: floorApi.DiningTableStatusDto;
}): Promise<{ ticketId: number }> {
  const { pinActor, activeTable, target } = input;
  if (target.open_ticket_id != null && tableHasActiveOrder(target)) {
    throw new Error('Choisissez une table libre pour un transfert');
  }
  await syncTicketItemsToServer(activeTable.ticketId, pinActor.token);
  const { ticket } = await floorApi.transferTicket(
    activeTable.ticketId,
    target.id,
    pinActor.token
  );
  return { ticketId: ticket.id };
}

export async function mergeActiveIntoDiningTable(input: {
  pinActor: PinActorState;
  activeTable: ActiveTableState;
  target: floorApi.DiningTableStatusDto;
  bindTable: (table: ActiveTableState, items: OrderItem[]) => void;
}): Promise<void> {
  const { pinActor, activeTable, target, bindTable } = input;
  if (!target.open_ticket_id) throw new Error('Fusion impossible');
  if (target.open_ticket_id === activeTable.ticketId) {
    throw new Error('Choisissez une autre table');
  }
  await syncTicketItemsToServer(activeTable.ticketId, pinActor.token);
  const { target: merged } = await floorApi.mergeTickets(
    activeTable.ticketId,
    target.open_ticket_id,
    pinActor.token
  );
  const { items, served_by_display_name } = await floorApi.getTicket(merged.id);
  bindTable(
    buildActiveTableState(
      target,
      merged.id,
      merged.last_served_by_user_id,
      served_by_display_name ?? null,
      pinActor
    ),
    floorApi.mapTicketItemsToOrderItems(items)
  );
}
