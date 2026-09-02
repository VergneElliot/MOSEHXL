import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
} from '@mui/material';
import { useHistoryState } from '../../hooks/useHistoryState';
import { useHistoryAPI } from '../../hooks/useHistoryAPI';
import { useHistoryLogic } from '../../hooks/useHistoryLogic';
import StatsCards from './StatsCards';
import SearchBar from './SearchBar';
import OrdersTable from './OrdersTable';
import OrderDetailsDialog from './OrderDetailsDialog';
import ReturnDialog from './ReturnDialog';
import PrintAfterSaleDialog from '../POS/PrintAfterSaleDialog';
import WaiterDayReportPanel from './WaiterDayReportPanel';
import OngoingOrdersPanel from './OngoingOrdersPanel';
import { Order } from '../../types';
import { useStepUpAuth } from '../../contexts/StepUpAuthContext';
import { PERMISSIONS } from '@mosehxl/types';

interface HistoryContainerProps {
  /** Backend permission `orders_cancel` (establishment admin has all permissions from API). */
  canCancelOrReturn?: boolean;
}

const HistoryContainer: React.FC<HistoryContainerProps> = ({ canCancelOrReturn = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { ensurePermission } = useStepUpAuth();

  const [state, actions] = useHistoryState();
  const [sectionTab, setSectionTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalOrders, setTotalOrders] = useState(0);
  const [waiterUserId, setWaiterUserId] = useState<number | ''>('');
  const [waiters, setWaiters] = useState<
    Array<{ waiter_user_id: number; waiter_display_name: string }>
  >([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const logic = useHistoryLogic();

  const getPagination = useCallback(() => {
    return { limit: rowsPerPage, offset: page * rowsPerPage };
  }, [page, rowsPerPage]);

  const getWaiterUserId = useCallback(() => {
    return waiterUserId === '' ? undefined : waiterUserId;
  }, [waiterUserId]);

  const getSearch = useCallback(() => debouncedSearch, [debouncedSearch]);

  const api = useHistoryAPI(
    actions.setOrders,
    setTotalOrders,
    actions.setStats,
    actions.setLoading,
    actions.setReturnLoading,
    actions.setReturnSuccess,
    actions.setReturnError,
    actions.closeReturnDialog,
    getPagination,
    getWaiterUserId,
    getSearch
  );

  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(state.search), 300);
    return () => window.clearTimeout(t);
  }, [state.search]);

  useEffect(() => {
    apiRef.current.loadStats();
    void import('../../services/api/floor')
      .then((mod) => mod.listOrderWaiters())
      .then(setWaiters)
      .catch(() => setWaiters([]));
  }, []);

  useEffect(() => {
    if (sectionTab !== 0) return;
    apiRef.current.loadOrders({ limit: rowsPerPage, offset: page * rowsPerPage });
  }, [page, rowsPerPage, waiterUserId, debouncedSearch, sectionTab]);

  const handleViewOrder = (order: Order) => {
    actions.setSelectedOrder(order);
  };

  const handlePrintReceipt = (order: Order) => {
    actions.openReceiptDialog(order);
  };

  const handleReturnOrder = (order: Order) => {
    void ensurePermission(PERMISSIONS.orders_cancel, {
      title: 'Annulation / retour',
      description: 'PIN d’un profil autorisé à annuler ou retourner une vente.',
    })
      .then(() => actions.openReturnDialog(order))
      .catch(() => {
        /* cancelled */
      });
  };

  const handleCloseSnackbar = () => {
    actions.clearMessages();
  };

  const handleConfirmReturn = () => {
    if (!state.orderToReturn) return;
    void ensurePermission(PERMISSIONS.orders_cancel, {
      title: 'Confirmer l’annulation',
      description: 'PIN d’un profil autorisé à confirmer l’annulation / retour.',
    })
      .then(() => {
        api.processReturn({
          order: state.orderToReturn!,
          reason: state.returnReason,
          selectedItems: state.selectedItemsToReturn,
          selectedTip: state.selectedTipToReturn,
          isPartial: state.isPartialReturn,
        });
      })
      .catch(() => {
        /* cancelled */
      });
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} component="h1" gutterBottom>
          Historique
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Ventes encaissées et commandes en cours sur le plan de salle
        </Typography>
      </Box>

      <Tabs
        value={sectionTab}
        onChange={(_e, v) => setSectionTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Ventes" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab label="En cours" sx={{ textTransform: 'none', fontWeight: 600 }} />
      </Tabs>

      {sectionTab === 0 && (
        <>
          <StatsCards
            stats={state.stats}
            loading={state.loading}
            formatCurrency={logic.formatCurrency}
          />

          <WaiterDayReportPanel />

          <SearchBar
            search={state.search}
            onSearchChange={(newSearch) => {
              actions.setSearch(newSearch);
              setPage(0);
            }}
            placeholder="Rechercher : n° ticket, n° cuisine, montant, article, serveur, table…"
            waiterUserId={waiterUserId}
            waiters={waiters}
            onWaiterChange={(id) => {
              setPage(0);
              setWaiterUserId(id);
            }}
          />

          <OrdersTable
            orders={state.orders}
            loading={state.loading}
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalOrders}
            onPageChange={setPage}
            onRowsPerPageChange={(newRowsPerPage) => {
              setRowsPerPage(newRowsPerPage);
              setPage(0);
            }}
            onViewOrder={handleViewOrder}
            onPrintReceipt={handlePrintReceipt}
            onReturnOrder={handleReturnOrder}
            canReturnOrCancel={canCancelOrReturn}
            formatCurrency={logic.formatCurrency}
            formatDateTime={logic.formatDateTime}
            getPaymentMethodLabel={logic.getPaymentMethodLabel}
            getStatusColor={logic.getStatusColor}
            getOrderSummary={logic.getOrderSummary}
          />

          {state.search && !state.loading && (
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary" align="center">
                {totalOrders} résultat{totalOrders > 1 ? 's' : ''} pour « {state.search} »
              </Typography>
            </Box>
          )}
        </>
      )}

      {sectionTab === 1 && <OngoingOrdersPanel />}

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

      <OrderDetailsDialog
        order={state.selectedOrder}
        onClose={() => actions.setSelectedOrder(null)}
        formatDateTime={logic.formatDateTime}
        getPaymentMethodLabel={logic.getPaymentMethodLabel}
      />

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

      <PrintAfterSaleDialog
        open={state.receiptDialogOpen}
        orderId={state.currentReceipt?.id ?? null}
        autoCloseEnabled={false}
        onClose={actions.closeReceiptDialog}
      />
    </Box>
  );
};

export default HistoryContainer;
