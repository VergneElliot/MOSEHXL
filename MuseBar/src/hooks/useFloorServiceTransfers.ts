import { useCallback } from 'react';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import type { ActiveTableState } from '../contexts/PinSessionsContext';
import { buildActiveTableState } from './floorActiveTable';
import { runFloorMoveToTable } from './floorMoveToTable';
import type { FloorServiceContext, FloorServiceDialogControls } from './floorServiceContext';

/** Move the active ticket (or selected lines) to another table: transfer, merge, move lines. */
export function useFloorServiceTransfers(
  ctx: FloorServiceContext,
  dialogs: Pick<FloorServiceDialogControls, 'setMapDialogOpen' | 'setMapPurpose'>,
  bindTable: (table: ActiveTableState, items: OrderItem[]) => void
) {
  const {
    pinActor,
    activeTable,
    currentOrder,
    updateActiveSession,
    onError,
    onInfo,
    getActionItems,
    getSelectedIds,
    applyTicketItemsToCart,
  } = ctx;
  const { setMapDialogOpen, setMapPurpose } = dialogs;

  const transferActiveToTable = useCallback(
    async (diningTableId: number, label: string, floorPlanId: number) => {
      if (!activeTable || !pinActor) {
        onError('Badge et table active requis');
        return;
      }
      try {
        await floorApi.replaceTicketItems(activeTable.ticketId, currentOrder, pinActor.token);
        const { ticket } = await floorApi.transferTicket(
          activeTable.ticketId,
          diningTableId,
          pinActor.token
        );
        updateActiveSession({
          activeTable: {
            ...activeTable,
            id: diningTableId,
            label,
            floorPlanId,
            ticketId: ticket.id,
          },
        });
        onInfo(`Transféré vers table ${label}`);
        setMapPurpose('default');
        setMapDialogOpen(false);
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Transfert impossible');
      }
    },
    [
      activeTable,
      pinActor,
      currentOrder,
      onError,
      onInfo,
      updateActiveSession,
      setMapPurpose,
      setMapDialogOpen,
    ]
  );

  const mergeActiveIntoTable = useCallback(
    async (target: floorApi.DiningTableStatusDto) => {
      if (!activeTable || !pinActor || !target.open_ticket_id) {
        onError('Fusion impossible');
        return;
      }
      if (target.open_ticket_id === activeTable.ticketId) {
        onError('Choisissez une autre table');
        return;
      }
      try {
        await floorApi.replaceTicketItems(activeTable.ticketId, currentOrder, pinActor.token);
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
        onInfo(`Fusionné sur table ${target.label}`);
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Fusion impossible');
      }
    },
    [activeTable, pinActor, currentOrder, bindTable, onError, onInfo]
  );

  const moveToTable = useCallback(
    async (table: floorApi.DiningTableStatusDto) => {
      await runFloorMoveToTable({
        table,
        activeTable,
        pinActor,
        currentOrder,
        getActionItems,
        getSelectedIds,
        applyTicketItemsToCart,
        setMapPurpose,
        setMapDialogOpen,
        mergeActiveIntoTable,
        transferActiveToTable,
        onError,
        onInfo,
      });
    },
    [
      activeTable,
      pinActor,
      currentOrder,
      getActionItems,
      getSelectedIds,
      onError,
      onInfo,
      applyTicketItemsToCart,
      mergeActiveIntoTable,
      transferActiveToTable,
      setMapPurpose,
      setMapDialogOpen,
    ]
  );

  return { transferActiveToTable, mergeActiveIntoTable, moveToTable };
}
