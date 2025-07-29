import { useState } from 'react';
import { Order } from '../types';

export interface HistoryStats {
  caJour: number;
  ventesJour: number;
  topProduits: Array<{ name: string; qty: number }>;
  cardTotal: number;
  cashTotal: number;
  businessDayPeriod: any;
}

export interface HistoryState {
  // Data state
  search: string;
  orders: Order[];
  selectedOrder: Order | null;
  loading: boolean;
  stats: HistoryStats;

  // Receipt dialog state
  receiptDialogOpen: boolean;
  currentReceipt: any;
  receiptType: 'detailed' | 'summary';

  // Return dialog state
  returnDialogOpen: boolean;
  orderToReturn: Order | null;
  returnReason: string;
  selectedItemsToReturn: string[];
  selectedTipToReturn: boolean;
  isPartialReturn: boolean;
  returnLoading: boolean;
  returnSuccess: string;
  returnError: string;
}

export interface HistoryActions {
  // Data actions
  setSearch: (search: string) => void;
  setOrders: (orders: Order[]) => void;
  setSelectedOrder: (order: Order | null) => void;
  setLoading: (loading: boolean) => void;
  setStats: (stats: HistoryStats) => void;

  // Receipt actions
  setReceiptDialogOpen: (open: boolean) => void;
  setCurrentReceipt: (receipt: any) => void;
  setReceiptType: (type: 'detailed' | 'summary') => void;
  openReceiptDialog: (order: Order, type: 'detailed' | 'summary') => void;
  closeReceiptDialog: () => void;

  // Return actions
  setReturnDialogOpen: (open: boolean) => void;
  setOrderToReturn: (order: Order | null) => void;
  setReturnReason: (reason: string) => void;
  setSelectedItemsToReturn: (items: string[]) => void;
  setSelectedTipToReturn: (selected: boolean) => void;
  setIsPartialReturn: (partial: boolean) => void;
  setReturnLoading: (loading: boolean) => void;
  setReturnSuccess: (message: string) => void;
  setReturnError: (error: string) => void;
  openReturnDialog: (order: Order) => void;
  closeReturnDialog: () => void;

  // Utility actions
  clearMessages: () => void;
}

export const useHistoryState = (): [HistoryState, HistoryActions] => {
  // Data state
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<HistoryStats>({
    caJour: 0,
    ventesJour: 0,
    topProduits: [],
    cardTotal: 0,
    cashTotal: 0,
    businessDayPeriod: null,
  });

  // Receipt dialog state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [receiptType, setReceiptType] = useState<'detailed' | 'summary'>('detailed');

  // Return dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [orderToReturn, setOrderToReturn] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [selectedItemsToReturn, setSelectedItemsToReturn] = useState<string[]>([]);
  const [selectedTipToReturn, setSelectedTipToReturn] = useState<boolean>(false);
  const [isPartialReturn, setIsPartialReturn] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState('');
  const [returnError, setReturnError] = useState('');

  // Receipt helper actions
  const openReceiptDialog = (order: Order, type: 'detailed' | 'summary') => {
    setCurrentReceipt(order);
    setReceiptType(type);
    setReceiptDialogOpen(true);
  };

  const closeReceiptDialog = () => {
    setReceiptDialogOpen(false);
    setCurrentReceipt(null);
  };

  // Return helper actions
  const openReturnDialog = (order: Order) => {
    if (order.status !== 'completed') {
      setReturnError("Seules les commandes terminées peuvent faire l'objet d'un retour");
      return;
    }
    setOrderToReturn(order);
    setReturnDialogOpen(true);
    setReturnReason('');
    setSelectedItemsToReturn([]);
    setSelectedTipToReturn(false);
    setIsPartialReturn(false);
    setReturnError('');
    setReturnSuccess('');
  };

  const closeReturnDialog = () => {
    setReturnDialogOpen(false);
    setOrderToReturn(null);
    setReturnReason('');
    setSelectedItemsToReturn([]);
    setSelectedTipToReturn(false);
    setIsPartialReturn(false);
    setReturnLoading(false);
    setReturnError('');
    setReturnSuccess('');
  };

  const clearMessages = () => {
    setReturnSuccess('');
    setReturnError('');
  };

  const state: HistoryState = {
    search,
    orders,
    selectedOrder,
    loading,
    stats,
    receiptDialogOpen,
    currentReceipt,
    receiptType,
    returnDialogOpen,
    orderToReturn,
    returnReason,
    selectedItemsToReturn,
    selectedTipToReturn,
    isPartialReturn,
    returnLoading,
    returnSuccess,
    returnError,
  };

  const actions: HistoryActions = {
    setSearch,
    setOrders,
    setSelectedOrder,
    setLoading,
    setStats,
    setReceiptDialogOpen,
    setCurrentReceipt,
    setReceiptType,
    openReceiptDialog,
    closeReceiptDialog,
    setReturnDialogOpen,
    setOrderToReturn,
    setReturnReason,
    setSelectedItemsToReturn,
    setSelectedTipToReturn,
    setIsPartialReturn,
    setReturnLoading,
    setReturnSuccess,
    setReturnError,
    openReturnDialog,
    closeReturnDialog,
    clearMessages,
  };

  return [state, actions];
};
