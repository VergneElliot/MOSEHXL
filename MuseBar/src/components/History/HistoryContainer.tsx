import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, Alert, Snackbar, useTheme, useMediaQuery } from '@mui/material';
import { useHistoryState } from '../../hooks/useHistoryState';
import { useHistoryAPI } from '../../hooks/useHistoryAPI';
import { useHistoryLogic } from '../../hooks/useHistoryLogic';
import StatsCards from './StatsCards';
import SearchBar from './SearchBar';
import OrdersTable from './OrdersTable';
import OrderDetailsDialog from './OrderDetailsDialog';
import ReturnDialog from './ReturnDialog';
import { Order } from '../../types';

const HistoryContainer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isShortScreen = useMediaQuery('(max-height: 1080px)');

  // Custom hooks for state management
  const [state, actions] = useHistoryState();

  // Server-side pagination (Backend can paginate orders list)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalOrders, setTotalOrders] = useState(0);

  // Custom hook for business logic
  const logic = useHistoryLogic(state.orders, state.search);

  const getPagination = useCallback(() => {
    return { limit: rowsPerPage, offset: page * rowsPerPage };
  }, [page, rowsPerPage]);

  // Custom hook for API calls
  const api = useHistoryAPI(
    actions.setOrders,
    setTotalOrders,
    actions.setStats,
    actions.setLoading,
    actions.setReturnLoading,
    actions.setReturnSuccess,
    actions.setReturnError,
    actions.closeReturnDialog,
    getPagination
  );

  // Avoid including `api` in effect deps (useHistoryState recreates some callbacks).
  const apiRef = useRef(api);
  apiRef.current = api;

  // Load stats once on mount
  useEffect(() => {
    apiRef.current.loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load orders whenever pagination changes
  useEffect(() => {
    apiRef.current.loadOrders({ limit: rowsPerPage, offset: page * rowsPerPage });
  }, [page, rowsPerPage]);

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

  const handleConfirmReturn = () => {
    if (!state.orderToReturn) return;
    api.processReturn({
      order: state.orderToReturn,
      reason: state.returnReason,
      selectedItems: state.selectedItemsToReturn,
      selectedTip: state.selectedTipToReturn,
      isPartial: state.isPartialReturn,
    });
  };

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: isShortScreen ? 1 : 2 }}>
        <Typography variant={isShortScreen ? 'h5' : (isMobile ? 'h5' : 'h4')} component="h1" gutterBottom>
          📊 Historique des Ventes
        </Typography>
        <Typography variant={isShortScreen ? 'caption' : 'body2'} color="textSecondary">
          Consultez l'historique des commandes, les statistiques de vente et gérez les retours
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ maxHeight: isShortScreen ? '22vh' : 'none', overflowY: isShortScreen ? 'auto' : 'visible', pr: isShortScreen ? 0.5 : 0 }}>
        <StatsCards
          stats={state.stats}
          loading={state.loading}
          formatCurrency={logic.formatCurrency}
        />
      </Box>

      {/* Search Bar */}
      <SearchBar
        search={state.search}
        onSearchChange={(newSearch) => {
          actions.setSearch(newSearch);
          setPage(0);
        }}
      />

      {/* Orders Table */}
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
        <OrdersTable
          orders={logic.filteredOrders}
          loading={state.loading}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={state.search ? logic.filteredOrders.length : totalOrders}
          onPageChange={setPage}
          onRowsPerPageChange={(newRowsPerPage) => {
            setRowsPerPage(newRowsPerPage);
            setPage(0);
          }}
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

      {/* Order details dialog (view) */}
      <OrderDetailsDialog
        order={state.selectedOrder}
        onClose={() => actions.setSelectedOrder(null)}
        formatDateTime={logic.formatDateTime}
        getPaymentMethodLabel={logic.getPaymentMethodLabel}
      />

      {/* Return / cancellation dialog */}
      <ReturnDialog
        open={state.returnDialogOpen}
        order={state.orderToReturn}
        reason={state.returnReason}
        onReasonChange={actions.setReturnReason}
        isPartial={state.isPartialReturn}
        onPartialChange={actions.setIsPartialReturn}
        selectedItemIds={state.selectedItemsToReturn}
        onSelectedItemIdsChange={actions.setSelectedItemsToReturn}
        selectedTip={state.selectedTipToReturn}
        onSelectedTipChange={actions.setSelectedTipToReturn}
        onConfirm={handleConfirmReturn}
        onClose={actions.closeReturnDialog}
        loading={state.returnLoading}
        errorMessage={state.returnError}
        formatDateTime={logic.formatDateTime}
      />
    </Box>
  );
};

export default HistoryContainer;
