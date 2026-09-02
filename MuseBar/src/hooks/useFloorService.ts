import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import {
  isFullCartSelection,
  resolveTargetOrderItems,
  ticketLineIdsFromItems,
} from '../utils/posCartSelection';
import {
  usePinSessions,
  type ActiveTableState,
  type PinActorState,
} from '../contexts/PinSessionsContext';

export type { ActiveTableState, PinActorState };

export type FloorMapPendingAction = 'validate' | 'assign' | null;

function withTableDraftStatus(items: OrderItem[]): OrderItem[] {
  return items.map((line) =>
    line.isTip ? line : { ...line, tableLineStatus: line.tableLineStatus ?? ('draft' as const) }
  );
}

function buildActiveTableState(
  table: floorApi.DiningTableStatusDto,
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

export function useFloorService(options: {
  currentOrder: OrderItem[];
  setCurrentOrder: (items: OrderItem[]) => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
  getCartSelectedIds?: () => Set<string>;
}) {
  const { currentOrder, setCurrentOrder, onError, onInfo, getCartSelectedIds } = options;
  const {
    activeSession,
    addOrFocusSession,
    dismissActiveSession,
    updateActiveSession,
  } = usePinSessions();

  const getSelectedIds = useCallback(
    () => getCartSelectedIds?.() ?? new Set<string>(),
    [getCartSelectedIds]
  );

  const getActionItems = useCallback(
    (order: OrderItem[] = currentOrder) => resolveTargetOrderItems(order, getSelectedIds()),
    [currentOrder, getSelectedIds]
  );

  const pinActor = activeSession?.actor ?? null;
  const activeTable = activeSession?.activeTable ?? null;

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapPurpose, setMapPurpose] = useState<'default' | 'validate' | 'assign' | 'move-table'>('default');
  const [pinDialogMode, setPinDialogMode] = useState<'verify' | 'set'>('verify');
  const pendingAfterPin = useRef<'map' | null>(null);
  const pendingMapAction = useRef<FloorMapPendingAction>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSync = useRef(false);
  const validateTableOrderRef = useRef<
    (order: OrderItem[], ticketIdOverride?: number) => Promise<void>
  >(async () => {});

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
    setMapPurpose('default');
    setMapDialogOpen(true);
  }, [pinActor, openPinDialog]);

  const openMapForAction = useCallback(
    (action: Exclude<FloorMapPendingAction, null>) => {
      pendingMapAction.current = action;
      setMapPurpose(action);
      if (!pinActor) {
        pendingAfterPin.current = 'map';
        openPinDialog('verify');
        return;
      }
      setMapDialogOpen(true);
    },
    [pinActor, openPinDialog]
  );

  const openMapForMoveTable = useCallback(() => {
    setMapPurpose('move-table');
    if (!pinActor) {
      pendingAfterPin.current = 'map';
      openPinDialog('verify');
      return;
    }
    setMapDialogOpen(true);
  }, [pinActor, openPinDialog]);

  const closeMapDialog = useCallback(() => {
    pendingMapAction.current = null;
    setMapPurpose('default');
    setMapDialogOpen(false);
  }, []);

  const applyTicketItemsToCart = useCallback(
    (items: floorApi.OpenTicketItemDto[]) => {
      const tips = currentOrder.filter((line) => line.isTip);
      skipNextSync.current = true;
      const mapped = floorApi.mapTicketItemsToOrderItems(items);
      setCurrentOrder([...mapped, ...tips]);
      updateActiveSession({ cart: [...mapped, ...tips] });
    },
    [currentOrder, setCurrentOrder, updateActiveSession]
  );

  const assignCartToTable = useCallback(
    async (
      table: floorApi.DiningTableStatusDto
    ): Promise<{ items: OrderItem[]; ticketId: number } | null> => {
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
    ]
  );

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

  const detachTableKeepTicket = useCallback(async () => {
    if (activeTable && pinActor) {
      try {
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
  }, [activeTable, pinActor, setCurrentOrder, onError, onInfo, updateActiveSession]);

  const selectFreeTable = useCallback(
    async (table: floorApi.DiningTableStatusDto) => {
      if (!pinActor) {
        pendingAfterPin.current = 'map';
        openPinDialog('verify');
        return;
      }
      if (pendingMapAction.current) {
        pendingMapAction.current = null;
        const result = await assignCartToTable(table);
        if (result) {
          await validateTableOrderRef.current(result.items, result.ticketId);
        }
        return;
      }
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
    [pinActor, openPinDialog, bindTable, onError, assignCartToTable]
  );

  const selectOccupiedTable = useCallback(
    async (table: floorApi.DiningTableStatusDto) => {
      if (!table.open_ticket_id) return;
      if (!pinActor) {
        pendingAfterPin.current = 'map';
        openPinDialog('verify');
        return;
      }
      if (pendingMapAction.current) {
        pendingMapAction.current = null;
        const result = await assignCartToTable(table);
        if (result) {
          await validateTableOrderRef.current(result.items, result.ticketId);
        }
        return;
      }
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
    [pinActor, openPinDialog, bindTable, onError, assignCartToTable]
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
    [activeTable, pinActor, currentOrder, onError, onInfo, updateActiveSession]
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
      if (!activeTable || !pinActor) {
        onError('Table active requise pour déplacer des articles');
        return;
      }
      const sale = getActionItems();
      if (sale.length === 0) {
        onError('Aucun article à déplacer');
        return;
      }
      const fullMove = isFullCartSelection(currentOrder, getSelectedIds());
      try {
        const { items: saved } = await floorApi.replaceTicketItems(
          activeTable.ticketId,
          currentOrder,
          pinActor.token
        );
        const synced = floorApi.mapTicketItemsToOrderItems(saved);
        const tips = currentOrder.filter((line) => line.isTip);
        const syncedOrder = [...synced, ...tips];
        const targets = resolveTargetOrderItems(syncedOrder, getSelectedIds());
        const lineIds = ticketLineIdsFromItems(targets);

        if (!fullMove && lineIds.length > 0) {
          const result = await floorApi.moveTicketLines(
            activeTable.ticketId,
            table.id,
            lineIds,
            pinActor.token
          );
          applyTicketItemsToCart(result.source_items);
          setMapPurpose('default');
          setMapDialogOpen(false);
          onInfo(
            `${lineIds.length} article(s) déplacé(s) vers la table ${
              result.target_table_label ?? table.label
            }`
          );
          return;
        }

        if (table.open_ticket_id && table.open_ticket_id !== activeTable.ticketId) {
          await mergeActiveIntoTable(table);
          return;
        }
        if (!table.open_ticket_id) {
          await transferActiveToTable(table.id, table.label, table.floor_plan_id);
          return;
        }
        onError('Choisissez une autre table');
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Déplacement impossible');
      }
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
    ]
  );

  const takeoverActive = useCallback(async () => {
    if (!activeTable || !pinActor) {
      onError('Badge et table active requis');
      return;
    }
    try {
      const { served_by_display_name } = await floorApi.takeoverTicket(
        activeTable.ticketId,
        pinActor.token
      );
      updateActiveSession({
        activeTable: {
          ...activeTable,
          assignedWaiterUserId: pinActor.userId,
          assignedWaiterDisplayName: served_by_display_name ?? pinActor.displayName,
        },
      });
      onInfo(`Prise en charge : ${pinActor.displayName}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      onError(err.message || 'Prise en charge impossible');
    }
  }, [activeTable, pinActor, onError, onInfo, updateActiveSession]);

  const assignTicketWaiter = useCallback(
    async (userId: number, displayName: string) => {
      if (!pinActor) {
        openPinDialog('verify');
        onError('Badge requis');
        return;
      }
      if (!activeTable) {
        onError('Table active requise pour assigner un serveur');
        return;
      }
      try {
        const { served_by_display_name } = await floorApi.assignTicketWaiter(
          activeTable.ticketId,
          userId,
          pinActor.token
        );
        updateActiveSession({
          activeTable: {
            ...activeTable,
            assignedWaiterUserId: userId,
            assignedWaiterDisplayName: served_by_display_name ?? displayName,
          },
        });
        onInfo(`Serveur assigné : ${served_by_display_name ?? displayName}`);
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Assignation serveur impossible');
      }
    },
    [pinActor, activeTable, openPinDialog, onError, onInfo, updateActiveSession]
  );

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
          const actionItems = getActionItems(order);
          const { items } = await floorApi.replaceTicketItems(
            activeTable.ticketId,
            order,
            pinActor.token
          );
          applyTicketItemsToCart(items);
          const synced = floorApi.mapTicketItemsToOrderItems(items);
          const suivreIds = ticketLineIdsFromItems(
            resolveTargetOrderItems(synced, getSelectedIds())
          );
          const result = await floorApi.printSuivreForTicket(
            activeTable.ticketId,
            pinActor.token,
            suivreIds.length > 0 ? suivreIds : undefined
          );
          onInfo(
            result.enqueued > 0
              ? `À suivre envoyé (${result.enqueued})`
              : 'Aucun ticket cuisine (imprimantes ?)'
          );
          return;
        }
        const sale = getActionItems(order);
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
    [pinActor, activeTable, openPinDialog, onError, onInfo, applyTicketItemsToCart, getActionItems, getSelectedIds]
  );

  const validateTableOrder = useCallback(
    async (order: OrderItem[], ticketIdOverride?: number) => {
      if (!pinActor) {
        openPinDialog('verify');
        onError('Badge requis pour valider la commande table');
        return;
      }
      const ticketId = ticketIdOverride ?? activeTable?.ticketId;
      if (ticketId == null) {
        onError('Table active requise');
        return;
      }
      const targets = getActionItems(order);
      const pending = targets.filter(
        (line) => !line.isTip && line.tableLineStatus !== 'validated'
      );
      if (pending.length === 0) {
        onError('Aucun article en attente de validation');
        return;
      }
      try {
        const { items: saved } = await floorApi.replaceTicketItems(
          ticketId,
          order,
          pinActor.token
        );
        const synced = floorApi.mapTicketItemsToOrderItems(saved);
        const draftLineIds = ticketLineIdsFromItems(
          resolveTargetOrderItems(synced, getSelectedIds()).filter(
            (line) => line.tableLineStatus !== 'validated'
          )
        );
        const result = await floorApi.validateTicket(
          ticketId,
          pinActor.token,
          draftLineIds.length > 0 ? draftLineIds : undefined
        );
        applyTicketItemsToCart(result.items);
        onInfo(
          result.print.enqueued > 0
            ? `Commande table validée — ${result.print.enqueued} ticket(s) cuisine`
            : 'Commande table validée (aucun ticket cuisine)'
        );
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Validation commande table échouée');
      }
    },
    [pinActor, activeTable, openPinDialog, onError, onInfo, applyTicketItemsToCart, getActionItems, getSelectedIds]
  );

  validateTableOrderRef.current = validateTableOrder;

  const cancelValidatedTicketLine = useCallback(
    async (ticketLineId: number) => {
      if (!pinActor) {
        onError('Badge requis');
        return;
      }
      if (!activeTable) {
        onError('Table active requise');
        return;
      }
      try {
        const result = await floorApi.cancelTicketLines(
          activeTable.ticketId,
          [ticketLineId],
          pinActor.token
        );
        applyTicketItemsToCart(result.items);
        onInfo(
          result.print.enqueued > 0
            ? `Retour envoyé — ${result.print.enqueued} ticket(s) cuisine`
            : 'Article retiré de la commande'
        );
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Retour impossible');
      }
    },
    [pinActor, activeTable, onError, onInfo, applyTicketItemsToCart]
  );

  // Debounced cart → ticket sync
  useEffect(() => {
    if (!activeTable || !pinActor) {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
        syncTimer.current = null;
      }
      return;
    }
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void floorApi
        .replaceTicketItems(activeTable.ticketId, currentOrder, pinActor.token)
        .then(({ items }) => {
          applyTicketItemsToCart(items);
        })
        .catch((error: unknown) => {
          const err = error as { message?: string };
          onError(err.message || 'Synchronisation table échouée');
        });
    }, 450);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [currentOrder, activeTable, pinActor, onError, applyTicketItemsToCart]);

  return {
    pinActor,
    activeTable,
    pinDialogOpen,
    pinDialogMode,
    mapDialogOpen,
    mapPurpose,
    setPinDialogOpen,
    setMapDialogOpen: closeMapDialog,
    setPinDialogMode,
    clearPin,
    badgeIn,
    setMyPin,
    openPinDialog,
    requestMap,
    openMapForAction,
    openMapForMoveTable,
    selectFreeTable,
    selectOccupiedTable,
    abandonActiveOrTable,
    closeActiveTicketAfterOrder,
    detachTableKeepTicket,
    clearTableBinding,
    transferActiveToTable,
    mergeActiveIntoTable,
    moveToTable,
    takeoverActive,
    printSuivre,
    validateTableOrder,
    assignTicketWaiter,
    cancelValidatedTicketLine,
  };
}
