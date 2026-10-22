import React, { useCallback, useEffect, useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { Category, Product } from '../../types';
import { usePOSState } from '../../hooks/usePOSState';
import { usePOSOrderTotals } from '../../hooks/usePOSOrderTotals';
import { usePOSCatalogLogic } from '../../hooks/usePOSCatalogLogic';
import { useFloorService } from '../../hooks/useFloorService';
import { useAuth } from '../../hooks/useAuth';
import { usePinSessions } from '../../contexts/PinSessionsContext';
import {
  useFloorOrderAttributionSync,
  useTableInterventionGate,
} from '../../hooks/useTableInterventionGate';
import { usePOSContainerActions } from '../../hooks/usePOSContainerActions';
import POSLayout from './POSLayout';
import POSMenuPanel from './POSMenuPanel';
import POSOrderPanel from './POSOrderPanel';
import POSSearchBar from './POSSearchBar';
import POSContainerDialogs from './POSContainerDialogs';

interface POSContainerProps {
  categories: Category[];
  products: Product[];
  isHappyHourActive: boolean;
  onDataUpdate: () => void;
}

const POSContainer: React.FC<POSContainerProps> = ({
  categories,
  products,
  isHappyHourActive,
  onDataUpdate,
}) => {
  const [state, actions] = usePOSState();
  const { setSnackbar, setSearchQuery, setSelectedCategory, closeSnackbar } = actions;
  const { activeSessionId, sessions, updateActiveSession } = usePinSessions();
  const sessionSyncRef = React.useRef<string | null>(null);
  const skipNextCartPersistRef = React.useRef(false);
  const [cartSelectedIds, setCartSelectedIds] = useState<Set<string>>(new Set());

  const floorOnError = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: 'error' });
    },
    [setSnackbar]
  );
  const floorOnInfo = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: 'success' });
    },
    [setSnackbar]
  );

  const floor = useFloorService({
    currentOrder: state.currentOrder,
    setCurrentOrder: actions.setCurrentOrder,
    onError: floorOnError,
    onInfo: floorOnInfo,
    getCartSelectedIds: () => cartSelectedIds,
  });

  const { user, permissions } = useAuth();

  const canManageFloor =
    user?.role === 'establishment_admin' ||
    permissions.includes('manage_floor_plan');

  // Offered to everyone: the click asks for a PIN when the acting profile lacks the right.
  const canReassignWaiter = true;

  const ensureTableIntervention = useTableInterventionGate(
    floor.activeTable,
    floor.pinActor
  );
  useFloorOrderAttributionSync(floor.pinActor, floor.activeTable);

  useEffect(() => {
    if (activeSessionId === sessionSyncRef.current) return;
    sessionSyncRef.current = activeSessionId;
    const session = sessions.find((s) => s.id === activeSessionId);
    // The persist effect below runs in this same commit, still holding the
    // previous session's cart — skip it so it cannot bleed into the new tab.
    skipNextCartPersistRef.current = true;
    actions.setCurrentOrder(session?.cart ?? []);
  }, [activeSessionId, sessions, actions]);

  useEffect(() => {
    if (!activeSessionId || sessionSyncRef.current !== activeSessionId) return;
    if (skipNextCartPersistRef.current) {
      skipNextCartPersistRef.current = false;
      return;
    }
    updateActiveSession({ cart: state.currentOrder });
  }, [state.currentOrder, activeSessionId, updateActiveSession]);

  const { orderTotal, orderTax, orderSubtotal } = usePOSOrderTotals(state.currentOrder);
  const { calculateProductPrice } = usePOSCatalogLogic(
    products,
    categories,
    state.selectedCategory,
    state.searchQuery,
    isHappyHourActive
  );

  const { payment, cart, lineActions, floorActions } = usePOSContainerActions({
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
  });

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      setSearchQuery('');
      setSelectedCategory(categoryId);
    },
    [setSearchQuery, setSelectedCategory]
  );

  const handleCloseSnackbar = useCallback(() => {
    closeSnackbar();
  }, [closeSnackbar]);

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <POSSearchBar searchQuery={state.searchQuery} onSearchChange={actions.setSearchQuery} />
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <POSLayout
          menuContent={
            <POSMenuPanel
              categories={categories}
              products={products}
              isHappyHourActive={isHappyHourActive}
              selectedCategory={state.selectedCategory}
              searchQuery={state.searchQuery}
              onCategorySelect={handleCategorySelect}
              onRequestAddProduct={cart.handleRequestAddProduct}
              onDiversClick={cart.handleDiversClick}
              onPourboireClick={cart.handlePourboireClick}
            />
          }
          orderContent={
            // Line actions are always offered: a profile without the right is asked for a PIN.
            <POSOrderPanel
              currentOrder={state.currentOrder}
              onRemoveItem={lineActions.handleRemoveItem}
              onClearOrder={lineActions.handleClearOrder}
              onCheckout={payment.handleCheckout}
              onQuickCard={payment.handleQuickCard}
              onQuickCash={payment.handleQuickCash}
              onApplyHappyHour={(index: number) => void lineActions.gatedApplyHappyHour(index)}
              onApplyOffert={(index: number) => void lineActions.gatedApplyOffert(index)}
              onApplyPerso={(index: number) => void lineActions.gatedApplyPerso(index)}
              onApplyRemise={(indices) => void lineActions.handleRequestRemise(indices)}
              onUpdateLineNote={cart.handleUpdateLineNote}
              onSelectTable={floor.requestMap}
              activeTableLabel={floor.activeTable?.label ?? null}
              onSuivre={
                floor.pinActor ? () => void floorActions.handleSuivre() : () => floor.openPinDialog('verify')
              }
              onValidateTableOrder={() => void floorActions.handleValidateTableOrder()}
              onAssignOrder={() => void floorActions.handleAssignOrderOpen()}
              assignedWaiterDisplayName={floor.activeTable?.assignedWaiterDisplayName ?? null}
              cartSelectedIds={cartSelectedIds}
              onCartSelectedIdsChange={setCartSelectedIds}
            />
          }
          orderBadge={state.currentOrder.length}
        />
      </Box>

      <Snackbar
        open={state.snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={state.snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {state.snackbar.message}
        </Alert>
      </Snackbar>

      <POSContainerDialogs
        floor={floor}
        userRole={user?.role ?? 'staff'}
        permissions={permissions ?? user?.permissions ?? []}
        canManageFloor={canManageFloor}
        canReassignWaiter={canReassignWaiter}
        paymentDialogOpen={state.paymentDialogOpen}
        currentOrder={state.currentOrder}
        orderTotal={orderTotal}
        orderTax={orderTax}
        orderSubtotal={orderSubtotal}
        onDataUpdate={onDataUpdate}
        onClearOrder={actions.clearOrder}
        payment={payment}
        cart={cart}
        lineActions={lineActions}
        floorActions={floorActions}
      />
    </Box>
  );
};

export default POSContainer;
