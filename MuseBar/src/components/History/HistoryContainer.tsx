import React, { useEffect } from 'react';
import { Box, Typography, Alert, Snackbar, useTheme, useMediaQuery } from '@mui/material';
import { useHistoryState } from '../../hooks/useHistoryState';
import { useHistoryAPI } from '../../hooks/useHistoryAPI';
import { useHistoryLogic } from '../../hooks/useHistoryLogic';
import StatsCards from './StatsCards';
import SearchBar from './SearchBar';
import OrdersTable from './OrdersTable';
import { Order } from '../../types';

const HistoryContainer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Custom hooks for state management
  const [state, actions] = useHistoryState();

  // Custom hook for business logic
  const logic = useHistoryLogic(state.orders, state.search);

  // Custom hook for API calls
  const api = useHistoryAPI(
    actions.setOrders,
    actions.setStats,
    actions.setLoading,
    actions.setReturnLoading,
    actions.setReturnSuccess,
    actions.setReturnError,
    actions.closeReturnDialog
  );

  // Load data on component mount
  useEffect(() => {
    api.refreshData();
  }, [api]); // Include api dependency

  // Event handlers
  const handleViewOrder = (order: Order) => {
    actions.setSelectedOrder(order);
  };

  const handlePrintReceipt = (order: Order, type: 'detailed' | 'summary') => {
    actions.openReceiptDialog(order, type);
  };

  const handleReturnOrder = (order: Order) => {
    actions.openReturnDialog(order);
  };

  const handleCloseSnackbar = () => {
    actions.clearMessages();
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} component="h1" gutterBottom>
          📊 Historique des Ventes
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Consultez l'historique des commandes, les statistiques de vente et gérez les retours
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <StatsCards
        stats={state.stats}
        loading={state.loading}
        formatCurrency={logic.formatCurrency}
      />

      {/* Search Bar */}
      <SearchBar search={state.search} onSearchChange={actions.setSearch} />

      {/* Orders Table */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <OrdersTable
          orders={logic.filteredOrders}
          loading={state.loading}
          onViewOrder={handleViewOrder}
          onPrintReceipt={handlePrintReceipt}
          onReturnOrder={handleReturnOrder}
          formatCurrency={logic.formatCurrency}
          formatDateTime={logic.formatDateTime}
          getPaymentMethodLabel={logic.getPaymentMethodLabel}
          getStatusColor={logic.getStatusColor}
          getOrderSummary={logic.getOrderSummary}
        />
      </Box>

      {/* Results Summary */}
      {state.search && !state.loading && (
        <Box mt={2}>
          <Typography variant="body2" color="textSecondary" align="center">
            {logic.filteredOrders.length} résultat{logic.filteredOrders.length > 1 ? 's' : ''}{' '}
            trouvé{logic.filteredOrders.length > 1 ? 's' : ''} pour "{state.search}"
          </Typography>
        </Box>
      )}

      {/* Success/Error Messages */}
      <Snackbar
        open={!!state.returnSuccess}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {state.returnSuccess}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!state.returnError}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {state.returnError}
        </Alert>
      </Snackbar>

      {/* TODO: Add Order Details Dialog */}
      {/* TODO: Add Return Dialog Component */}
      {/* TODO: Add Receipt Dialog Component */}
    </Box>
  );
};

export default HistoryContainer;
