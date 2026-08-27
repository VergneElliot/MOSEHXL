import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import {
  usePinSessions,
  type ActiveTableState,
  type PinActorState,
} from '../contexts/PinSessionsContext';

export type { ActiveTableState, PinActorState };

export function useFloorService(options: {
  currentOrder: OrderItem[];
  setCurrentOrder: (items: OrderItem[]) => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}) {
  const { currentOrder, setCurrentOrder, onError, onInfo } = options;
  const {
    activeSession,
    addOrFocusSession,
    dismissActiveSession,
    updateActiveSession,
  } = usePinSessions();

  const pinActor = activeSession?.actor ?? null;
  const activeTable = activeSession?.activeTable ?? null;

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [pinDialogMode, setPinDialogMode] = useState<'verify' | 'set'>('verify');
  const pendingAfterPin = useRef<'map' | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSync = useRef(false);

  const clearPin = useCallback(() => {
    dismissActiveSession();
  }, [dismissActiveSession]);

  const badgeIn = useCallback(
    async (pin: string) => {
      const result = await floorApi.verifyPin(pin);
      const actor: PinActorState = {
        token: result.pin_actor_token,
        userId: result.user_id,
        displayName: result.display_name,
        email: result.email,
        role: result.role,
        permissions: result.permissions,
      };
      addOrFocusSession(actor);
      setPinDialogOpen(false);
      onInfo(`Session : ${actor.displayName}`);
      if (pendingAfterPin.current === 'map') {
        pendingAfterPin.current = null;
        setMapDialogOpen(true);
      }
    },
    [addOrFocusSession, onInfo]
  );

  const setMyPin = useCallback(
    async (pin: string) => {
      await floorApi.setPin(pin);
      onInfo('PIN enregistré — vous pouvez ouvrir une session');
      setPinDialogMode('verify');
    },
    [onInfo]
  );

  const openPinDialog = useCallback((mode: 'verify' | 'set' = 'verify') => {
    setPinDialogMode(mode);
    setPinDialogOpen(true);
  }, []);

  const requestMap = useCallback(() => {
    if (!pinActor) {
      pendingAfterPin.current = 'map';
      openPinDialog('verify');
      return;
    }
    setMapDialogOpen(true);
  }, [pinActor, openPinDialog]);

  const bindTable = useCallback(
    (table: ActiveTableState, items: OrderItem[]) => {
      skipNextSync.current = true;
      updateActiveSession({ activeTable: table, cart: items });
      setCurrentOrder(items);
      setMapDialogOpen(false);
      onInfo(`Table ${table.label}`);
    },
    [setCurrentOrder, onInfo, updateActiveSession]
  );

  const clearTableBinding = useCallback(() => {
    updateActiveSession({ activeTable: null });
  }, [updateActiveSession]);

  const detachTableKeepTicket = useCallback(() => {
    skipNextSync.current = true;
    updateActiveSession({ activeTable: null, cart: [] });
    setCurrentOrder([]);
    onInfo('Table laissée ouverte');
  }, [setCurrentOrder, onInfo, updateActiveSession]);

  const selectFreeTable = useCallback(
    async (table: floorApi.DiningTableStatusDto) => {
      if (!pinActor) {
        pendingAfterPin.current = 'map';
        openPinDialog('verify');
        return;
      }
      try {
        const { ticket } = await floorApi.openTicket(table.id, pinActor.token);
        bindTable(
          {
            id: table.id,
            label: table.label,
            floorPlanId: table.floor_plan_id,
            ticketId: ticket.id,
          },
          []
        );
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Impossible d’ouvrir la table');
      }
    },
    [pinActor, openPinDialog, bindTable, onError]
  );

  const selectOccupiedTable = useCallback(
    async (table: floorApi.DiningTableStatusDto) => {
      if (!table.open_ticket_id) return;
      if (!pinActor) {
        pendingAfterPin.current = 'map';
        openPinDialog('verify');
        return;
      }
      try {
        const { ticket, items } = await floorApi.getTicket(table.open_ticket_id);
        bindTable(
          {
            id: table.id,
            label: table.label,
            floorPlanId: table.floor_plan_id,
            ticketId: ticket.id,
          },
          floorApi.mapTicketItemsToOrderItems(items)
        );
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Impossible de charger la table');
      }
    },
    [pinActor, openPinDialog, bindTable, onError]
  );

  const abandonActiveOrTable = useCallback(
    async (ticketId: number) => {
      if (!pinActor) {
        onError('Badge requis');
        return;
      }
      try {
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
    [pinActor, activeTable, setCurrentOrder, onError, onInfo, updateActiveSession]
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
        await floorApi.closeTicket(activeTable.ticketId, parsed, pinActor.token);
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Table non clôturée côté serveur');
      } finally {
        updateActiveSession({ activeTable: null });
      }
    },
    [activeTable, pinActor, onError, updateActiveSession]
  );

  const transferActiveToTable = useCallback(
    async (diningTableId: number, label: string, floorPlanId: number) => {
      if (!activeTable || !pinActor) {
        onError('Badge et table active requis');
        return;
      }
      try {
        const { ticket } = await floorApi.transferTicket(
          activeTable.ticketId,
          diningTableId,
          pinActor.token
        );
        updateActiveSession({
          activeTable: {
            id: diningTableId,
            label,
            floorPlanId,
            ticketId: ticket.id,
          },
        });
        onInfo(`Transféré vers table ${label}`);
        setMapDialogOpen(false);
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Transfert impossible');
      }
    },
    [activeTable, pinActor, onError, onInfo, updateActiveSession]
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
        const { target: merged } = await floorApi.mergeTickets(
          activeTable.ticketId,
          target.open_ticket_id,
          pinActor.token
        );
        const { items } = await floorApi.getTicket(merged.id);
        bindTable(
          {
            id: target.id,
            label: target.label,
            floorPlanId: target.floor_plan_id,
            ticketId: merged.id,
          },
          floorApi.mapTicketItemsToOrderItems(items)
        );
        onInfo(`Fusionné sur table ${target.label}`);
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Fusion impossible');
      }
    },
    [activeTable, pinActor, bindTable, onError, onInfo]
  );

  const takeoverActive = useCallback(async () => {
    if (!activeTable || !pinActor) {
      onError('Badge et table active requis');
      return;
    }
    try {
      await floorApi.takeoverTicket(activeTable.ticketId, pinActor.token);
      onInfo(`Prise en charge : ${pinActor.displayName}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      onError(err.message || 'Prise en charge impossible');
    }
  }, [activeTable, pinActor, onError, onInfo]);

  const printSuivre = useCallback(
    async (order: OrderItem[]) => {
      if (!pinActor) {
        pendingAfterPin.current = null;
        openPinDialog('verify');
        onError('Badge requis pour À suivre');
        return;
      }
      try {
        if (activeTable) {
          // Sync cart first so kitchen sees latest lines
          await floorApi.replaceTicketItems(activeTable.ticketId, order, pinActor.token);
          const result = await floorApi.printSuivreForTicket(activeTable.ticketId, pinActor.token);
          onInfo(
            result.enqueued > 0
              ? `À suivre envoyé (${result.enqueued})`
              : 'Aucun ticket cuisine (imprimantes ?)'
          );
          return;
        }
        const sale = order.filter((line) => !line.isTip);
        if (sale.length === 0) {
          onError('Aucun article à envoyer');
          return;
        }
        const result = await floorApi.printSuivreFromCart(
          sale.map((line) => ({
            product_id: line.productId ? parseInt(String(line.productId), 10) || null : null,
            product_name: line.productName,
            quantity: line.quantity,
          })),
          pinActor.token,
          null
        );
        onInfo(
          result.enqueued > 0
            ? `À suivre envoyé (${result.enqueued})`
            : 'Aucun ticket cuisine (imprimantes ?)'
        );
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Impression À suivre échouée');
      }
    },
    [pinActor, activeTable, openPinDialog, onError, onInfo]
  );

  // Debounced cart → ticket sync
  useEffect(() => {
    if (!activeTable || !pinActor) return;
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void floorApi
        .replaceTicketItems(activeTable.ticketId, currentOrder, pinActor.token)
        .catch((error: unknown) => {
          const err = error as { message?: string };
          onError(err.message || 'Synchronisation table échouée');
        });
    }, 450);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [currentOrder, activeTable, pinActor, onError]);

  return {
    pinActor,
    activeTable,
    pinDialogOpen,
    pinDialogMode,
    mapDialogOpen,
    setPinDialogOpen,
    setMapDialogOpen,
    setPinDialogMode,
    clearPin,
    badgeIn,
    setMyPin,
    openPinDialog,
    requestMap,
    selectFreeTable,
    selectOccupiedTable,
    abandonActiveOrTable,
    closeActiveTicketAfterOrder,
    detachTableKeepTicket,
    clearTableBinding,
    transferActiveToTable,
    mergeActiveIntoTable,
    takeoverActive,
    printSuivre,
  };
}
