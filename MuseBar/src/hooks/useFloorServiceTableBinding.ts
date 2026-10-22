import { useCallback, type MutableRefObject } from 'react';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import type { ActiveTableState } from '../contexts/PinSessionsContext';
import { buildActiveTableState } from './floorActiveTable';
import type { FloorServiceContext, FloorServiceDialogControls } from './floorServiceContext';
import type { AssignCartResult } from './useFloorServiceAssign';

/** Bind / unbind the Caisse session to a table (open, load, leave open, abandon, close). */
export function useFloorServiceTableBinding(
  ctx: FloorServiceContext,
  dialogs: Pick<
    FloorServiceDialogControls,
    'openPinDialog' | 'setMapDialogOpen' | 'pendingAfterPin' | 'pendingMapAction'
  >,
  assignCartToTable: (table: floorApi.DiningTableStatusDto) => Promise<AssignCartResult>,
  validateTableOrderRef: MutableRefObject<
    (order: OrderItem[], ticketIdOverride?: number) => Promise<void>
  >
) {
  const {
    pinActor,
    activeTable,
    setCurrentOrder,
    updateActiveSession,
    onError,
    onInfo,
    skipNextSync,
    ensureTableIntervention,
  } = ctx;
  const { openPinDialog, setMapDialogOpen, pendingAfterPin, pendingMapAction } = dialogs;

  const bindTable = useCallback(
    (table: ActiveTableState, items: OrderItem[]) => {
      skipNextSync.current = true;
      updateActiveSession({ activeTable: table, cart: items });
      setCurrentOrder(items);
      setMapDialogOpen(false);
      onInfo(`Table ${table.label}`);
    },
    [setCurrentOrder, onInfo, updateActiveSession, skipNextSync, setMapDialogOpen]
  );

  const clearTableBinding = useCallback(() => {
    updateActiveSession({ activeTable: null });
  }, [updateActiveSession]);

  const detachTableKeepTicket = useCallback(async () => {
    if (activeTable && pinActor) {
      try {
        await ensureTableIntervention();
        await floorApi.discardDraftTicketItems(activeTable.ticketId, pinActor.token);
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Impossible de quitter la table');
        return;
      }
    }
    skipNextSync.current = true;
    updateActiveSession({ activeTable: null, cart: [] });
    setCurrentOrder([]);
    onInfo('Mode comptoir');
  }, [
    activeTable,
    pinActor,
    setCurrentOrder,
    onError,
    onInfo,
    updateActiveSession,
    ensureTableIntervention,
    skipNextSync,
  ]);

  const runPendingMapAction = useCallback(
    async (table: floorApi.DiningTableStatusDto): Promise<boolean> => {
      if (!pendingMapAction.current) return false;
      pendingMapAction.current = null;
      const result = await assignCartToTable(table);
      if (result) {
        await validateTableOrderRef.current(result.items, result.ticketId);
      }
      return true;
    },
    [assignCartToTable, pendingMapAction, validateTableOrderRef]
  );

  const selectFreeTable = useCallback(
    async (table: floorApi.DiningTableStatusDto) => {
      if (!pinActor) {
        pendingAfterPin.current = 'map';
        openPinDialog('verify');
        return;
      }
      if (await runPendingMapAction(table)) return;
      try {
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
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Impossible d’ouvrir la table');
      }
    },
    [pinActor, openPinDialog, bindTable, onError, runPendingMapAction, pendingAfterPin]
  );

  const selectOccupiedTable = useCallback(
    async (table: floorApi.DiningTableStatusDto) => {
      if (!table.open_ticket_id) return;
      if (!pinActor) {
        pendingAfterPin.current = 'map';
        openPinDialog('verify');
        return;
      }
      if (await runPendingMapAction(table)) return;
      try {
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
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Impossible de charger la table');
      }
    },
    [pinActor, openPinDialog, bindTable, onError, runPendingMapAction, pendingAfterPin]
  );

  const abandonActiveOrTable = useCallback(
    async (ticketId: number) => {
      if (!pinActor) {
        onError('Badge requis');
        return;
      }
      try {
        await ensureTableIntervention();
        await floorApi.abandonTicket(ticketId, pinActor.token);
        if (activeTable?.ticketId === ticketId) {
          skipNextSync.current = true;
          updateActiveSession({ activeTable: null, cart: [] });
          setCurrentOrder([]);
        }
        onInfo('Addition abandonnée');
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Abandon impossible');
      }
    },
    [
      pinActor,
      activeTable,
      setCurrentOrder,
      onError,
      onInfo,
      updateActiveSession,
      ensureTableIntervention,
      skipNextSync,
    ]
  );

  const closeActiveTicketAfterOrder = useCallback(
    async (orderId: number | string | undefined) => {
      if (!activeTable || !pinActor) return;
      const parsed =
        typeof orderId === 'number'
          ? orderId
          : typeof orderId === 'string'
            ? parseInt(orderId, 10)
            : NaN;
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      try {
        await ensureTableIntervention();
        await floorApi.closeTicket(activeTable.ticketId, parsed, pinActor.token);
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Table non clôturée côté serveur');
      } finally {
        updateActiveSession({ activeTable: null });
      }
    },
    [activeTable, pinActor, onError, updateActiveSession, ensureTableIntervention]
  );

  return {
    bindTable,
    clearTableBinding,
    detachTableKeepTicket,
    selectFreeTable,
    selectOccupiedTable,
    abandonActiveOrTable,
    closeActiveTicketAfterOrder,
  };
}
