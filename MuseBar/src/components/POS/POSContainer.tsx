import React, { useCallback } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { Category, Product, OrderItem } from '../../types';
import { usePOSState } from '../../hooks/usePOSState';
import { usePOSLogic } from '../../hooks/usePOSLogic';
import { usePOSAPI } from '../../hooks/usePOSAPI';
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
  const { createOrder } = usePOSAPI(handlePaymentComplete, handlePaymentError, onDataUpdate);

  // Event handlers
  const handleAddToOrder = (item: OrderItem) => {
    // Check if item already exists in order
    const existingIndex = state.currentOrder.findIndex(
      orderItem =>
        orderItem.productId === item.productId &&
        orderItem.isHappyHourApplied === item.isHappyHourApplied
    );

    if (existingIndex >= 0) {
      // Update quantity of existing item
      handleUpdateQuantity(existingIndex, state.currentOrder[existingIndex].quantity + 1);
    } else {
      // Add new item
      actions.addToOrder(item);
    }
  };

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    const updatedOrder = [...state.currentOrder];
    const item = updatedOrder[index];

    item.quantity = newQuantity;
    item.totalPrice = item.unitPrice * newQuantity;
    item.taxAmount = item.totalPrice * (item.taxRate / (1 + item.taxRate));

    actions.setCurrentOrder(updatedOrder);
  };

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
      <CategoryFilter
        categories={categories}
        selectedCategory={state.selectedCategory}
        searchQuery={state.searchQuery}
        onCategorySelect={actions.setSelectedCategory}
        onSearchChange={actions.setSearchQuery}
      />
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <ProductGrid
          products={logic.filteredProducts}
          isHappyHourActive={isHappyHourActive}
          onAddToOrder={handleAddToOrder}
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
      onUpdateQuantity={handleUpdateQuantity}
      formatCurrency={logic.formatCurrency}
    />
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <POSLayout
        menuContent={menuContent}
        orderContent={orderContent}
        orderBadge={state.currentOrder.length}
      />

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
