import { useState } from 'react';
import { OrderItem } from '../types';

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
  retourDialogOpen: boolean;
  retourItem: OrderItem | null;
  retourReason: string;
  retourPaymentMethod: 'cash' | 'card';
  retourLoading: boolean;
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
  clearOrder: () => void;

  // Payment dialog
  setPaymentDialogOpen: (open: boolean) => void;

  // UI actions
  setMobileView: (view: 'menu' | 'order') => void;

  // Dialog actions
  setRetourDialogOpen: (open: boolean) => void;
  setRetourItem: (item: OrderItem | null) => void;
  setRetourReason: (reason: string) => void;
  setRetourPaymentMethod: (method: 'cash' | 'card') => void;
  setRetourLoading: (loading: boolean) => void;
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
}

export const usePOSState = (): [POSState, POSActions] => {
  // Order management state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);

  // Payment dialog visibility
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // UI states
  const [mobileView, setMobileView] = useState<'menu' | 'order'>('menu');

  // Dialog states
  const [retourDialogOpen, setRetourDialogOpen] = useState(false);
  const [retourItem, setRetourItem] = useState<OrderItem | null>(null);
  const [retourReason, setRetourReason] = useState('');
  const [retourPaymentMethod, setRetourPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [retourLoading, setRetourLoading] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [changeDirection, setChangeDirection] = useState<'card-to-cash' | 'cash-to-card'>(
    'card-to-cash'
  );

  // Notification state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

  // Order actions
  const addToOrder = (item: OrderItem) => {
    setCurrentOrder(prev => [...prev, item]);
  };

  const removeFromOrder = (index: number) => {
    setCurrentOrder(prev => prev.filter((_, i) => i !== index));
  };

  const clearOrder = () => {
    setCurrentOrder([]);
  };

  // Notification helpers
  const showSuccess = (message: string) => {
    setSnackbar({ open: true, message, severity: 'success' });
  };

  const showError = (message: string) => {
    setSnackbar({ open: true, message, severity: 'error' });
  };

  const state: POSState = {
    selectedCategory,
    searchQuery,
    currentOrder,
    paymentDialogOpen,
    mobileView,
    retourDialogOpen,
    retourItem,
    retourReason,
    retourPaymentMethod,
    retourLoading,
    changeDialogOpen,
    changeAmount,
    changeDirection,
    snackbar,
  };

  const actions: POSActions = {
    setSelectedCategory,
    setSearchQuery,
    setCurrentOrder,
    addToOrder,
    removeFromOrder,
    clearOrder,
    setPaymentDialogOpen,
    setMobileView,
    setRetourDialogOpen,
    setRetourItem,
    setRetourReason,
    setRetourPaymentMethod,
    setRetourLoading,
    setChangeDialogOpen,
    setChangeAmount,
    setChangeDirection,
    setSnackbar,
    showSuccess,
    showError,
  };

  return [state, actions];
};
