import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Snackbar,
  Tooltip,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useClosureState } from '../../hooks/useClosureState';
import { useClosureAPI } from '../../hooks/useClosureAPI';
import type { ClosureBulletin } from '../../hooks/useClosureState';
import ClosureStatusCards from './ClosureStatusCards';
import BulletinsTable from './BulletinsTable';
import CreateClosureDialog, { ClosureType } from './CreateClosureDialog';
import PrintClosureDialog from './PrintClosureDialog';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateOnly as formatDate } from '../../utils/formatDate';

const ClosureContainer: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Custom hooks for state management
  const [state, actions] = useClosureState();

  // Server-side pagination for the bulletins list
  const [bulletinsPage, setBulletinsPage] = useState(0);
  const [bulletinsRowsPerPage, setBulletinsRowsPerPage] = useState(10);
  const [totalBulletins, setTotalBulletins] = useState(0);
  const [closureTypeFilter, setClosureTypeFilter] = useState<ClosureType | 'ALL'>('ALL');

  // Custom hook for API calls
  const api = useClosureAPI(
    actions.setBulletins,
    setTotalBulletins,
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

  // Avoid including `api` in effect deps (closure state recreates callbacks).
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    void Promise.all([
      apiRef.current.loadTodayStatus(),
      apiRef.current.loadMonthlyStats(),
    ]);
  }, [api]);

  // Load bulletins whenever pagination changes
  useEffect(() => {
    apiRef.current.loadBulletins({
      limit: bulletinsRowsPerPage,
      offset: bulletinsPage * bulletinsRowsPerPage,
      type: closureTypeFilter === 'ALL' ? undefined : closureTypeFilter,
    });
  }, [bulletinsPage, bulletinsRowsPerPage, closureTypeFilter]);

  // Event handlers
  const handleCreateClosure = () => {
    actions.setShowCreateDialog(true);
  };

  const handleCloseSnackbar = () => {
    actions.closeSnackbar();
  };

  const handleOpenBulletinDialog = (bulletin: ClosureBulletin) => {
    actions.openPrintDialog(bulletin);
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
    <Box sx={{ position: 'relative' }}>
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
              state.todayStatus?.has_closure
                ? 'Une clôture existe déjà aujourd’hui. Utilisez "Forcer la création" dans le dialogue pour créer un bulletin correctif.'
                : 'Créer un bulletin manuellement'
            }
          >
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={handleCreateClosure}
                disabled={state.loading}
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

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="closure-type-filter-label">Type de clôture</InputLabel>
          <Select
            labelId="closure-type-filter-label"
            label="Type de clôture"
            value={closureTypeFilter}
            onChange={e => {
              setClosureTypeFilter(e.target.value as ClosureType | 'ALL');
              setBulletinsPage(0);
            }}
          >
            <MenuItem value="ALL">Toutes</MenuItem>
            <MenuItem value="DAILY">Journalières</MenuItem>
            <MenuItem value="WEEKLY">Hebdomadaires</MenuItem>
            <MenuItem value="MONTHLY">Mensuelles</MenuItem>
            <MenuItem value="ANNUAL">Annuelles</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Bulletins Table */}
      <BulletinsTable
        bulletins={state.bulletins}
        loading={state.loading}
        page={bulletinsPage}
        rowsPerPage={bulletinsRowsPerPage}
        totalCount={totalBulletins}
        onPageChange={setBulletinsPage}
        onRowsPerPageChange={(newRowsPerPage) => {
          setBulletinsRowsPerPage(newRowsPerPage);
          setBulletinsPage(0);
        }}
        onOpenBulletinDialog={handleOpenBulletinDialog}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getClosureTypeLabel={getClosureTypeLabel}
      />

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
        onCreate={async ({ date, type, force, fond_de_caisse }: { date: string; type: ClosureType; force?: boolean; fond_de_caisse: number }) =>
          api.createClosure({ date, type, force, fond_de_caisse })
        }
        creating={state.creating}
        selectedDate={state.selectedDate}
        selectedClosureType={state.selectedClosureType}
        onDateChange={actions.setSelectedDate}
        onClosureTypeChange={actions.setSelectedClosureType}
        disableForceCreation={false}
        defaultFondDeCaisse={state.todayStatus?.last_fond_de_caisse ?? null}
      />

      <PrintClosureDialog
        open={state.printDialogOpen}
        bulletinId={state.printBulletin?.id ?? null}
        onClose={actions.closePrintDialog}
        onPrintSuccess={actions.showSuccess}
        onPrintError={actions.showError}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      {/* Future: Add Settings Dialog */}
    </Box>
  );
};

export default ClosureContainer;
