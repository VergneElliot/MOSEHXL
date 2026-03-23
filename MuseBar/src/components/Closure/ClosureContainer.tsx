import React, { useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Snackbar,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useClosureState } from '../../hooks/useClosureState';
import { useClosureAPI } from '../../hooks/useClosureAPI';
import ClosureStatusCards from './ClosureStatusCards';
import BulletinsTable from './BulletinsTable';
import CreateClosureDialog, { ClosureType } from './CreateClosureDialog';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateOnly as formatDate } from '../../utils/formatDate';

const ClosureContainer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Custom hooks for state management
  const [state, actions] = useClosureState();

  // Custom hook for API calls
  const api = useClosureAPI(
    actions.setBulletins,
    actions.setLoading,
    actions.setError,
    actions.setCreating,
    actions.setTodayStatus,
    actions.setClosureSettings,
    actions.setMonthlyStats,
    actions.setMonthlyStatsError,
    actions.addBulletin,
    actions.showSuccess,
    actions.showError,
    actions.setShowCreateDialog,
    actions.setSelectedDate
  );

  // Load data on component mount
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    void api.refreshAllData();
  }, [api]);

  // Event handlers
  const handleCreateClosure = () => {
    actions.setShowCreateDialog(true);
  };

  const handleCloseSnackbar = () => {
    actions.closeSnackbar();
  };

  const handleViewDetails = (bulletin: Parameters<typeof actions.setSelectedBulletin>[0]) => {
    actions.setSelectedBulletin(bulletin);
    actions.setShowDetailsDialog(true);
  };

  const handlePrint = (bulletin: Parameters<typeof actions.setPrintBulletin>[0]) => {
    actions.setPrintBulletin(bulletin);
    actions.setPrintDialogOpen(true);
  };

  const handleDownload = (_bulletin: Parameters<typeof actions.setPrintBulletin>[0]) => {
    // Future: Implement download functionality
  };

  const getClosureTypeLabel = (type: string): string => {
    switch (type) {
      case 'DAILY':
        return 'Journalière';
      case 'WEEKLY':
        return 'Hebdomadaire';
      case 'MONTHLY':
        return 'Mensuelle';
      case 'ANNUAL':
        return 'Annuelle';
      default:
        return type;
    }
  };

  const canCreateForToday = state.todayStatus ? !state.todayStatus.has_closure : true;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: isMobile ? 'flex-start' : 'center' }}>
          <Box>
            <Typography variant={isMobile ? 'h5' : 'h4'} component="h1" gutterBottom>
              🔒 Bulletins de Clôture
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Gestion des clôtures légales et conformité fiscale française
            </Typography>
          </Box>

          <Tooltip
            title={
              canCreateForToday
                ? 'Créer un bulletin manuellement (si aucune clôture planifiée pour aujourd’hui)'
                : 'Une clôture journalière est déjà enregistrée pour aujourd’hui'
            }
          >
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={handleCreateClosure}
                disabled={state.loading || !canCreateForToday}
              >
                Créer une clôture
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => actions.setError(null)}>
          {state.error}
        </Alert>
      )}

      {/* Status Cards */}
      <ClosureStatusCards
        todayStatus={state.todayStatus}
        monthlyStats={state.monthlyStats}
        monthlyStatsError={state.monthlyStatsError}
        loading={state.loading}
        formatCurrency={formatCurrency}
      />

      {/* Bulletins Table */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <BulletinsTable
          bulletins={state.bulletins}
          loading={state.loading}
          onViewDetails={handleViewDetails}
          onPrint={handlePrint}
          onDownload={handleDownload}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getClosureTypeLabel={getClosureTypeLabel}
        />
      </Box>

      {/* Success/Error Messages */}
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

      <CreateClosureDialog
        open={state.showCreateDialog}
        onClose={() => actions.setShowCreateDialog(false)}
        onCreate={async ({ date, type }: { date: string; type: ClosureType }) => api.createClosure({ date, type })}
        creating={state.creating}
        selectedDate={state.selectedDate}
        selectedClosureType={state.selectedClosureType}
        onDateChange={actions.setSelectedDate}
        onClosureTypeChange={actions.setSelectedClosureType}
      />

      {/* Future: Add Bulletin Details Dialog */}
        {/* Future: Add Bulletin Details Dialog */}
        {/* Future: Add Print Dialog */}
        {/* Future: Add Settings Dialog */}
    </Box>
  );
};

export default ClosureContainer;
