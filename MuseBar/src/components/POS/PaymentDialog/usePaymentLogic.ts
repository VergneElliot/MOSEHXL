/**
 * Payment Logic Hook
 * Centralized state management and business logic for payments
 */

import { useState, useCallback, useMemo } from 'react';
import { OrderItem, LocalSubBill } from '../../../types';
import { usePOSAPI } from '../../../hooks/usePOSAPI';
import {
  PaymentState,
  UsePaymentLogicReturn,
  SimplePaymentMethod,
  SplitType,
} from './types';

/**
 * Default payment state
 */
const defaultState: PaymentState = {
  tabValue: 0,
  simplePaymentMethod: 'card',
  cashReceived: '',
  tips: '',
  splitType: 'equal',
  splitCount: 2,
  subBills: [],
  loading: false,
};

/**
 * Payment Logic Hook
 */
export const usePaymentLogic = (
  currentOrder: OrderItem[],
  orderTotal: number,
  orderTax: number,
  onOrderComplete: (message: string) => void,
  onOrderError: (message: string) => void,
  onDataUpdate: () => void,
  onClearOrder: () => void,
  onClose: () => void
): UsePaymentLogicReturn => {
  const [state, setState] = useState<PaymentState>(defaultState);
  const { createOrder } = usePOSAPI(onOrderComplete, onOrderError, onDataUpdate);

  /**
   * Currency formatter
   */
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }, []);

  /**
   * Calculate change for cash payments
   */
  const changeAmount = useMemo(() => {
    if (state.simplePaymentMethod === 'cash' && state.cashReceived) {
      const received = parseFloat(state.cashReceived);
      const totalWithTips = orderTotal + (parseFloat(state.tips) || 0);
      return Math.max(0, received - totalWithTips);
    }
    return 0;
  }, [state.simplePaymentMethod, state.cashReceived, orderTotal, state.tips]);

  /**
   * Validate simple payment
   */
  const isSimplePaymentValid = useMemo(() => {
    if (state.simplePaymentMethod === 'card') {
      return true; // Card payments are always valid
    }
    
    // Cash payment validation
    const received = parseFloat(state.cashReceived) || 0;
    const totalWithTips = orderTotal + (parseFloat(state.tips) || 0);
    return received >= totalWithTips;
  }, [state.simplePaymentMethod, state.cashReceived, orderTotal, state.tips]);

  /**
   * Set simple payment method
   */
  const setSimplePaymentMethod = useCallback((method: SimplePaymentMethod) => {
    setState(prev => ({ ...prev, simplePaymentMethod: method }));
  }, []);

  /**
   * Set cash received amount
   */
  const setCashReceived = useCallback((amount: string) => {
    setState(prev => ({ ...prev, cashReceived: amount }));
  }, []);

  /**
   * Set tips amount
   */
  const setTips = useCallback((tips: string) => {
    setState(prev => ({ ...prev, tips }));
  }, []);

  /**
   * Set split type
   */
  const setSplitType = useCallback((type: SplitType) => {
    setState(prev => ({ ...prev, splitType: type }));
  }, []);

  /**
   * Set split count
   */
  const setSplitCount = useCallback((count: number) => {
    setState(prev => ({ ...prev, splitCount: count }));
  }, []);

  /**
   * Set sub bills
   */
  const setSubBills = useCallback((bills: LocalSubBill[]) => {
    setState(prev => ({ ...prev, subBills: bills }));
  }, []);

  /**
   * Set tab value
   */
  const setTabValue = useCallback((value: number) => {
    setState(prev => ({ ...prev, tabValue: value }));
  }, []);

  /**
   * Initialize split bills
   */
  const initializeSplitBills = useCallback(() => {
    if (state.splitType === 'equal') {
      const amountPerBill = orderTotal / state.splitCount;
      const itemsPerBill = Math.ceil(currentOrder.length / state.splitCount);
      const bills: LocalSubBill[] = Array.from({ length: state.splitCount }, (_, index) => ({
        id: `split-${index}`,
        items: currentOrder.slice(index * itemsPerBill, (index + 1) * itemsPerBill),
        total: amountPerBill,
        payments: [{ method: 'card', amount: amountPerBill }],
      }));
      setSubBills(bills);
    } else {
      // Custom split - start with empty bills
      const bills: LocalSubBill[] = Array.from({ length: state.splitCount }, (_, index) => ({
        id: `split-${index}`,
        items: [],
        total: 0,
        payments: [],
      }));
      setSubBills(bills);
    }
  }, [state.splitType, state.splitCount, orderTotal, currentOrder, setSubBills]);

  /**
   * Handle simple payment
   */
  const handleSimplePayment = useCallback(async () => {
    if (!isSimplePaymentValid) {
      onOrderError('Paiement invalide. Vérifiez les montants.');
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    
    try {
      await createOrder({
        items: currentOrder,
        totalAmount: orderTotal,
        totalTax: orderTax,
        paymentMethod: state.simplePaymentMethod,
        cashReceived: state.simplePaymentMethod === 'cash' ? parseFloat(state.cashReceived) : undefined,
        tips: parseFloat(state.tips) || 0,
      });

      const paymentMethodText = state.simplePaymentMethod === 'card' ? 'carte' : 'espèces';
      const tipsText = state.tips ? ` (+ ${formatCurrency(parseFloat(state.tips))} de pourboire)` : '';
      onOrderComplete(`Commande payée par ${paymentMethodText}${tipsText}`);
      onDataUpdate();
      onClearOrder();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Payment failed:', error);
      onOrderError('Échec du paiement. Veuillez réessayer.');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [
    isSimplePaymentValid,
    currentOrder,
    orderTotal,
    orderTax,
    state.simplePaymentMethod,
    state.cashReceived,
    state.tips,
    createOrder,
    onOrderComplete,
    onOrderError,
    onDataUpdate,
    onClearOrder,
    onClose,
    formatCurrency,
  ]);

  /**
   * Handle split payment
   */
  const handleSplitPayment = useCallback(async () => {
    if (state.subBills.length === 0) {
      onOrderError('Veuillez configurer les paiements partagés.');
      return;
    }

    const totalSplit = state.subBills.reduce((sum, bill) => sum + bill.total, 0);
    if (Math.abs(totalSplit - orderTotal) > 0.01) {
      onOrderError('Le total des paiements partagés ne correspond pas au montant de la commande.');
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    
    try {
      await createOrder({
        items: currentOrder,
        totalAmount: orderTotal,
        totalTax: orderTax,
        paymentMethod: 'split',
        subBills: state.subBills,
        notes: `Paiement partagé en ${state.subBills.length} parties`,
      });

      onOrderComplete(`Commande payée en ${state.subBills.length} paiements partagés`);
      onDataUpdate();
      onClearOrder();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Split payment failed:', error);
      onOrderError('Échec du paiement partagé. Veuillez réessayer.');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [
    state.subBills,
    orderTotal,
    orderTax,
    currentOrder,
    createOrder,
    onOrderComplete,
    onOrderError,
    onDataUpdate,
    onClearOrder,
    onClose,
  ]);

  /**
   * Reset form to default state
   */
  const resetForm = useCallback(() => {
    setState(defaultState);
  }, []);

  return {
    state,
    setSimplePaymentMethod,
    setCashReceived,
    setTips,
    changeAmount,
    isSimplePaymentValid,
    handleSimplePayment,
    setSplitType,
    setSplitCount,
    setSubBills,
    initializeSplitBills,
    handleSplitPayment,
    setTabValue,
    resetForm,
    formatCurrency,
  };
};

