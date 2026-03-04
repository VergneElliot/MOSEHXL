import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Fab,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useClosureState } from '../../hooks/useClosureState';
import { useClosureAPI } from '../../hooks/useClosureAPI';
import ClosureStatusCards from './ClosureStatusCards';
import BulletinsTable from './BulletinsTable';
import { formatCurrency } from '../../utils/formatCurrency';

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
  useEffect(() => {
    api.refreshAllData();
  }, [api]);

  // Event handlers
  const handleCreateClosure = () => {
    actions.setShowCreateDialog(true);
  };

  const handleCloseSnackbar = () => {
    actions.closeSnackbar();
  };

  const handleViewDetails = (bulletin: any) => {
    actions.setSelectedBulletin(bulletin);
    actions.setShowDetailsDialog(true);
  };

  const handlePrint = (bulletin: any) => {
    actions.setPrintBulletin(bulletin);
    actions.setPrintDialogOpen(true);
  };

  const handleDownload = (bulletin: any) => {
    // Future: Implement download functionality
  };

  // Utility functions
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR');
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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} component="h1" gutterBottom>
          🔒 Bulletins de Clôture
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Gestion des clôtures légales et conformité fiscale française
        </Typography>
      </Box>

      {/* Error Alert */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => actions.setError(null)}>
          {state.error}
        </Alert>
      )}

      {/* Status Cards */}
      <ClosureStatusCards
        todayStatus={state.todayStatus as any}
        monthlyStats={state.monthlyStats as any}
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

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="Créer une clôture"
        onClick={handleCreateClosure}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        <Tooltip title="Créer un bulletin de clôture">
          <Add />
        </Tooltip>
      </Fab>

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

              {/* Future: Add Create Closure Dialog */}
        {/* Future: Add Bulletin Details Dialog */}
        {/* Future: Add Print Dialog */}
        {/* Future: Add Settings Dialog */}
    </Box>
  );
};

export default ClosureContainer;
