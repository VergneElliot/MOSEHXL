import { useState } from 'react';
import { OrderItem, LocalSubBill } from '../types';

export interface POSState {
  // Order management
  selectedCategory: string;
  searchQuery: string;
  currentOrder: OrderItem[];
  
  // Payment states
  paymentDialogOpen: boolean;
  checkoutMode: 'simple' | 'split-equal' | 'split-items';
  splitCount: number;
  subBills: LocalSubBill[];
  currentPaymentMethod: 'cash' | 'card' | 'split';
  cashAmount: string;
  cardAmount: string;
  tips: string;
  
  // UI states
  mobileView: 'menu' | 'order';
  itemQuantities: { [productId: string]: number };
  
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
  
  // Payment actions
  setPaymentDialogOpen: (open: boolean) => void;
  setCheckoutMode: (mode: 'simple' | 'split-equal' | 'split-items') => void;
  setSplitCount: (count: number) => void;
  setSubBills: (bills: LocalSubBill[]) => void;
  setCurrentPaymentMethod: (method: 'cash' | 'card' | 'split') => void;
  setCashAmount: (amount: string) => void;
  setCardAmount: (amount: string) => void;
  setTips: (tips: string) => void;
  
  // UI actions
  setMobileView: (view: 'menu' | 'order') => void;
  setItemQuantities: (quantities: { [productId: string]: number }) => void;
  
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
  setSnackbar: (snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'info' }) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export const usePOSState = (): [POSState, POSActions] => {
  // Order management state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  
  // Payment states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'simple' | 'split-equal' | 'split-items'>('simple');
  const [splitCount, setSplitCount] = useState(2);
  const [subBills, setSubBills] = useState<LocalSubBill[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<'cash' | 'card' | 'split'>('card');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [tips, setTips] = useState('');
  
  // UI states
  const [mobileView, setMobileView] = useState<'menu' | 'order'>('menu');
  const [itemQuantities, setItemQuantities] = useState<{ [productId: string]: number }>({});
  
  // Dialog states
  const [retourDialogOpen, setRetourDialogOpen] = useState(false);
  const [retourItem, setRetourItem] = useState<OrderItem | null>(null);
  const [retourReason, setRetourReason] = useState('');
  const [retourPaymentMethod, setRetourPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [retourLoading, setRetourLoading] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [changeDirection, setChangeDirection] = useState<'card-to-cash' | 'cash-to-card'>('card-to-cash');
  
  // Notification state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info'
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
    setTips('');
    setCashAmount('');
    setCardAmount('');
    setSubBills([]);
    setCheckoutMode('simple');
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
    checkoutMode,
    splitCount,
    subBills,
    currentPaymentMethod,
    cashAmount,
    cardAmount,
    tips,
    mobileView,
    itemQuantities,
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
    setCheckoutMode,
    setSplitCount,
    setSubBills,
    setCurrentPaymentMethod,
    setCashAmount,
    setCardAmount,
    setTips,
    setMobileView,
    setItemQuantities,
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