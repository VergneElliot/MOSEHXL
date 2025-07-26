import { useState } from 'react';

export interface ClosureBulletin {
  id: number;
  closure_type: 'DAILY' | 'MONTHLY' | 'ANNUAL';
  period_start: string;
  period_end: string;
  total_transactions: number;
  total_amount: number;
  total_vat: number;
  vat_breakdown: {
    vat_10: { amount: number; vat: number };
    vat_20: { amount: number; vat: number };
  };
  payment_methods_breakdown: { [key: string]: number };
  first_sequence: number;
  last_sequence: number;
  closure_hash: string;
  is_closed: boolean;
  closed_at: string | null;
  created_at: string;
  tips_total?: number;
  change_total?: number;
}

export interface ClosureState {
  // Data state
  bulletins: ClosureBulletin[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  todayStatus: any;
  closureSettings: any;
  monthlyStats: any;
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
  setTodayStatus: (status: any) => void;
  setClosureSettings: (settings: any) => void;
  setMonthlyStats: (stats: any) => void;
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
  setSnackbar: (snackbar: { open: boolean; message: string; severity: 'success' | 'error' }) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  closeSnackbar: () => void;
  
  // Utility actions
  addBulletin: (bulletin: ClosureBulletin) => void;
  clearMessages: () => void;
}

export const useClosureState = (): [ClosureState, ClosureActions] => {
  // Data state
  const [bulletins, setBulletins] = useState<ClosureBulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [closureSettings, setClosureSettings] = useState<any>({});
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
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
  const [selectedClosureType, setSelectedClosureType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL'>('DAILY');
  
  // UI state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Helper actions
  const openBulletinDetails = (bulletin: ClosureBulletin) => {
    setSelectedBulletin(bulletin);
    setShowDetailsDialog(true);
  };

  const closeBulletinDetails = () => {
    setShowDetailsDialog(false);
    setSelectedBulletin(null);
  };

  const openPrintDialog = (bulletin: ClosureBulletin) => {
    setPrintBulletin(bulletin);
    setPrintDialogOpen(true);
  };

  const closePrintDialog = () => {
    setPrintDialogOpen(false);
    setPrintBulletin(null);
  };

  const showSuccess = (message: string) => {
    setSnackbar({ open: true, message, severity: 'success' });
  };

  const showError = (message: string) => {
    setSnackbar({ open: true, message, severity: 'error' });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const addBulletin = (bulletin: ClosureBulletin) => {
    setBulletins(prev => [bulletin, ...prev]);
  };

  const clearMessages = () => {
    setError(null);
    setMonthlyStatsError(null);
    closeSnackbar();
  };

  const state: ClosureState = {
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
    snackbar,
  };

  const actions: ClosureActions = {
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
    setSnackbar,
    showSuccess,
    showError,
    closeSnackbar,
    addBulletin,
    clearMessages,
  };

  return [state, actions];
}; 