import { useCallback, useRef } from 'react';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import { resolveTargetOrderItems } from '../utils/posCartSelection';
import {
  usePinSessions,
  type ActiveTableState,
  type PinActorState,
} from '../contexts/PinSessionsContext';
import { useTableInterventionGate } from './useTableInterventionGate';
import type { FloorServiceContext } from './floorServiceContext';
import { useFloorServiceDialogs } from './useFloorServiceDialogs';
import { useFloorServiceAssign } from './useFloorServiceAssign';
import { useFloorServiceTableBinding } from './useFloorServiceTableBinding';
import { useFloorServiceTransfers } from './useFloorServiceTransfers';
import { useFloorServiceTicketOps } from './useFloorServiceTicketOps';
import { useFloorServiceCartSync } from './useFloorServiceCartSync';

export type { ActiveTableState, PinActorState };
export type { FloorMapPendingAction } from './floorServiceContext';

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
  const ensureTableIntervention = useTableInterventionGate(activeTable, pinActor);

  const skipNextSync = useRef(false);
  const validateTableOrderRef = useRef<
    (order: OrderItem[], ticketIdOverride?: number) => Promise<void>
  >(async () => {});

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

  const ctx: FloorServiceContext = {
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
    ensureTableIntervention,
  };

  const dialogs = useFloorServiceDialogs({ pinActor, addOrFocusSession, onInfo });
  const assignCartToTable = useFloorServiceAssign(ctx, dialogs);
  const binding = useFloorServiceTableBinding(
    ctx,
    dialogs,
    assignCartToTable,
    validateTableOrderRef
  );
  const transfers = useFloorServiceTransfers(ctx, dialogs, binding.bindTable);
  const ticketOps = useFloorServiceTicketOps(ctx, dialogs);
  validateTableOrderRef.current = ticketOps.validateTableOrder;
  useFloorServiceCartSync(ctx);

  const clearPin = useCallback(() => {
    dismissActiveSession();
  }, [dismissActiveSession]);

  return {
    pinActor,
    activeTable,
    pinDialogOpen: dialogs.pinDialogOpen,
    pinDialogMode: dialogs.pinDialogMode,
    mapDialogOpen: dialogs.mapDialogOpen,
    mapPurpose: dialogs.mapPurpose,
    setPinDialogOpen: dialogs.setPinDialogOpen,
    setMapDialogOpen: dialogs.closeMapDialog,
    setPinDialogMode: dialogs.setPinDialogMode,
    clearPin,
    badgeIn: dialogs.badgeIn,
    setMyPin: dialogs.setMyPin,
    openPinDialog: dialogs.openPinDialog,
    requestMap: dialogs.requestMap,
    openMapForAction: dialogs.openMapForAction,
    openMapForMoveTable: dialogs.openMapForMoveTable,
    selectFreeTable: binding.selectFreeTable,
    selectOccupiedTable: binding.selectOccupiedTable,
    abandonActiveOrTable: binding.abandonActiveOrTable,
    closeActiveTicketAfterOrder: binding.closeActiveTicketAfterOrder,
    detachTableKeepTicket: binding.detachTableKeepTicket,
    clearTableBinding: binding.clearTableBinding,
    transferActiveToTable: transfers.transferActiveToTable,
    mergeActiveIntoTable: transfers.mergeActiveIntoTable,
    moveToTable: transfers.moveToTable,
    printSuivre: ticketOps.printSuivre,
    validateTableOrder: ticketOps.validateTableOrder,
    assignTicketWaiter: ticketOps.assignTicketWaiter,
    cancelValidatedTicketLine: ticketOps.cancelValidatedTicketLine,
  };
}
