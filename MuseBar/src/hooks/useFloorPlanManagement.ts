import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import {
  usePinSessions,
  type ActiveTableState,
  type PinActorState,
} from '../contexts/PinSessionsContext';
import { useTableInterventionGate } from './useTableInterventionGate';
import { abandonFloorTicket } from './floorTicketAbandon';
import { tableHasActiveOrder } from '../components/floor/tableOccupancy';
import { useStepUpAuth } from '../contexts/StepUpAuthContext';
import type { TableDropPrompt } from '../components/floor/TableDropActionDialog';
import {
  buildTableDropPrompt,
  mergeActiveIntoDiningTable,
  openDiningTableInSession,
  primeDiningTableInSession,
  transferActiveToDiningTable,
} from './floorPlanTableOps';
import { useVisibleInterval } from './useVisibleInterval';

export type FloorPlanMapMode = 'select' | 'transfer' | 'merge';

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
  const ensureTableIntervention = useTableInterventionGate(activeTable, pinActor);
  const { ensurePermission } = useStepUpAuth();
  const sessionCart = activeSession?.cart ?? [];

  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<floorApi.DiningTableStatusDto[]>([]);
  const [plans, setPlans] = useState<floorApi.FloorPlanDto[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [mode, setMode] = useState<FloorPlanMapMode>('select');
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinDialogMode, setPinDialogMode] = useState<'verify' | 'set'>('verify');
  const [resumeTable, setResumeTable] = useState<floorApi.DiningTableStatusDto | null>(null);
  const [focusTableId, setFocusTableId] = useState<number | null>(null);
  const [dropPrompt, setDropPrompt] = useState<{
    source: floorApi.DiningTableStatusDto;
    target: floorApi.DiningTableStatusDto;
    prompt: TableDropPrompt;
  } | null>(null);

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
  }, [reload]);
  useVisibleInterval(() => void reload(), 15000);

  const activePlans = useMemo(() => plans.filter((p) => p.is_active), [plans]);
  const planTables = useMemo(
    () => (selectedPlanId != null ? tables.filter((t) => t.floor_plan_id === selectedPlanId) : []),
    [tables, selectedPlanId]
  );
  const focusTable = useMemo(
    () => (focusTableId != null ? planTables.find((t) => t.id === focusTableId) ?? null : null),
    [focusTableId, planTables]
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

  const clearActiveTable = useCallback(() => {
    updateActiveSession({ activeTable: null, cart: [] });
  }, [updateActiveSession]);

  const primeTableInSession = useCallback(
    async (table: floorApi.DiningTableStatusDto): Promise<ActiveTableState | null> => {
      if (!pinActor) {
        requirePin();
        return null;
      }
      try {
        return await primeDiningTableInSession({
          table,
          pinActor,
          bindTable,
          clearActiveTable,
        });
      } catch (err: unknown) {
        const e = err as { message?: string };
        onError(e.message || 'Impossible de sélectionner la table');
        return null;
      }
    },
    [pinActor, requirePin, bindTable, clearActiveTable, onError]
  );

  const openTableInSession = useCallback(
    async (table: floorApi.DiningTableStatusDto) => {
      if (!pinActor) {
        requirePin();
        return;
      }
      try {
        const result = await openDiningTableInSession({ table, pinActor, bindTable });
        onInfo(result === 'loaded' ? `Table ${table.label} chargée` : `Table ${table.label} ouverte`);
        setFocusTableId(table.id);
        setMode('select');
        setResumeTable(null);
        onSwitchToPos?.();
      } catch (err: unknown) {
        const e = err as { message?: string };
        onError(e.message || 'Impossible d’ouvrir la table');
      }
    },
    [pinActor, requirePin, bindTable, onInfo, onError, onSwitchToPos]
  );

  const transferToTable = useCallback(
    async (target: floorApi.DiningTableStatusDto, source?: ActiveTableState | null) => {
      const from = source ?? activeTable;
      if (!pinActor || !from) {
        onError('Sélectionnez d’abord une table source');
        return;
      }
      try {
        const { ticketId } = await transferActiveToDiningTable({
          pinActor,
          activeTable: from,
          target,
        });
        updateActiveSession({
          activeTable: {
            ...from,
            id: target.id,
            label: target.label,
            floorPlanId: target.floor_plan_id,
            ticketId,
          },
        });
        setFocusTableId(target.id);
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
    async (target: floorApi.DiningTableStatusDto, source?: ActiveTableState | null) => {
      const from = source ?? activeTable;
      if (!pinActor || !from) {
        onError('Fusion impossible');
        return;
      }
      try {
        await mergeActiveIntoDiningTable({
          pinActor,
          activeTable: from,
          target,
          bindTable,
        });
        setFocusTableId(target.id);
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
      await abandonFloorTicket({
        ticketId: activeTicketId,
        pinToken: pinActor.token,
        cart: sessionCart,
        ensureIntervention: ensureTableIntervention,
        ensureOrdersCancel: ensurePermission,
      });
      updateActiveSession({ activeTable: null, cart: [] });
      onInfo('Addition abandonnée');
      void reload();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onError(e.message || 'Abandon impossible');
    }
  }, [
    pinActor,
    activeTicketId,
    sessionCart,
    onError,
    onInfo,
    reload,
    updateActiveSession,
    ensureTableIntervention,
    ensurePermission,
  ]);

  const detachFromTable = useCallback(async () => {
    if (!pinActor || !activeTable) {
      onError('Aucune table active');
      return;
    }
    try {
      await ensureTableIntervention();
      await floorApi.discardDraftTicketItems(activeTable.ticketId, pinActor.token);
      updateActiveSession({ activeTable: null, cart: [] });
      onInfo('Table laissée ouverte — retour mode comptoir');
      void reload();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onError(e.message || 'Impossible de quitter la table');
    }
  }, [
    pinActor,
    activeTable,
    onError,
    onInfo,
    reload,
    updateActiveSession,
    ensureTableIntervention,
  ]);

  const handleTableSelect = useCallback(
    (table: floorApi.DiningTableStatusDto) => {
      const occupied = tableHasActiveOrder(table);
      if (mode === 'transfer') {
        if (occupied) return;
        void transferToTable(table);
        return;
      }
      if (mode === 'merge') {
        if (!occupied || table.open_ticket_id === activeTicketId) return;
        void mergeIntoTable(table);
        return;
      }
      setFocusTableId(table.id);
      void primeTableInSession(table);
      setResumeTable(table);
    },
    [mode, activeTicketId, transferToTable, mergeIntoTable, primeTableInSession]
  );

  const handleTableDrop = useCallback(
    (sourceId: number, targetId: number) => {
      const source = planTables.find((t) => t.id === sourceId);
      const target = planTables.find((t) => t.id === targetId);
      if (!source || !target) return;
      setFocusTableId(sourceId);
      void primeTableInSession(source);
      setDropPrompt({
        source,
        target,
        prompt: buildTableDropPrompt(source, target),
      });
    },
    [planTables, primeTableInSession]
  );

  const clearDropPrompt = useCallback(() => setDropPrompt(null), []);

  const confirmDropTransfer = useCallback(async () => {
    if (!dropPrompt) return;
    const { source, target } = dropPrompt;
    setDropPrompt(null);
    const primed = await primeTableInSession(source);
    if (!primed) return;
    await transferToTable(target, primed);
  }, [dropPrompt, primeTableInSession, transferToTable]);

  const confirmDropMerge = useCallback(async () => {
    if (!dropPrompt) return;
    const { source, target } = dropPrompt;
    setDropPrompt(null);
    const primed = await primeTableInSession(source);
    if (!primed) return;
    await mergeIntoTable(target, primed);
  }, [dropPrompt, primeTableInSession, mergeIntoTable]);

  const clearResumeTable = useCallback(() => setResumeTable(null), []);

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
    focusTableId,
    focusTable,
    showTransferMergeModes: focusTableId != null || activeTicketId != null,
    pinDialogOpen,
    pinDialogMode,
    setPinDialogOpen,
    setPinDialogMode,
    requirePin,
    badgeIn,
    reload,
    handleTableSelect,
    handleTableDrop,
    dropPrompt,
    clearDropPrompt,
    confirmDropTransfer,
    confirmDropMerge,
    resumeTable,
    clearResumeTable,
    openTableInSession,
    abandonActiveTicket,
    detachFromTable,
  };
}
