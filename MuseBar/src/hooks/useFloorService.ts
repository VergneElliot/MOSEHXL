import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';

const PIN_STORAGE_KEY = 'mosehxl.pinActor';

export interface PinActorState {
  token: string;
  userId: number;
  displayName: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface ActiveTableState {
  id: number;
  label: string;
  floorPlanId: number;
  ticketId: number;
}

function readStoredPin(): PinActorState | null {
  try {
    const raw = sessionStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PinActorState;
    if (!parsed?.token || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredPin(actor: PinActorState | null): void {
  try {
    if (!actor) sessionStorage.removeItem(PIN_STORAGE_KEY);
    else sessionStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(actor));
  } catch {
    // ignore quota / private mode
  }
}

export function useFloorService(options: {
  currentOrder: OrderItem[];
  setCurrentOrder: (items: OrderItem[]) => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}) {
  const { currentOrder, setCurrentOrder, onError, onInfo } = options;

  const [pinActor, setPinActor] = useState<PinActorState | null>(() => readStoredPin());
  const [activeTable, setActiveTable] = useState<ActiveTableState | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [pinDialogMode, setPinDialogMode] = useState<'verify' | 'set'>('verify');
  const pendingAfterPin = useRef<'map' | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSync = useRef(false);

  const clearPin = useCallback(() => {
    setPinActor(null);
    writeStoredPin(null);
  }, []);

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
      setPinActor(actor);
      writeStoredPin(actor);
      setPinDialogOpen(false);
      onInfo(`Badge : ${actor.displayName}`);
      if (pendingAfterPin.current === 'map') {
        pendingAfterPin.current = null;
        setMapDialogOpen(true);
      }
    },
    [onInfo]
  );

  const setMyPin = useCallback(
    async (pin: string) => {
      await floorApi.setPin(pin);
      onInfo('PIN enregistré — vous pouvez vous badger');
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
      setActiveTable(table);
      setCurrentOrder(items);
      setMapDialogOpen(false);
      onInfo(`Table ${table.label}`);
    },
    [setCurrentOrder, onInfo]
  );

  const clearTableBinding = useCallback(() => {
    setActiveTable(null);
  }, []);

  const detachTableKeepTicket = useCallback(() => {
    skipNextSync.current = true;
    setActiveTable(null);
    setCurrentOrder([]);
    onInfo('Table laissée ouverte');
  }, [setCurrentOrder, onInfo]);

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
          setActiveTable(null);
          setCurrentOrder([]);
        }
        onInfo('Addition abandonnée');
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Abandon impossible');
      }
    },
    [pinActor, activeTable, setCurrentOrder, onError, onInfo]
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
        setActiveTable(null);
      }
    },
    [activeTable, pinActor, onError]
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
  };
}
