import { useStepUpAuth } from '../contexts/StepUpAuthContext';
import type { Product } from '../types';
import type { POSActions, POSState } from './usePOSState';
import { useFloorService } from './useFloorService';
import { usePOSContainerCart } from './usePOSContainerCart';
import { usePOSContainerFloor } from './usePOSContainerFloor';
import { usePOSContainerLineActions } from './usePOSContainerLineActions';
import { usePOSContainerPayment } from './usePOSContainerPayment';

type FloorApi = ReturnType<typeof useFloorService>;

export interface UsePOSContainerActionsArgs {
  state: POSState;
  actions: POSActions;
  floor: FloorApi;
  ensureTableIntervention: () => Promise<void>;
  cartSelectedIds: Set<string>;
  floorOnError: (message: string) => void;
  isHappyHourActive: boolean;
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number;
  orderTotal: number;
  orderTax: number;
  onDataUpdate: () => void;
}

export function usePOSContainerActions({
  state,
  actions,
  floor,
  ensureTableIntervention,
  cartSelectedIds,
  floorOnError,
  isHappyHourActive,
  calculateProductPrice,
  orderTotal,
  orderTax,
  onDataUpdate,
}: UsePOSContainerActionsArgs) {
  const { ensureSession, ensurePermission } = useStepUpAuth();

  const payment = usePOSContainerPayment({
    setSnackbar: actions.setSnackbar,
    setPaymentDialogOpen: actions.setPaymentDialogOpen,
    clearOrder: actions.clearOrder,
    closeActiveTicketAfterOrder: floor.closeActiveTicketAfterOrder,
    activeTable: floor.activeTable,
    ensureSession,
    currentOrder: state.currentOrder,
    orderTotal,
    orderTax,
    onDataUpdate,
  });

  const cart = usePOSContainerCart({
    addLinesToOrder: actions.addLinesToOrder,
    updateLineAt: actions.updateLineAt,
    setSnackbar: actions.setSnackbar,
    currentOrder: state.currentOrder,
    activeTable: floor.activeTable,
    ensureSession,
    ensureTableIntervention,
    isHappyHourActive,
    calculateProductPrice,
  });

  const lineActions = usePOSContainerLineActions({
    currentOrder: state.currentOrder,
    updateLineAt: actions.updateLineAt,
    removeFromOrder: actions.removeFromOrder,
    clearOrder: actions.clearOrder,
    floor,
    ensurePermission,
    ensureTableIntervention,
  });

  const floorActions = usePOSContainerFloor({
    floor,
    currentOrder: state.currentOrder,
    cartSelectedIds,
    floorOnError,
    ensureSession,
    ensurePermission,
    ensureTableIntervention,
  });

  return { payment, cart, lineActions, floorActions };
}

export type { POSContainerPayment } from './usePOSContainerPayment';
export type { POSContainerCart } from './usePOSContainerCart';
export type { POSContainerLineActions } from './usePOSContainerLineActions';
export type { POSContainerFloorActions } from './usePOSContainerFloor';
export type POSFloorService = ReturnType<typeof useFloorService>;
