import { useCallback, useMemo, useState } from 'react';
import { OrderItem } from '../types';
import { useSnackbar } from './useSnackbar';

export interface POSState {
  selectedCategory: string;
  searchQuery: string;
  currentOrder: OrderItem[];
  paymentDialogOpen: boolean;
  mobileView: 'menu' | 'order';
  changeDialogOpen: boolean;
  changeAmount: string;
  changeDirection: 'card-to-cash' | 'cash-to-card';
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  };
}

export interface POSActions {
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setCurrentOrder: (order: OrderItem[]) => void;
  addToOrder: (item: OrderItem) => void;
  addLinesToOrder: (items: OrderItem[]) => void;
  removeFromOrder: (index: number) => void;
  updateLineAt: (index: number, updates: Partial<OrderItem>) => void;
  clearOrder: () => void;
  setPaymentDialogOpen: (open: boolean) => void;
  setMobileView: (view: 'menu' | 'order') => void;
  setChangeDialogOpen: (open: boolean) => void;
  setChangeAmount: (amount: string) => void;
  setChangeDirection: (direction: 'card-to-cash' | 'cash-to-card') => void;
  setSnackbar: (snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  closeSnackbar: () => void;
}

export const usePOSState = (): [POSState, POSActions] => {
  const snackbarApi = useSnackbar();

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'menu' | 'order'>('menu');
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [changeDirection, setChangeDirection] = useState<'card-to-cash' | 'cash-to-card'>(
    'card-to-cash'
  );

  const addToOrder = useCallback((item: OrderItem) => {
    setCurrentOrder(prev => [...prev, item]);
  }, []);

  const addLinesToOrder = useCallback((items: OrderItem[]) => {
    if (items.length === 0) return;
    setCurrentOrder(prev => [...prev, ...items]);
  }, []);

  const removeFromOrder = useCallback((index: number) => {
    setCurrentOrder(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateLineAt = useCallback((index: number, updates: Partial<OrderItem>) => {
    setCurrentOrder(prev =>
      prev.map((line, i) => (i === index ? { ...line, ...updates } : line))
    );
  }, []);

  const clearOrder = useCallback(() => {
    setCurrentOrder([]);
  }, []);

  const state: POSState = useMemo(
    () => ({
      selectedCategory,
      searchQuery,
      currentOrder,
      paymentDialogOpen,
      mobileView,
      changeDialogOpen,
      changeAmount,
      changeDirection,
      snackbar: snackbarApi.snackbar,
    }),
    [
      selectedCategory,
      searchQuery,
      currentOrder,
      paymentDialogOpen,
      mobileView,
      changeDialogOpen,
      changeAmount,
      changeDirection,
      snackbarApi.snackbar,
    ]
  );

  const actions: POSActions = useMemo(
    () => ({
      setSelectedCategory,
      setSearchQuery,
      setCurrentOrder,
      addToOrder,
      addLinesToOrder,
      removeFromOrder,
      updateLineAt,
      clearOrder,
      setPaymentDialogOpen,
      setMobileView,
      setChangeDialogOpen,
      setChangeAmount,
      setChangeDirection,
      setSnackbar: snackbarApi.setSnackbar,
      showSuccess: snackbarApi.showSuccess,
      showError: snackbarApi.showError,
      closeSnackbar: snackbarApi.closeSnackbar,
    }),
    [
      addToOrder,
      addLinesToOrder,
      removeFromOrder,
      updateLineAt,
      clearOrder,
      snackbarApi.setSnackbar,
      snackbarApi.showSuccess,
      snackbarApi.showError,
      snackbarApi.closeSnackbar,
    ]
  );

  return [state, actions];
};
