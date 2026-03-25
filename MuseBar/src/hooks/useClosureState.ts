import { useCallback, useMemo, useState } from 'react';
import { useSnackbar } from './useSnackbar';
import type { ClosureBulletin, ClosureTodayStatus, LiveMonthlyStats } from '../types';

export type { ClosureBulletin };

export interface ClosureState {
  // Data state
  bulletins: ClosureBulletin[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  todayStatus: ClosureTodayStatus | null;
  closureSettings: Record<string, string>;
  monthlyStats: LiveMonthlyStats | null;
  monthlyStatsError: string | null;

  // Dialog state
  showCreateDialog: boolean;
  selectedBulletin: ClosureBulletin | null;
  showDetailsDialog: boolean;
  settingsOpen: boolean;
  printDialogOpen: boolean;
  printBulletin: ClosureBulletin | null;

  // Form state
  selectedDate: string;
  filterType: string;
  selectedClosureType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';

  // UI state
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  };
}

export interface ClosureActions {
  // Data actions
  setBulletins: (bulletins: ClosureBulletin[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCreating: (creating: boolean) => void;
  setTodayStatus: (status: ClosureTodayStatus | null) => void;
  setClosureSettings: (settings: Record<string, string>) => void;
  setMonthlyStats: (stats: LiveMonthlyStats | null) => void;
  setMonthlyStatsError: (error: string | null) => void;

  // Dialog actions
  setShowCreateDialog: (show: boolean) => void;
  setSelectedBulletin: (bulletin: ClosureBulletin | null) => void;
  setShowDetailsDialog: (show: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setPrintDialogOpen: (open: boolean) => void;
  setPrintBulletin: (bulletin: ClosureBulletin | null) => void;
  openBulletinDetails: (bulletin: ClosureBulletin) => void;
  closeBulletinDetails: () => void;
  openPrintDialog: (bulletin: ClosureBulletin) => void;
  closePrintDialog: () => void;

  // Form actions
  setSelectedDate: (date: string) => void;
  setFilterType: (type: string) => void;
  setSelectedClosureType: (type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL') => void;

  // UI actions
  setSnackbar: (snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  closeSnackbar: () => void;

  // Utility actions
  addBulletin: (bulletin: ClosureBulletin) => void;
  clearMessages: () => void;
}

export const useClosureState = (): [ClosureState, ClosureActions] => {
  const snackbarApi = useSnackbar();

  // Data state
  const [bulletins, setBulletins] = useState<ClosureBulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [todayStatus, setTodayStatus] = useState<ClosureTodayStatus | null>(null);
  const [closureSettings, setClosureSettings] = useState<Record<string, string>>({});
  const [monthlyStats, setMonthlyStats] = useState<LiveMonthlyStats | null>(null);
  const [monthlyStatsError, setMonthlyStatsError] = useState<string | null>(null);

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<ClosureBulletin | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printBulletin, setPrintBulletin] = useState<ClosureBulletin | null>(null);

  // Form state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedClosureType, setSelectedClosureType] = useState<
    'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL'
  >('DAILY');

  // Helper actions
  const openBulletinDetails = useCallback(
    (bulletin: ClosureBulletin) => {
      setSelectedBulletin(bulletin);
      setShowDetailsDialog(true);
    },
    [setSelectedBulletin, setShowDetailsDialog]
  );

  const closeBulletinDetails = useCallback(() => {
    setShowDetailsDialog(false);
    setSelectedBulletin(null);
  }, [setShowDetailsDialog, setSelectedBulletin]);

  const openPrintDialog = useCallback(
    (bulletin: ClosureBulletin) => {
      setPrintBulletin(bulletin);
      setPrintDialogOpen(true);
    },
    [setPrintBulletin, setPrintDialogOpen]
  );

  const closePrintDialog = useCallback(() => {
    setPrintDialogOpen(false);
    setPrintBulletin(null);
  }, [setPrintDialogOpen, setPrintBulletin]);

  const addBulletin = useCallback((bulletin: ClosureBulletin) => {
    setBulletins(prev => [bulletin, ...prev]);
  }, [setBulletins]);

  const clearMessages = useCallback(() => {
    setError(null);
    setMonthlyStatsError(null);
    snackbarApi.closeSnackbar();
  }, [snackbarApi]);

  const state: ClosureState = useMemo(
    () => ({
      bulletins,
      loading,
      error,
      creating,
      todayStatus,
      closureSettings,
      monthlyStats,
      monthlyStatsError,
      showCreateDialog,
      selectedBulletin,
      showDetailsDialog,
      settingsOpen,
      printDialogOpen,
      printBulletin,
      selectedDate,
      filterType,
      selectedClosureType,
      snackbar: snackbarApi.snackbar as ClosureState['snackbar'],
    }),
    [
      bulletins,
      loading,
      error,
      creating,
      todayStatus,
      closureSettings,
      monthlyStats,
      monthlyStatsError,
      showCreateDialog,
      selectedBulletin,
      showDetailsDialog,
      settingsOpen,
      printDialogOpen,
      printBulletin,
      selectedDate,
      filterType,
      selectedClosureType,
      snackbarApi.snackbar,
    ]
  );

  const actions: ClosureActions = useMemo(
    () => ({
      setBulletins,
      setLoading,
      setError,
      setCreating,
      setTodayStatus,
      setClosureSettings,
      setMonthlyStats,
      setMonthlyStatsError,
      setShowCreateDialog,
      setSelectedBulletin,
      setShowDetailsDialog,
      setSettingsOpen,
      setPrintDialogOpen,
      setPrintBulletin,
      openBulletinDetails,
      closeBulletinDetails,
      openPrintDialog,
      closePrintDialog,
      setSelectedDate,
      setFilterType,
      setSelectedClosureType,
      setSnackbar: snackbarApi.setSnackbar,
      showSuccess: snackbarApi.showSuccess,
      showError: snackbarApi.showError,
      closeSnackbar: snackbarApi.closeSnackbar,
      addBulletin,
      clearMessages,
    }),
    [
      setBulletins,
      setLoading,
      setError,
      setCreating,
      setTodayStatus,
      setClosureSettings,
      setMonthlyStats,
      setMonthlyStatsError,
      setShowCreateDialog,
      setSelectedBulletin,
      setShowDetailsDialog,
      setSettingsOpen,
      setPrintDialogOpen,
      setPrintBulletin,
      openBulletinDetails,
      closeBulletinDetails,
      openPrintDialog,
      closePrintDialog,
      setSelectedDate,
      setFilterType,
      setSelectedClosureType,
      snackbarApi.setSnackbar,
      snackbarApi.showSuccess,
      snackbarApi.showError,
      snackbarApi.closeSnackbar,
      addBulletin,
      clearMessages,
    ]
  );

  return [state, actions];
};
