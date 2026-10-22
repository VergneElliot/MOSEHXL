import { useCallback } from 'react';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import { isFullCartSelection } from '../utils/posCartSelection';
import { buildActiveTableState, withTableDraftStatus } from './floorActiveTable';
import type { FloorServiceContext, FloorServiceDialogControls } from './floorServiceContext';

export type AssignCartResult = { items: OrderItem[]; ticketId: number } | null;

/**
 * Assign the Caisse cart (or the selected lines) to a table.
 * Partial selection from comptoir pushes lines without binding the session to the table.
 */
export function useFloorServiceAssign(
  ctx: FloorServiceContext,
  dialogs: Pick<FloorServiceDialogControls, 'openPinDialog' | 'setMapDialogOpen' | 'pendingAfterPin'>
) {
  const {
    pinActor,
    activeTable,
    currentOrder,
    setCurrentOrder,
    updateActiveSession,
    onError,
    onInfo,
    skipNextSync,
    getActionItems,
    getSelectedIds,
    applyTicketItemsToCart,
  } = ctx;
  const { openPinDialog, setMapDialogOpen, pendingAfterPin } = dialogs;

  return useCallback(
    async (table: floorApi.DiningTableStatusDto): Promise<AssignCartResult> => {
      if (!pinActor) {
        pendingAfterPin.current = 'map';
        openPinDialog('verify');
        return null;
      }
      const tips = currentOrder.filter((line) => line.isTip);
      const sale = getActionItems();
      if (sale.length === 0) {
        onError('Aucun article à assigner');
        return null;
      }
      const partialFromComptoir =
        !activeTable && !isFullCartSelection(currentOrder, getSelectedIds());

      try {
        if (partialFromComptoir) {
          let ticketId = table.open_ticket_id;
          if (!ticketId) {
            const { ticket } = await floorApi.openTicket(table.id, pinActor.token);
            ticketId = ticket.id;
          }
          const { items } = await floorApi.getTicket(ticketId);
          const existing = floorApi.mapTicketItemsToOrderItems(items);
          const merged = [...existing, ...withTableDraftStatus(sale)];
          const { items: saved } = await floorApi.replaceTicketItems(
            ticketId,
            merged,
            pinActor.token
          );
          void saved;
          const remaining = currentOrder.filter(
            (line) => line.isTip || !sale.some((s) => s.id === line.id)
          );
          skipNextSync.current = true;
          setCurrentOrder(remaining);
          updateActiveSession({ cart: remaining });
          setMapDialogOpen(false);
          onInfo(`${sale.length} article(s) assigné(s) à la table ${table.label}`);
          return { items: sale, ticketId };
        }

        const draftCart = withTableDraftStatus([...sale, ...tips]);
        if (table.open_ticket_id) {
          const { items, served_by_display_name } = await floorApi.getTicket(table.open_ticket_id);
          const existing = floorApi.mapTicketItemsToOrderItems(items);
          const merged = [...existing, ...withTableDraftStatus(sale), ...tips];
          const tableState = buildActiveTableState(
            table,
            table.open_ticket_id,
            table.last_served_by_user_id,
            served_by_display_name ?? null,
            pinActor
          );
          skipNextSync.current = true;
          updateActiveSession({ activeTable: tableState, cart: merged });
          setCurrentOrder(merged);
          const { items: saved } = await floorApi.replaceTicketItems(
            table.open_ticket_id,
            merged,
            pinActor.token
          );
          applyTicketItemsToCart(saved);
          setMapDialogOpen(false);
          onInfo(`Commande assignée à la table ${table.label}`);
          return {
            items: [...floorApi.mapTicketItemsToOrderItems(saved), ...tips],
            ticketId: table.open_ticket_id,
          };
        }

        const { ticket } = await floorApi.openTicket(table.id, pinActor.token);
        const tableState = buildActiveTableState(
          table,
          ticket.id,
          ticket.last_served_by_user_id ?? pinActor.userId,
          pinActor.displayName,
          pinActor
        );
        skipNextSync.current = true;
        updateActiveSession({ activeTable: tableState, cart: draftCart });
        setCurrentOrder(draftCart);
        const { items: saved } = await floorApi.replaceTicketItems(
          ticket.id,
          draftCart,
          pinActor.token
        );
        applyTicketItemsToCart(saved);
        setMapDialogOpen(false);
        onInfo(`Commande assignée à la table ${table.label}`);
        return {
          items: [...floorApi.mapTicketItemsToOrderItems(saved), ...tips],
          ticketId: ticket.id,
        };
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Impossible d’assigner la commande à la table');
        return null;
      }
    },
    [
      pinActor,
      currentOrder,
      activeTable,
      openPinDialog,
      onError,
      onInfo,
      setCurrentOrder,
      updateActiveSession,
      applyTicketItemsToCart,
      getActionItems,
      getSelectedIds,
      skipNextSync,
      setMapDialogOpen,
      pendingAfterPin,
    ]
  );
}
