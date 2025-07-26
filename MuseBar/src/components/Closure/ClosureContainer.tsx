import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Fab,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useClosureState } from '../../hooks/useClosureState';
import { useClosureAPI } from '../../hooks/useClosureAPI';
import ClosureStatusCards from './ClosureStatusCards';

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

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDateTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          component="h1" 
          gutterBottom
        >
          🔒 Bulletins de Clôture
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Gestion des clôtures légales et conformité fiscale française
        </Typography>
      </Box>

      {/* Error Alert */}
      {state.error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => actions.setError(null)}
        >
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

      {/* Bulletins Table will go here */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* TODO: Add BulletinsTable component */}
        <Typography variant="body1" color="textSecondary" align="center" sx={{ py: 4 }}>
          Table des bulletins à implémenter...
        </Typography>
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

      {/* TODO: Add Create Closure Dialog */}
      {/* TODO: Add Bulletin Details Dialog */}
      {/* TODO: Add Print Dialog */}
      {/* TODO: Add Settings Dialog */}
    </Box>
  );
};

export default ClosureContainer; 