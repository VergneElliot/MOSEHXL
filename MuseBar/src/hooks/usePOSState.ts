import { useState } from 'react';
import { OrderItem } from '../types';
import { useSnackbar } from './useSnackbar';

export interface POSState {
  // Order management
  selectedCategory: string;
  searchQuery: string;
  currentOrder: OrderItem[];

  // Payment dialog visibility (payment form state lives in PaymentDialog/usePaymentState)
  paymentDialogOpen: boolean;

  // UI states
  mobileView: 'menu' | 'order';

  // Dialog states
  changeDialogOpen: boolean;
  changeAmount: string;
  changeDirection: 'card-to-cash' | 'cash-to-card';

  // Notification state
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  };
}

export interface POSActions {
  // Order actions
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setCurrentOrder: (order: OrderItem[]) => void;
  addToOrder: (item: OrderItem) => void;
  removeFromOrder: (index: number) => void;
  updateLineAt: (index: number, updates: Partial<OrderItem>) => void;
  clearOrder: () => void;

  // Payment dialog
  setPaymentDialogOpen: (open: boolean) => void;

  // UI actions
  setMobileView: (view: 'menu' | 'order') => void;

  // Dialog actions
  setChangeDialogOpen: (open: boolean) => void;
  setChangeAmount: (amount: string) => void;
  setChangeDirection: (direction: 'card-to-cash' | 'cash-to-card') => void;

  // Notification actions
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

  // Order management state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);

  // Payment dialog visibility
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // UI states
  const [mobileView, setMobileView] = useState<'menu' | 'order'>('menu');

  // Dialog states
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [changeDirection, setChangeDirection] = useState<'card-to-cash' | 'cash-to-card'>(
    'card-to-cash'
  );

  // Order actions
  const addToOrder = (item: OrderItem) => {
    setCurrentOrder(prev => [...prev, item]);
  };

  const removeFromOrder = (index: number) => {
    setCurrentOrder(prev => prev.filter((_, i) => i !== index));
  };

  const updateLineAt = (index: number, updates: Partial<OrderItem>) => {
    setCurrentOrder(prev =>
      prev.map((line, i) => (i === index ? { ...line, ...updates } : line))
    );
  };

  const clearOrder = () => {
    setCurrentOrder([]);
  };

  const state: POSState = {
    selectedCategory,
    searchQuery,
    currentOrder,
    paymentDialogOpen,
    mobileView,
    changeDialogOpen,
    changeAmount,
    changeDirection,
    snackbar: snackbarApi.snackbar,
  };

  const actions: POSActions = {
    setSelectedCategory,
    setSearchQuery,
    setCurrentOrder,
    addToOrder,
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
  };

  return [state, actions];
};
