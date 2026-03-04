import { useState } from 'react';

export type SnackbarSeverity = 'success' | 'error' | 'info';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

const initialSnackbar: SnackbarState = {
  open: false,
  message: '',
  severity: 'success',
};

export interface UseSnackbarReturn {
  snackbar: SnackbarState;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  closeSnackbar: () => void;
  setSnackbar: (snackbar: SnackbarState | ((prev: SnackbarState) => SnackbarState)) => void;
}

/**
 * Shared snackbar state and actions.
 * Use this in any hook or component that needs to show success/error toasts
 * instead of duplicating open/message/severity state and showSuccess/showError/closeSnackbar.
 */
export function useSnackbar(): UseSnackbarReturn {
  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);

  const showSuccess = (message: string) => {
    setSnackbar({ open: true, message, severity: 'success' });
  };

  const showError = (message: string) => {
    setSnackbar({ open: true, message, severity: 'error' });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return {
    snackbar,
    showSuccess,
    showError,
    closeSnackbar,
    setSnackbar,
  };
}
