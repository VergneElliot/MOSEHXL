import React, { useCallback } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { Category, Product, OrderItem } from '../../types';
import { usePOSState } from '../../hooks/usePOSState';
import { usePOSLogic } from '../../hooks/usePOSLogic';
import { usePOSAPI } from '../../hooks/usePOSAPI';
import { HappyHourService } from '../../services/happyHourService';
import CategoryFilter from './CategoryFilter';
import ProductGrid from './ProductGrid';
import OrderSummary from './OrderSummary';
import POSLayout from './POSLayout';
import PaymentDialog from './PaymentDialog';

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
  // Custom hooks for state management
  const [state, actions] = usePOSState();

  // Custom hook for business logic
  const logic = usePOSLogic(
    products,
    categories,
    state.currentOrder,
    state.selectedCategory,
    state.searchQuery,
    isHappyHourActive
  );

  const handlePaymentComplete = (message: string) => {
    actions.setSnackbar({ open: true, message, severity: 'success' });
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

  const happyHourService = HappyHourService.getInstance();

  const handleApplyHappyHour = useCallback(
    (index: number) => {
      const line = state.currentOrder[index];
      if (!line) return;
      const settings = happyHourService.getSettings();
      const basePrice = line.originalPrice ?? line.unitPrice;
      let discountedPrice: number;
      if (settings.discountType === 'percentage') {
        discountedPrice = basePrice * (1 - (settings.discountValue ?? 0));
      } else {
        discountedPrice = Math.max(0, basePrice - (settings.discountValue ?? 0));
      }
      const taxAmount = discountedPrice * (line.taxRate / (1 + line.taxRate));
      actions.updateLineAt(index, {
        isHappyHourApplied: true,
        isManualHappyHour: true,
        originalPrice: basePrice,
        unitPrice: discountedPrice,
        totalPrice: discountedPrice,
        taxAmount,
      });
    },
    [state.currentOrder, actions, happyHourService]
  );

  const handleApplyOffert = useCallback(
    (index: number) => {
      const line = state.currentOrder[index];
      const desc = line?.description?.trim() ? `${line.description.trim()} [Offert]` : '[Offert]';
      actions.updateLineAt(index, {
        isOffert: true,
        isPerso: false,
        unitPrice: 0,
        totalPrice: 0,
        taxAmount: 0,
        description: desc,
      });
    },
    [state.currentOrder, actions]
  );

  const handleApplyPerso = useCallback(
    (index: number) => {
      const line = state.currentOrder[index];
      const desc = line?.description?.trim() ? `${line.description.trim()} [Perso]` : '[Perso]';
      actions.updateLineAt(index, {
        isPerso: true,
        isOffert: false,
        unitPrice: 0,
        totalPrice: 0,
        taxAmount: 0,
        description: desc,
      });
    },
    [state.currentOrder, actions]
  );

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
          isHappyHourActive={isHappyHourActive}
          onAddToOrder={(item, qty) => handleAddToOrder(item, qty ?? 1)}
          calculateProductPrice={logic.calculateProductPrice}
          formatCurrency={logic.formatCurrency}
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
      onApplyHappyHour={handleApplyHappyHour}
      onApplyOffert={handleApplyOffert}
      onApplyPerso={handleApplyPerso}
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

      {/* Future: Add other dialog components (retour, change, etc.) */}
    </Box>
  );
};

export default POSContainer;
