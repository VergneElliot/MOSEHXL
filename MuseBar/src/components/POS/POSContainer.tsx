import React, { useCallback, useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { Category, Product, OrderItem, Order } from '../../types';
import { usePOSState } from '../../hooks/usePOSState';
import { usePOSLogic } from '../../hooks/usePOSLogic';
import { usePOSAPI } from '../../hooks/usePOSAPI';
import { usePOSOrderAdjustments } from '../../hooks/usePOSOrderAdjustments';
import CategoryFilter from './CategoryFilter';
import ProductGrid from './ProductGrid';
import OrderSummary from './OrderSummary';
import POSLayout from './POSLayout';
import PaymentDialog from './PaymentDialog';
import { DiversDialog, DiversFormData } from './DiversDialog';
import PrintAfterSaleDialog from './PrintAfterSaleDialog';
import ProductOptionDialog, { ProductOptionSelection } from './ProductOptionDialog';

interface POSContainerProps {
  categories: Category[];
  products: Product[];
  isHappyHourActive: boolean;
  onDataUpdate: () => void;
  /** Server-enforced POS line actions (buttons hidden if false). */
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
  // Custom hooks for state management
  const [state, actions] = usePOSState();
  const [diversDialogOpen, setDiversDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<{ product: Product; quantity: number } | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);

  // Custom hook for business logic
  const logic = usePOSLogic(
    products,
    categories,
    state.currentOrder,
    state.selectedCategory,
    state.searchQuery,
    isHappyHourActive
  );

  const handlePaymentComplete = (message: string, createdOrder?: Order) => {
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
  };
  const handlePaymentError = (message: string) => {
    actions.setSnackbar({ open: true, message, severity: 'error' });
  };
  const { createOrder, processChange } = usePOSAPI(handlePaymentComplete, handlePaymentError, onDataUpdate);

  const handleFaireDeLaMonnaie = useCallback(
    async (amount: number) => {
      await processChange({ amount, direction: 'card-to-cash' });
    },
    [processChange]
  );

  // Add N copies as individual cart lines (each quantity 1). No grouping.
  const handleAddToOrder = useCallback(
    (item: OrderItem, quantity: number = 1) => {
      const base = { ...item, quantity: 1 };
      for (let i = 0; i < quantity; i++) {
        actions.addToOrder({
          ...base,
          id: `${base.id}-${Date.now()}-${i}`,
          totalPrice: base.unitPrice,
          taxAmount: base.unitPrice * (base.taxRate / (1 + base.taxRate)),
        });
      }
    },
    [actions]
  );

  const buildOrderItem = useCallback(
    (product: Product, selections: ProductOptionSelection[]): OrderItem => {
      const currentPrice = logic.calculateProductPrice(product, isHappyHourActive);
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
    [isHappyHourActive, logic]
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

  const { handleApplyHappyHour, handleApplyOffert, handleApplyPerso } =
    usePOSOrderAdjustments({
      currentOrder: state.currentOrder,
      updateLineAt: actions.updateLineAt,
    });

  const handleCheckout = () => {
    actions.setPaymentDialogOpen(true);
  };

  const handleQuickPayment = useCallback(
    async (method: 'cash' | 'card') => {
      if (!logic.canProcessPayment || state.currentOrder.length === 0) return;
      try {
        await createOrder({
          paymentMethod: method,
          totalAmount: logic.orderTotal,
          totalTax: logic.orderTax,
          items: state.currentOrder,
          tips: 0,
          change: 0,
        });
        actions.clearOrder();
      } catch {
        // Error already reported by usePOSAPI
      }
    },
    [logic.canProcessPayment, logic.orderTotal, logic.orderTax, state.currentOrder, createOrder, actions]
  );

  const handleCloseSnackbar = () => {
    actions.closeSnackbar();
  };

  const handleClosePaymentDialog = () => {
    actions.setPaymentDialogOpen(false);
  };

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

  const menuContent = (
    <>
      <Box sx={{ flexShrink: 0 }}>
        <CategoryFilter
          categories={categories}
          selectedCategory={state.selectedCategory}
          searchQuery={state.searchQuery}
          onCategorySelect={actions.setSelectedCategory}
          onSearchChange={actions.setSearchQuery}
        />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <ProductGrid
          products={logic.filteredProducts}
          categories={categories}
          isHappyHourActive={isHappyHourActive}
          onRequestAddProduct={handleRequestAddProduct}
          calculateProductPrice={logic.calculateProductPrice}
          formatCurrency={logic.formatCurrency}
          onDiversClick={() => setDiversDialogOpen(true)}
        />
      </Box>
    </>
  );

  const orderContent = (
    <OrderSummary
      currentOrder={state.currentOrder}
      orderTotal={logic.orderTotal}
      orderTax={logic.orderTax}
      orderSubtotal={logic.orderSubtotal}
      canProcessPayment={logic.canProcessPayment}
      onRemoveItem={actions.removeFromOrder}
      onClearOrder={actions.clearOrder}
      onCheckout={handleCheckout}
      onQuickCard={() => handleQuickPayment('card')}
      onQuickCash={() => handleQuickPayment('cash')}
      onFaireDeLaMonnaie={handleFaireDeLaMonnaie}
      onApplyHappyHour={posLinePermissions.happyHourManual ? handleApplyHappyHour : undefined}
      onApplyOffert={posLinePermissions.offert ? handleApplyOffert : undefined}
      onApplyPerso={posLinePermissions.perso ? handleApplyPerso : undefined}
      formatCurrency={logic.formatCurrency}
    />
  );

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <POSLayout
          menuContent={menuContent}
          orderContent={orderContent}
          orderBadge={state.currentOrder.length}
        />
      </Box>

      {/* Snackbar for notifications */}
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

      {/* Payment Dialog */}
      <PaymentDialog
        open={state.paymentDialogOpen}
        onClose={handleClosePaymentDialog}
        currentOrder={state.currentOrder}
        orderTotal={logic.orderTotal}
        orderTax={logic.orderTax}
        orderSubtotal={logic.orderSubtotal}
        onOrderComplete={handlePaymentComplete}
        onOrderError={handlePaymentError}
        onDataUpdate={onDataUpdate}
        onClearOrder={actions.clearOrder}
      />

      <PrintAfterSaleDialog
        open={printDialogOpen}
        orderId={lastOrderId}
        onClose={() => setPrintDialogOpen(false)}
      />

      <DiversDialog
        open={diversDialogOpen}
        onClose={() => setDiversDialogOpen(false)}
        onSubmit={handleDiversSubmit}
        formatCurrency={logic.formatCurrency}
      />

      <ProductOptionDialog
        open={optionDialogOpen}
        product={pendingProduct?.product ?? null}
        quantity={pendingProduct?.quantity ?? 1}
        onClose={() => {
          setOptionDialogOpen(false);
          setPendingProduct(null);
        }}
        onConfirm={handleConfirmProductOptions}
      />

      {/* Future: Add other dialog components (retour, change, etc.) */}
    </Box>
  );
};

export default POSContainer;
