import React from 'react';
import { Box, Grid, Snackbar, Alert } from '@mui/material';
import { Category, Product, OrderItem } from '../../types';
import { usePOSState } from '../../hooks/usePOSState';
import { usePOSLogic } from '../../hooks/usePOSLogic';
import CategoryFilter from './CategoryFilter';
import ProductGrid from './ProductGrid';
import OrderSummary from './OrderSummary';
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

  const handleCloseSnackbar = () => {
    actions.setSnackbar({ ...state.snackbar, open: false });
  };

  const handlePaymentComplete = (message: string) => {
    actions.setSnackbar({ open: true, message, severity: 'success' });
  };

  const handlePaymentError = (message: string) => {
    actions.setSnackbar({ open: true, message, severity: 'error' });
  };

  const handleClosePaymentDialog = () => {
    actions.setPaymentDialogOpen(false);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {/* Left side - Products */}
        <Grid item xs={12} md={8}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Category Filter and Search */}
            <CategoryFilter
              categories={categories}
              selectedCategory={state.selectedCategory}
              searchQuery={state.searchQuery}
              onCategorySelect={actions.setSelectedCategory}
              onSearchChange={actions.setSearchQuery}
            />

            {/* Product Grid */}
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <ProductGrid
                products={logic.filteredProducts}
                isHappyHourActive={isHappyHourActive}
                onAddToOrder={handleAddToOrder}
                calculateProductPrice={logic.calculateProductPrice}
                formatCurrency={logic.formatCurrency}
              />
            </Box>
          </Box>
        </Grid>

        {/* Right side - Order Summary */}
        <Grid item xs={12} md={4}>
          <OrderSummary
            currentOrder={state.currentOrder}
            orderTotal={logic.orderTotal}
            orderTax={logic.orderTax}
            orderSubtotal={logic.orderSubtotal}
            canProcessPayment={logic.canProcessPayment}
            onRemoveItem={actions.removeFromOrder}
            onClearOrder={actions.clearOrder}
            onCheckout={handleCheckout}
            onUpdateQuantity={handleUpdateQuantity}
            formatCurrency={logic.formatCurrency}
          />
        </Grid>
      </Grid>

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

      {/* TODO: Add other dialog components (retour, change, etc.) */}
    </Box>
  );
};

export default POSContainer;
