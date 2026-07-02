import React, { Suspense, useCallback, useState } from 'react';
import { Box, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Category, Product, OrderItem, Order } from '../../types';
import { usePOSState } from '../../hooks/usePOSState';
import { usePOSOrderTotals } from '../../hooks/usePOSOrderTotals';
import { usePOSAPI } from '../../hooks/usePOSAPI';
import { usePOSOrderAdjustments } from '../../hooks/usePOSOrderAdjustments';
import { usePOSCatalogLogic } from '../../hooks/usePOSCatalogLogic';
import POSLayout from './POSLayout';
import POSMenuPanel from './POSMenuPanel';
import POSOrderPanel from './POSOrderPanel';
import type { DiversFormData } from './DiversDialog';
import type { ProductOptionSelection } from './ProductOptionDialog';
import { upsertLineNoteInOptions } from '../../utils/lineItemNote';
import { formatCurrency } from '../../utils/formatCurrency';

const LazyPaymentDialog = React.lazy(() => import('./PaymentDialog'));
const LazyPrintAfterSaleDialog = React.lazy(() => import('./PrintAfterSaleDialog'));
const LazyDiversDialog = React.lazy(() => import('./DiversDialog'));
const LazyProductOptionDialog = React.lazy(() => import('./ProductOptionDialog'));

interface POSContainerProps {
  categories: Category[];
  products: Product[];
  isHappyHourActive: boolean;
  onDataUpdate: () => void;
  posLinePermissions?: {
    happyHourManual: boolean;
    offert: boolean;
    perso: boolean;
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
  },
}) => {
  const [state, actions] = usePOSState();
  const [diversDialogOpen, setDiversDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<{ product: Product; quantity: number } | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);

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
      }
    },
    [actions.setSnackbar]
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
    (item: OrderItem, quantity: number = 1) => {
      const base = { ...item, quantity: 1 };
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
    [actions.addLinesToOrder]
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
      handleAddToOrder(buildOrderItem(product, []), quantity);
    },
    [buildOrderItem, handleAddToOrder]
  );

  const handleConfirmProductOptions = useCallback(
    (selections: ProductOptionSelection[]) => {
      if (!pendingProduct) return;
      handleAddToOrder(buildOrderItem(pendingProduct.product, selections), pendingProduct.quantity);
      setPendingProduct(null);
    },
    [pendingProduct, buildOrderItem, handleAddToOrder]
  );

  const handleUpdateLineNote = useCallback(
    (index: number, note: string) => {
      const line = state.currentOrder[index];
      if (!line) return;
      actions.updateLineAt(index, {
        options: upsertLineNoteInOptions(line.options, note),
      });
    },
    [actions.updateLineAt, state.currentOrder]
  );

  const { handleApplyHappyHour, handleApplyOffert, handleApplyPerso } =
    usePOSOrderAdjustments({
      currentOrder: state.currentOrder,
      updateLineAt: actions.updateLineAt,
    });

  const handleCheckout = useCallback(() => {
    actions.setPaymentDialogOpen(true);
  }, [actions.setPaymentDialogOpen]);

  const handleQuickPayment = useCallback(
    async (method: 'cash' | 'card') => {
      if (state.currentOrder.length === 0) return;
      try {
        await createOrder({
          paymentMethod: method,
          totalAmount: orderTotal,
          totalTax: orderTax,
          items: state.currentOrder,
          tips: 0,
          change: 0,
        });
        actions.clearOrder();
      } catch {
        // Error already reported by usePOSAPI
      }
    },
    [state.currentOrder, orderTotal, orderTax, createOrder, actions.clearOrder]
  );

  const handleQuickCard = useCallback(() => {
    void handleQuickPayment('card');
  }, [handleQuickPayment]);

  const handleQuickCash = useCallback(() => {
    void handleQuickPayment('cash');
  }, [handleQuickPayment]);

  const handleCloseSnackbar = useCallback(() => {
    actions.closeSnackbar();
  }, [actions.closeSnackbar]);

  const handleClosePaymentDialog = useCallback(() => {
    actions.setPaymentDialogOpen(false);
  }, [actions.setPaymentDialogOpen]);

  const handleDiversClick = useCallback(() => {
    setDiversDialogOpen(true);
  }, []);

  const handleCloseDiversDialog = useCallback(() => {
    setDiversDialogOpen(false);
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
      handleAddToOrder(item, 1);
    },
    [handleAddToOrder]
  );

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <POSLayout
          menuContent={
            <POSMenuPanel
              categories={categories}
              products={products}
              isHappyHourActive={isHappyHourActive}
              selectedCategory={state.selectedCategory}
              searchQuery={state.searchQuery}
              onCategorySelect={actions.setSelectedCategory}
              onSearchChange={actions.setSearchQuery}
              onRequestAddProduct={handleRequestAddProduct}
              onDiversClick={handleDiversClick}
            />
          }
          orderContent={
            <POSOrderPanel
              currentOrder={state.currentOrder}
              onRemoveItem={actions.removeFromOrder}
              onClearOrder={actions.clearOrder}
              onCheckout={handleCheckout}
              onQuickCard={handleQuickCard}
              onQuickCash={handleQuickCash}
              onFaireDeLaMonnaie={handleFaireDeLaMonnaie}
              onApplyHappyHour={posLinePermissions.happyHourManual ? handleApplyHappyHour : undefined}
              onApplyOffert={posLinePermissions.offert ? handleApplyOffert : undefined}
              onApplyPerso={posLinePermissions.perso ? handleApplyPerso : undefined}
              onUpdateLineNote={handleUpdateLineNote}
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
    </Box>
  );
};

export default POSContainer;
