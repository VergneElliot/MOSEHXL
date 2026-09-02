import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Box, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Category, Product, OrderItem, Order } from '../../types';
import { usePOSState } from '../../hooks/usePOSState';
import { usePOSOrderTotals } from '../../hooks/usePOSOrderTotals';
import { usePOSAPI } from '../../hooks/usePOSAPI';
import { usePOSOrderAdjustments } from '../../hooks/usePOSOrderAdjustments';
import { usePOSCatalogLogic } from '../../hooks/usePOSCatalogLogic';
import { useFloorService } from '../../hooks/useFloorService';
import { useAuth } from '../../hooks/useAuth';
import { usePinSessions } from '../../contexts/PinSessionsContext';
import { useStepUpAuth } from '../../contexts/StepUpAuthContext';
import { setFloorOrderAttribution } from '../../services/floorOrderAttribution';
import POSLayout from './POSLayout';
import POSMenuPanel from './POSMenuPanel';
import POSOrderPanel from './POSOrderPanel';
import POSSearchBar from './POSSearchBar';
import RemiseDialog, { type RemiseFormData } from './RemiseDialog';
import AssignOrderDialog from './AssignOrderDialog';
import type { DiversFormData } from './DiversDialog';
import type { PourboireFormData } from './PourboireDialog';
import type { ProductOptionSelection } from './ProductOptionDialog';
import { upsertLineNoteInOptions } from '../../utils/lineItemNote';
import { formatCurrency } from '../../utils/formatCurrency';
import { saleLines, tipsFromOrder } from '../../hooks/usePOSOrderTotals';
import { resolveTargetOrderItems } from '../../utils/posCartSelection';
import { resolvePinLengthRules } from '../../utils/pinRules';
import { pinActorHasPermission } from '../../utils/pinSessionPermissions';
import { PERMISSIONS } from '@mosehxl/types';

const LazyPaymentDialog = React.lazy(() => import('./PaymentDialog'));
const LazyPrintAfterSaleDialog = React.lazy(() => import('./PrintAfterSaleDialog'));
const LazyDiversDialog = React.lazy(() => import('./DiversDialog'));
const LazyPourboireDialog = React.lazy(() => import('./PourboireDialog'));
const LazyProductOptionDialog = React.lazy(() => import('./ProductOptionDialog'));
const LazyPinPadDialog = React.lazy(() => import('./PinPadDialog'));
const LazyFloorMapDialog = React.lazy(() => import('./FloorMapDialog'));

interface POSContainerProps {
  categories: Category[];
  products: Product[];
  isHappyHourActive: boolean;
  onDataUpdate: () => void;
  posLinePermissions?: {
    happyHourManual: boolean;
    offert: boolean;
    perso: boolean;
    remise: boolean;
    reassignWaiter: boolean;
    interveneTable: boolean;
  };
}

const POSContainer: React.FC<POSContainerProps> = ({
  categories,
  products,
  isHappyHourActive,
  onDataUpdate,
  posLinePermissions = {
    happyHourManual: true,
    offert: true,
    perso: true,
    remise: true,
    reassignWaiter: false,
    interveneTable: false,
  },
}) => {
  const [state, actions] = usePOSState();
  const { activeSessionId, sessions, updateActiveSession } = usePinSessions();
  const { ensureSession, ensurePermission } = useStepUpAuth();
  const sessionSyncRef = React.useRef<string | null>(null);
  const [diversDialogOpen, setDiversDialogOpen] = useState(false);
  const [pourboireDialogOpen, setPourboireDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<{ product: Product; quantity: number } | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [remiseDialogOpen, setRemiseDialogOpen] = useState(false);
  const [remiseTargetIndices, setRemiseTargetIndices] = useState<number[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [cartSelectedIds, setCartSelectedIds] = useState<Set<string>>(new Set());

  const floorOnError = useCallback(
    (message: string) => {
      actions.setSnackbar({ open: true, message, severity: 'error' });
    },
    [actions.setSnackbar]
  );
  const floorOnInfo = useCallback(
    (message: string) => {
      actions.setSnackbar({ open: true, message, severity: 'success' });
    },
    [actions.setSnackbar]
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

  const canReassignWaiter =
    pinActorHasPermission(floor.pinActor, PERMISSIONS.pos_reassign_waiter) ||
    posLinePermissions.reassignWaiter;

  const ensureTableIntervention = useCallback(async () => {
    const table = floor.activeTable;
    const actor = floor.pinActor;
    if (!table || !actor) return;
    const assignedId = table.assignedWaiterUserId;
    if (assignedId == null || actor.userId === assignedId) return;
    if (actor.role === 'establishment_admin') return;
    await ensurePermission(PERMISSIONS.pos_intervene_table, {
      title: 'Intervention sur une autre table',
      description:
        'PIN autorisé pour modifier une table assignée à un autre serveur. L’addition reste sur son Z.',
    });
  }, [floor.activeTable, floor.pinActor, ensurePermission]);

  // Load cart when switching PIN session tabs
  useEffect(() => {
    if (activeSessionId === sessionSyncRef.current) return;
    sessionSyncRef.current = activeSessionId;
    const session = sessions.find((s) => s.id === activeSessionId);
    actions.setCurrentOrder(session?.cart ?? []);
  }, [activeSessionId, sessions, actions]);

  // Persist cart into active session
  useEffect(() => {
    if (!activeSessionId || sessionSyncRef.current !== activeSessionId) return;
    updateActiveSession({ cart: state.currentOrder });
  }, [state.currentOrder, activeSessionId, updateActiveSession]);

  useEffect(() => {
    if (floor.pinActor) {
      const waiterUserId =
        floor.activeTable?.assignedWaiterUserId ?? floor.pinActor.userId;
      const waiterDisplayName =
        floor.activeTable?.assignedWaiterDisplayName ?? floor.pinActor.displayName;
      setFloorOrderAttribution({
        waiterUserId,
        waiterDisplayName,
        tableLabel: floor.activeTable?.label ?? null,
      });
    } else {
      setFloorOrderAttribution(null);
    }
  }, [floor.pinActor, floor.activeTable]);

  const { orderTotal, orderTax, orderSubtotal } = usePOSOrderTotals(state.currentOrder);
  const { calculateProductPrice } = usePOSCatalogLogic(
    products,
    categories,
    state.selectedCategory,
    state.searchQuery,
    isHappyHourActive
  );

  const handlePaymentComplete = useCallback(
    (message: string, createdOrder?: Order) => {
      actions.setSnackbar({ open: true, message, severity: 'success' });
      const rawId = createdOrder?.id;
      const parsedId =
        typeof rawId === 'number'
          ? rawId
          : typeof rawId === 'string'
            ? parseInt(rawId, 10)
            : NaN;
      if (Number.isFinite(parsedId) && parsedId > 0) {
        setLastOrderId(parsedId);
        setPrintDialogOpen(true);
        void floor.closeActiveTicketAfterOrder(parsedId);
      }
    },
    [actions.setSnackbar, floor.closeActiveTicketAfterOrder]
  );

  const handlePaymentError = useCallback(
    (message: string) => {
      actions.setSnackbar({ open: true, message, severity: 'error' });
    },
    [actions.setSnackbar]
  );

  const { createOrder, processChange } = usePOSAPI(handlePaymentComplete, handlePaymentError, onDataUpdate);

  const handleFaireDeLaMonnaie = useCallback(
    async (amount: number) => {
      await processChange({ amount, direction: 'card-to-cash' });
    },
    [processChange]
  );

  const handleAddToOrder = useCallback(
    async (item: OrderItem, quantity: number = 1) => {
      try {
        await ensureSession();
        if (floor.activeTable) {
          await ensureTableIntervention();
        }
      } catch {
        actions.setSnackbar({
          open: true,
          message: 'Session PIN requise pour ajouter des articles',
          severity: 'error',
        });
        return;
      }
      const base = {
        ...item,
        quantity: 1,
        ...(floor.activeTable ? { tableLineStatus: 'draft' as const } : {}),
      };
      const stamp = Date.now();
      const lines: OrderItem[] = [];
      for (let i = 0; i < quantity; i++) {
        lines.push({
          ...base,
          id: `${base.id}-${stamp}-${i}`,
          totalPrice: base.unitPrice,
          taxAmount: base.unitPrice * (base.taxRate / (1 + base.taxRate)),
        });
      }
      actions.addLinesToOrder(lines);
    },
    [actions.addLinesToOrder, actions.setSnackbar, ensureSession, floor.activeTable, ensureTableIntervention]
  );

  const buildOrderItem = useCallback(
    (product: Product, selections: ProductOptionSelection[]): OrderItem => {
      const currentPrice = calculateProductPrice(product, isHappyHourActive);
      const taxAmount = currentPrice * (product.taxRate / (1 + product.taxRate));
      return {
        id: `${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: currentPrice,
        totalPrice: currentPrice,
        taxRate: product.taxRate,
        taxAmount,
        isHappyHourApplied: isHappyHourActive && product.isHappyHourEligible,
        isOffert: false,
        isPerso: false,
        originalPrice: product.price,
        options: selections.map((selection) => ({
          groupId: selection.groupId,
          groupName: selection.groupName,
          choiceId: selection.choiceId ?? null,
          choiceLabel: selection.choiceLabel ?? null,
          freeText: selection.freeText ?? null,
          displayOrder: selection.displayOrder,
        })),
      };
    },
    [isHappyHourActive, calculateProductPrice]
  );

  const handleRequestAddProduct = useCallback(
    (product: Product, quantity: number) => {
      if ((product.optionGroups?.length ?? 0) > 0) {
        setPendingProduct({ product, quantity });
        setOptionDialogOpen(true);
        return;
      }
      void handleAddToOrder(buildOrderItem(product, []), quantity);
    },
    [buildOrderItem, handleAddToOrder]
  );

  const handleConfirmProductOptions = useCallback(
    (selections: ProductOptionSelection[]) => {
      if (!pendingProduct) return;
      void handleAddToOrder(
        buildOrderItem(pendingProduct.product, selections),
        pendingProduct.quantity
      );
      setPendingProduct(null);
    },
    [pendingProduct, buildOrderItem, handleAddToOrder]
  );

  const handleUpdateLineNote = useCallback(
    async (index: number, note: string) => {
      const line = state.currentOrder[index];
      if (!line) return;
      try {
        if (floor.activeTable) await ensureTableIntervention();
        actions.updateLineAt(index, {
          options: upsertLineNoteInOptions(line.options, note),
        });
      } catch {
        /* cancelled */
      }
    },
    [actions.updateLineAt, state.currentOrder, floor.activeTable, ensureTableIntervention]
  );

  const { handleApplyHappyHour, handleApplyOffert, handleApplyPerso, handleApplyRemise } =
    usePOSOrderAdjustments({
      currentOrder: state.currentOrder,
      updateLineAt: actions.updateLineAt,
    });

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      actions.setSearchQuery('');
      actions.setSelectedCategory(categoryId);
    },
    [actions.setSearchQuery, actions.setSelectedCategory]
  );

  const handleRequestRemise = useCallback(
    async (indices: number[]) => {
      if (!posLinePermissions.remise) return;
      try {
        if (floor.activeTable) await ensureTableIntervention();
        await ensurePermission(PERMISSIONS.pos_happyhour_manual, {
          title: 'Remise',
          description: 'PIN d’un profil autorisé à appliquer une remise.',
        });
        setRemiseTargetIndices(indices);
        setRemiseDialogOpen(true);
      } catch {
        /* cancelled */
      }
    },
    [ensurePermission, posLinePermissions.remise, floor.activeTable, ensureTableIntervention]
  );

  const handleConfirmRemise = useCallback(
    (data: RemiseFormData) => {
      remiseTargetIndices.forEach((index) => handleApplyRemise(index, data));
      setRemiseTargetIndices([]);
    },
    [remiseTargetIndices, handleApplyRemise]
  );

  const handleValidateTableOrder = useCallback(async () => {
    try {
      await ensureSession();
      const targets = resolveTargetOrderItems(state.currentOrder, cartSelectedIds);
      if (targets.length === 0) {
        floorOnError('Aucun article à valider');
        return;
      }
      if (floor.activeTable) {
        await ensureTableIntervention();
      }
      if (!floor.activeTable) {
        floor.openMapForAction('validate');
        return;
      }
      await floor.validateTableOrder(state.currentOrder);
    } catch {
      /* session cancelled */
    }
  }, [
    ensureSession,
    floor,
    state.currentOrder,
    cartSelectedIds,
    floorOnError,
    ensureTableIntervention,
  ]);

  const handleAssignOrderOpen = useCallback(async () => {
    try {
      await ensureSession();
      if (resolveTargetOrderItems(state.currentOrder, cartSelectedIds).length === 0) {
        floorOnError('Sélectionnez au moins un article');
        return;
      }
      if (floor.activeTable) {
        await ensureTableIntervention();
      }
      setAssignDialogOpen(true);
    } catch {
      /* session cancelled */
    }
  }, [ensureSession, floor.activeTable, state.currentOrder, cartSelectedIds, floorOnError, ensureTableIntervention]);

  const handleSuivre = useCallback(async () => {
    try {
      await ensureSession();
      if (resolveTargetOrderItems(state.currentOrder, cartSelectedIds).length === 0) {
        floorOnError('Aucun article à envoyer');
        return;
      }
      if (floor.activeTable) {
        await ensureTableIntervention();
      }
      await floor.printSuivre(state.currentOrder);
    } catch {
      /* session cancelled */
    }
  }, [
    ensureSession,
    floor,
    state.currentOrder,
    cartSelectedIds,
    floorOnError,
    ensureTableIntervention,
  ]);

  const handleAssignToTable = useCallback(async () => {
    try {
      await ensureSession();
      if (floor.activeTable) {
        await ensureTableIntervention();
      }
      if (floor.activeTable) {
        floor.openMapForMoveTable();
        return;
      }
      floor.openMapForAction('assign');
    } catch {
      /* session cancelled */
    }
  }, [ensureSession, floor, ensureTableIntervention]);

  const handleMoveToTable = useCallback(
    async (table: Parameters<typeof floor.moveToTable>[0]) => {
      try {
        await ensureSession();
        await ensureTableIntervention();
        await floor.moveToTable(table);
      } catch {
        /* cancelled */
      }
    },
    [ensureSession, ensureTableIntervention, floor]
  );

  const handleAssignToWaiter = useCallback(
    async (userId: number, displayName: string) => {
      try {
        await ensurePermission(PERMISSIONS.pos_reassign_waiter, {
          title: 'Réassigner un serveur',
          description: 'PIN d’un profil autorisé à réassigner le serveur d’une table.',
        });
        await floor.assignTicketWaiter(userId, displayName);
      } catch {
        /* cancelled or denied */
      }
    },
    [ensurePermission, floor]
  );

  const handleBeforeWaiterStep = useCallback(async () => {
    await ensurePermission(PERMISSIONS.pos_reassign_waiter, {
      title: 'Réassigner un serveur',
      description: 'PIN d’un profil autorisé à réassigner le serveur d’une table.',
    });
  }, [ensurePermission]);

  const gatedApplyHappyHour = useCallback(
    async (index: number) => {
      try {
        if (floor.activeTable) await ensureTableIntervention();
        await ensurePermission(PERMISSIONS.pos_happyhour_manual, {
          title: 'Happy Hour manuel',
          description: 'PIN d’un profil autorisé au Happy Hour manuel.',
        });
        handleApplyHappyHour(index);
      } catch {
        /* cancelled or denied */
      }
    },
    [ensurePermission, handleApplyHappyHour, floor.activeTable, ensureTableIntervention]
  );

  const gatedApplyOffert = useCallback(
    async (index: number) => {
      try {
        if (floor.activeTable) await ensureTableIntervention();
        await ensurePermission(PERMISSIONS.pos_apply_offert, {
          title: 'Offert',
          description: 'PIN d’un profil autorisé à appliquer un offert.',
        });
        handleApplyOffert(index);
      } catch {
        /* cancelled or denied */
      }
    },
    [ensurePermission, handleApplyOffert, floor.activeTable, ensureTableIntervention]
  );

  const gatedApplyPerso = useCallback(
    async (index: number) => {
      try {
        if (floor.activeTable) await ensureTableIntervention();
        await ensurePermission(PERMISSIONS.pos_apply_perso, {
          title: 'Perso',
          description: 'PIN d’un profil autorisé à appliquer un perso.',
        });
        handleApplyPerso(index);
      } catch {
        /* cancelled or denied */
      }
    },
    [ensurePermission, handleApplyPerso, floor.activeTable, ensureTableIntervention]
  );

  const handleCheckout = useCallback(async () => {
    try {
      await ensureSession();
      actions.setPaymentDialogOpen(true);
    } catch {
      actions.setSnackbar({
        open: true,
        message: 'Session PIN requise pour encaisser',
        severity: 'error',
      });
    }
  }, [actions.setPaymentDialogOpen, actions.setSnackbar, ensureSession]);

  const handleQuickPayment = useCallback(
    async (method: 'cash' | 'card') => {
      if (state.currentOrder.length === 0) return;
      try {
        await ensureSession();
        const created = await createOrder({
          paymentMethod: method,
          totalAmount: orderTotal,
          totalTax: orderTax,
          items: saleLines(state.currentOrder),
          tips: tipsFromOrder(state.currentOrder),
          change: 0,
        });
        void created;
        actions.clearOrder();
      } catch {
        // Error already reported by usePOSAPI or session cancelled
      }
    },
    [
      state.currentOrder,
      orderTotal,
      orderTax,
      createOrder,
      actions.clearOrder,
      ensureSession,
    ]
  );

  const handleClearOrder = useCallback(() => {
    if (floor.activeTable) {
      void floor.detachTableKeepTicket();
      return;
    }
    if (state.currentOrder.length > 0) {
      actions.clearOrder();
    }
  }, [floor, state.currentOrder.length, actions.clearOrder]);

  const handleRemoveItem = useCallback(
    async (index: number) => {
      const line = state.currentOrder[index];
      if (!line) return;
      if (
        floor.activeTable &&
        line.tableLineStatus === 'validated' &&
        line.ticketLineId != null
      ) {
        try {
          await ensureTableIntervention();
          await ensurePermission(PERMISSIONS.orders_cancel, {
            title: 'Retour article',
            description: 'PIN d’un profil autorisé à annuler un article validé (ticket cuisine).',
          });
          await floor.cancelValidatedTicketLine(line.ticketLineId);
        } catch {
          /* cancelled or denied */
        }
        return;
      }
      try {
        if (floor.activeTable) await ensureTableIntervention();
      } catch {
        return;
      }
      actions.removeFromOrder(index);
    },
    [state.currentOrder, floor, ensurePermission, ensureTableIntervention, actions.removeFromOrder]
  );

  const handleQuickCard = useCallback(() => {
    void handleQuickPayment('card');
  }, [handleQuickPayment]);

  const handleQuickCash = useCallback(() => {
    void handleQuickPayment('cash');
  }, [handleQuickPayment]);

  const handleDropProduct = useCallback(
    (payload: {
      kind?: 'product' | 'divers' | 'pourboire';
      productId?: string;
      quantity?: number;
    }) => {
      if (payload.kind === 'divers') {
        setDiversDialogOpen(true);
        return;
      }
      if (payload.kind === 'pourboire') {
        setPourboireDialogOpen(true);
        return;
      }
      const productId = payload.productId;
      if (!productId) return;
      const product = products.find(p => String(p.id) === String(productId));
      if (!product) return;
      handleRequestAddProduct(product, payload.quantity ?? 1);
    },
    [products, handleRequestAddProduct]
  );

  const handleCloseSnackbar = useCallback(() => {
    actions.closeSnackbar();
  }, [actions.closeSnackbar]);

  const handleClosePaymentDialog = useCallback(() => {
    actions.setPaymentDialogOpen(false);
  }, [actions.setPaymentDialogOpen]);

  const handleDiversClick = useCallback(() => {
    setDiversDialogOpen(true);
  }, []);

  const handlePourboireClick = useCallback(() => {
    setPourboireDialogOpen(true);
  }, []);

  const handleCloseDiversDialog = useCallback(() => {
    setDiversDialogOpen(false);
  }, []);

  const handleClosePourboireDialog = useCallback(() => {
    setPourboireDialogOpen(false);
  }, []);

  const handleClosePrintDialog = useCallback(() => {
    setPrintDialogOpen(false);
  }, []);

  const handleCloseOptionDialog = useCallback(() => {
    setOptionDialogOpen(false);
    setPendingProduct(null);
  }, []);

  const handleDiversSubmit = useCallback(
    (data: DiversFormData) => {
      const price = parseFloat(data.price.replace(',', '.'));
      if (Number.isNaN(price) || price < 0) return;
      const taxAmount = price * (data.taxRate / (1 + data.taxRate));
      const item: OrderItem = {
        id: `divers-${Date.now()}`,
        productId: null,
        productName: data.description.trim(),
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
        taxRate: data.taxRate,
        taxAmount,
        isHappyHourApplied: false,
        isOffert: false,
        isPerso: false,
        description: data.description.trim(),
      };
      void handleAddToOrder(item, 1);
    },
    [handleAddToOrder]
  );

  const handlePourboireSubmit = useCallback(
    (data: PourboireFormData) => {
      const amount = parseFloat(data.amount.replace(',', '.'));
      if (Number.isNaN(amount) || amount <= 0) return;
      const item: OrderItem = {
        id: `tip-${Date.now()}`,
        productId: null,
        productName: 'Pourboire (carte)',
        quantity: 1,
        unitPrice: amount,
        totalPrice: amount,
        taxRate: 0,
        taxAmount: 0,
        isHappyHourApplied: false,
        isOffert: false,
        isPerso: false,
        isTip: true,
        description: 'Pourboire carte',
      };
      void handleAddToOrder(item, 1);
    },
    [handleAddToOrder]
  );

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
              onRequestAddProduct={handleRequestAddProduct}
              onDiversClick={handleDiversClick}
              onPourboireClick={handlePourboireClick}
            />
          }
          orderContent={
            <POSOrderPanel
              currentOrder={state.currentOrder}
              onRemoveItem={handleRemoveItem}
              onClearOrder={handleClearOrder}
              onCheckout={handleCheckout}
              onQuickCard={handleQuickCard}
              onQuickCash={handleQuickCash}
              onApplyHappyHour={
                posLinePermissions.happyHourManual
                  ? (index: number) => void gatedApplyHappyHour(index)
                  : undefined
              }
              onApplyOffert={
                posLinePermissions.offert
                  ? (index: number) => void gatedApplyOffert(index)
                  : undefined
              }
              onApplyPerso={
                posLinePermissions.perso
                  ? (index: number) => void gatedApplyPerso(index)
                  : undefined
              }
              onApplyRemise={
                posLinePermissions.remise ? (indices) => void handleRequestRemise(indices) : undefined
              }
              onUpdateLineNote={handleUpdateLineNote}
              onDropProduct={handleDropProduct}
              onSelectTable={floor.requestMap}
              activeTableLabel={floor.activeTable?.label ?? null}
              onSuivre={
                floor.pinActor ? () => void handleSuivre() : () => floor.openPinDialog('verify')
              }
              onValidateTableOrder={() => void handleValidateTableOrder()}
              onAssignOrder={() => void handleAssignOrderOpen()}
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

      {state.paymentDialogOpen && (
        <Suspense
          fallback={
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress />
            </Box>
          }
        >
          <LazyPaymentDialog
            open={state.paymentDialogOpen}
            onClose={handleClosePaymentDialog}
            currentOrder={state.currentOrder}
            orderTotal={orderTotal}
            orderTax={orderTax}
            orderSubtotal={orderSubtotal}
            onOrderComplete={handlePaymentComplete}
            onOrderError={handlePaymentError}
            onDataUpdate={onDataUpdate}
            onClearOrder={actions.clearOrder}
            onFaireDeLaMonnaie={handleFaireDeLaMonnaie}
          />
        </Suspense>
      )}

      {printDialogOpen && (
        <Suspense fallback={null}>
          <LazyPrintAfterSaleDialog
            open={printDialogOpen}
            orderId={lastOrderId}
            onClose={handleClosePrintDialog}
          />
        </Suspense>
      )}

      {diversDialogOpen && (
        <Suspense fallback={null}>
          <LazyDiversDialog
            open={diversDialogOpen}
            onClose={handleCloseDiversDialog}
            onSubmit={handleDiversSubmit}
            formatCurrency={formatCurrency}
          />
        </Suspense>
      )}

      {pourboireDialogOpen && (
        <Suspense fallback={null}>
          <LazyPourboireDialog
            open={pourboireDialogOpen}
            onClose={handleClosePourboireDialog}
            onSubmit={handlePourboireSubmit}
            formatCurrency={formatCurrency}
          />
        </Suspense>
      )}

      <RemiseDialog
        open={remiseDialogOpen}
        onClose={() => {
          setRemiseDialogOpen(false);
          setRemiseTargetIndices([]);
        }}
        onConfirm={handleConfirmRemise}
      />

      <AssignOrderDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        hasActiveTable={Boolean(floor.activeTable)}
        assignedWaiterDisplayName={floor.activeTable?.assignedWaiterDisplayName ?? null}
        canReassignWaiter={canReassignWaiter}
        pinActorToken={floor.pinActor?.token ?? null}
        onAssignTable={handleAssignToTable}
        onBeforeWaiterStep={handleBeforeWaiterStep}
        onAssignWaiter={(userId, displayName) => void handleAssignToWaiter(userId, displayName)}
      />

      {(optionDialogOpen || pendingProduct) && (
        <Suspense fallback={null}>
          <LazyProductOptionDialog
            open={optionDialogOpen}
            product={pendingProduct?.product ?? null}
            quantity={pendingProduct?.quantity ?? 1}
            onClose={handleCloseOptionDialog}
            onConfirm={handleConfirmProductOptions}
          />
        </Suspense>
      )}

      {floor.pinDialogOpen && (
        <Suspense fallback={null}>
          <LazyPinPadDialog
            open={floor.pinDialogOpen}
            mode={floor.pinDialogMode}
            setRules={resolvePinLengthRules({
              role: user?.role ?? 'staff',
              permissions: permissions ?? user?.permissions ?? [],
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
            onTransferTo={(t) => void handleMoveToTable(t)}
            onMergeInto={(t) => void handleMoveToTable(t)}
            canManageFloor={canManageFloor}
          />
        </Suspense>
      )}
    </Box>
  );
};

export default POSContainer;
