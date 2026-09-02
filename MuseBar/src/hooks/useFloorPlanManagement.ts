import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import {
  usePinSessions,
  type ActiveTableState,
  type PinActorState,
} from '../contexts/PinSessionsContext';

export type FloorPlanMapMode = 'select' | 'transfer' | 'merge';

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

async function syncTicketItemsToServer(
  ticketId: number,
  token: string
): Promise<OrderItem[]> {
  const { items } = await floorApi.getTicket(ticketId);
  const orderItems = floorApi.mapTicketItemsToOrderItems(items);
  await floorApi.replaceTicketItems(ticketId, orderItems, token);
  return orderItems;
}

export function useFloorPlanManagement(options: {
  onInfo: (message: string) => void;
  onError: (message: string) => void;
  onSwitchToPos?: () => void;
}) {
  const { onInfo, onError, onSwitchToPos } = options;
  const { activeSession, addOrFocusSession, updateActiveSession } = usePinSessions();

  const pinActor = activeSession?.actor ?? null;
  const activeTable = activeSession?.activeTable ?? null;
  const activeTicketId = activeTable?.ticketId ?? null;

  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<floorApi.DiningTableStatusDto[]>([]);
  const [plans, setPlans] = useState<floorApi.FloorPlanDto[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [mode, setMode] = useState<FloorPlanMapMode>('select');
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinDialogMode, setPinDialogMode] = useState<'verify' | 'set'>('verify');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [status, planList] = await Promise.all([
        floorApi.getFloorStatus(),
        floorApi.listFloorPlans(),
      ]);
      setTables(status);
      setPlans(planList);
      setSelectedPlanId((prev) => {
        const active = planList.filter((p) => p.is_active);
        if (prev != null && active.some((p) => p.id === prev)) return prev;
        return active[0]?.id ?? planList[0]?.id ?? null;
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      onError(e.message || 'Impossible de charger le plan de salle');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void reload();
    const t = window.setInterval(() => void reload(), 15000);
    return () => window.clearInterval(t);
  }, [reload]);

  const activePlans = useMemo(() => plans.filter((p) => p.is_active), [plans]);
  const planTables = useMemo(
    () => (selectedPlanId != null ? tables.filter((t) => t.floor_plan_id === selectedPlanId) : []),
    [tables, selectedPlanId]
  );

  const requirePin = useCallback(() => {
    setPinDialogMode('verify');
    setPinDialogOpen(true);
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
      addOrFocusSession(actor);
      setPinDialogOpen(false);
      onInfo(`Session : ${actor.displayName}`);
    },
    [addOrFocusSession, onInfo]
  );

  const bindTable = useCallback(
    (table: ActiveTableState, items: OrderItem[]) => {
      updateActiveSession({ activeTable: table, cart: items });
    },
    [updateActiveSession]
  );

  const openTableInSession = useCallback(
    async (table: floorApi.DiningTableStatusDto) => {
      if (!pinActor) {
        requirePin();
        return;
      }
      try {
        if (table.open_ticket_id != null) {
          const { ticket, items, served_by_display_name } = await floorApi.getTicket(
            table.open_ticket_id
          );
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
          onInfo(`Table ${table.label} chargée`);
        } else {
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
          onInfo(`Table ${table.label} ouverte`);
        }
        setMode('select');
        onSwitchToPos?.();
      } catch (err: unknown) {
        const e = err as { message?: string };
        onError(e.message || 'Impossible d’ouvrir la table');
      }
    },
    [pinActor, requirePin, bindTable, onInfo, onError, onSwitchToPos]
  );

  const transferToTable = useCallback(
    async (target: floorApi.DiningTableStatusDto) => {
      if (!pinActor || !activeTable) {
        onError('Sélectionnez d’abord une table source (mode Ouvrir / charger)');
        return;
      }
      if (target.open_ticket_id != null) {
        onError('Choisissez une table libre pour un transfert');
        return;
      }
      try {
        await syncTicketItemsToServer(activeTable.ticketId, pinActor.token);
        const { ticket } = await floorApi.transferTicket(
          activeTable.ticketId,
          target.id,
          pinActor.token
        );
        updateActiveSession({
          activeTable: {
            ...activeTable,
            id: target.id,
            label: target.label,
            floorPlanId: target.floor_plan_id,
            ticketId: ticket.id,
          },
        });
        setMode('select');
        onInfo(`Transféré vers table ${target.label}`);
        void reload();
      } catch (err: unknown) {
        const e = err as { message?: string };
        onError(e.message || 'Transfert impossible');
      }
    },
    [pinActor, activeTable, onError, onInfo, reload, updateActiveSession]
  );

  const mergeIntoTable = useCallback(
    async (target: floorApi.DiningTableStatusDto) => {
      if (!pinActor || !activeTable || !target.open_ticket_id) {
        onError('Fusion impossible');
        return;
      }
      if (target.open_ticket_id === activeTable.ticketId) {
        onError('Choisissez une autre table');
        return;
      }
      try {
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
        setMode('select');
        onInfo(`Fusionné sur table ${target.label}`);
        void reload();
      } catch (err: unknown) {
        const e = err as { message?: string };
        onError(e.message || 'Fusion impossible');
      }
    },
    [pinActor, activeTable, onError, onInfo, reload, bindTable]
  );

  const abandonActiveTicket = useCallback(async () => {
    if (!pinActor || activeTicketId == null) {
      onError('Aucune addition active');
      return;
    }
    try {
      await floorApi.abandonTicket(activeTicketId, pinActor.token);
      updateActiveSession({ activeTable: null, cart: [] });
      onInfo('Addition abandonnée');
      void reload();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onError(e.message || 'Abandon impossible');
    }
  }, [pinActor, activeTicketId, onError, onInfo, reload, updateActiveSession]);

  const detachFromTable = useCallback(async () => {
    if (!pinActor || !activeTable) {
      onError('Aucune table active');
      return;
    }
    try {
      await floorApi.discardDraftTicketItems(activeTable.ticketId, pinActor.token);
      updateActiveSession({ activeTable: null, cart: [] });
      onInfo('Table laissée ouverte — retour mode comptoir');
      void reload();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onError(e.message || 'Impossible de quitter la table');
    }
  }, [pinActor, activeTable, onError, onInfo, reload, updateActiveSession]);

  const takeoverActiveTicket = useCallback(async () => {
    if (!pinActor || !activeTable) {
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
      void reload();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onError(e.message || 'Prise en charge impossible');
    }
  }, [pinActor, activeTable, onError, onInfo, reload, updateActiveSession]);

  const handleTableSelect = useCallback(
    (table: floorApi.DiningTableStatusDto) => {
      const hasOpenTicket = table.open_ticket_id != null;
      const occupied = table.has_validated_items === true;
      if (mode === 'transfer') {
        if (hasOpenTicket) return;
        void transferToTable(table);
        return;
      }
      if (mode === 'merge') {
        if (!occupied || table.open_ticket_id === activeTicketId) return;
        void mergeIntoTable(table);
        return;
      }
      void openTableInSession(table);
    },
    [mode, activeTicketId, transferToTable, mergeIntoTable, openTableInSession]
  );

  return {
    loading,
    tables,
    plans,
    activePlans,
    planTables,
    selectedPlanId,
    setSelectedPlanId,
    mode,
    setMode,
    pinActor,
    activeTable,
    activeTicketId,
    pinDialogOpen,
    pinDialogMode,
    setPinDialogOpen,
    setPinDialogMode,
    requirePin,
    badgeIn,
    reload,
    handleTableSelect,
    abandonActiveTicket,
    detachFromTable,
    takeoverActiveTicket,
  };
}
