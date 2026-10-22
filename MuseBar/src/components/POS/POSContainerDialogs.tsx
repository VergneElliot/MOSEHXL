import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import type { OrderItem } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { resolvePinLengthRules } from '../../utils/pinRules';
import RemiseDialog from './RemiseDialog';
import AssignOrderDialog from './AssignOrderDialog';
import type {
  POSContainerCart,
  POSContainerFloorActions,
  POSContainerLineActions,
  POSContainerPayment,
  POSFloorService,
} from '../../hooks/usePOSContainerActions';

const LazyPaymentDialog = React.lazy(() => import('./PaymentDialog'));
const LazyPrintAfterSaleDialog = React.lazy(() => import('./PrintAfterSaleDialog'));
const LazyDiversDialog = React.lazy(() => import('./DiversDialog'));
const LazyPourboireDialog = React.lazy(() => import('./PourboireDialog'));
const LazyProductOptionDialog = React.lazy(() => import('./ProductOptionDialog'));
const LazyPinPadDialog = React.lazy(() => import('./PinPadDialog'));
const LazyFloorMapDialog = React.lazy(() => import('./FloorMapDialog'));

export interface POSContainerDialogsProps {
  floor: POSFloorService;
  userRole: string;
  permissions: string[];
  canManageFloor: boolean;
  canReassignWaiter: boolean;
  paymentDialogOpen: boolean;
  currentOrder: OrderItem[];
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  onDataUpdate: () => void;
  onClearOrder: () => void;
  payment: POSContainerPayment;
  cart: POSContainerCart;
  lineActions: POSContainerLineActions;
  floorActions: POSContainerFloorActions;
}

const POSContainerDialogs: React.FC<POSContainerDialogsProps> = ({
  floor,
  userRole,
  permissions,
  canManageFloor,
  canReassignWaiter,
  paymentDialogOpen,
  currentOrder,
  orderTotal,
  orderTax,
  orderSubtotal,
  onDataUpdate,
  onClearOrder,
  payment,
  cart,
  lineActions,
  floorActions,
}) => (
  <>
    {paymentDialogOpen && (
      <Suspense
        fallback={
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        }
      >
        <LazyPaymentDialog
          open={paymentDialogOpen}
          onClose={payment.handleClosePaymentDialog}
          currentOrder={currentOrder}
          orderTotal={orderTotal}
          orderTax={orderTax}
          orderSubtotal={orderSubtotal}
          onOrderComplete={payment.handlePaymentComplete}
          onOrderError={payment.handlePaymentError}
          onDataUpdate={onDataUpdate}
          onClearOrder={onClearOrder}
          onFaireDeLaMonnaie={payment.handleFaireDeLaMonnaie}
        />
      </Suspense>
    )}

    {payment.printDialogOpen && (
      <Suspense fallback={null}>
        <LazyPrintAfterSaleDialog
          open={payment.printDialogOpen}
          orderId={payment.lastOrderId}
          onClose={payment.handleClosePrintDialog}
        />
      </Suspense>
    )}

    {cart.diversDialogOpen && (
      <Suspense fallback={null}>
        <LazyDiversDialog
          open={cart.diversDialogOpen}
          onClose={cart.handleCloseDiversDialog}
          onSubmit={cart.handleDiversSubmit}
          formatCurrency={formatCurrency}
        />
      </Suspense>
    )}

    {cart.pourboireDialogOpen && (
      <Suspense fallback={null}>
        <LazyPourboireDialog
          open={cart.pourboireDialogOpen}
          onClose={cart.handleClosePourboireDialog}
          onSubmit={cart.handlePourboireSubmit}
          formatCurrency={formatCurrency}
        />
      </Suspense>
    )}

    <RemiseDialog
      open={lineActions.remiseDialogOpen}
      onClose={lineActions.handleCloseRemiseDialog}
      onConfirm={lineActions.handleConfirmRemise}
    />

    <AssignOrderDialog
      open={floorActions.assignDialogOpen}
      onClose={floorActions.handleCloseAssignDialog}
      hasActiveTable={Boolean(floor.activeTable)}
      assignedWaiterDisplayName={floor.activeTable?.assignedWaiterDisplayName ?? null}
      canReassignWaiter={canReassignWaiter}
      pinActorToken={floor.pinActor?.token ?? null}
      onAssignTable={floorActions.handleAssignToTable}
      onBeforeWaiterStep={floorActions.handleBeforeWaiterStep}
      onAssignWaiter={(userId, displayName) =>
        void floorActions.handleAssignToWaiter(userId, displayName)
      }
    />

    {(cart.optionDialogOpen || cart.pendingProduct) && (
      <Suspense fallback={null}>
        <LazyProductOptionDialog
          open={cart.optionDialogOpen}
          product={cart.pendingProduct?.product ?? null}
          quantity={cart.pendingProduct?.quantity ?? 1}
          onClose={cart.handleCloseOptionDialog}
          onConfirm={cart.handleConfirmProductOptions}
        />
      </Suspense>
    )}

    {floor.pinDialogOpen && (
      <Suspense fallback={null}>
        <LazyPinPadDialog
          open={floor.pinDialogOpen}
          mode={floor.pinDialogMode}
          setRules={resolvePinLengthRules({
            role: userRole,
            permissions,
          })}
          onClose={() => {
            floor.setPinDialogOpen(false);
          }}
          onVerify={floor.badgeIn}
          onSetPin={floor.setMyPin}
          onSwitchToSet={() => floor.setPinDialogMode('set')}
          onSwitchToVerify={() => floor.setPinDialogMode('verify')}
        />
      </Suspense>
    )}

    {floor.mapDialogOpen && (
      <Suspense fallback={null}>
        <LazyFloorMapDialog
          open={floor.mapDialogOpen}
          onClose={() => floor.setMapDialogOpen()}
          mapPurpose={floor.mapPurpose}
          activeTicketId={floor.activeTable?.ticketId ?? null}
          onSelectFree={(t) => void floor.selectFreeTable(t)}
          onSelectOccupied={(t) => void floor.selectOccupiedTable(t)}
          onTransferTo={(t) => void floorActions.handleMoveToTable(t)}
          onMergeInto={(t) => void floorActions.handleMoveToTable(t)}
          canManageFloor={canManageFloor}
        />
      </Suspense>
    )}
  </>
);

export default POSContainerDialogs;
