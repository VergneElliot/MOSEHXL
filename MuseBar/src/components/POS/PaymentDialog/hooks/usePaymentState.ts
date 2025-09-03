/**
 * Payment State Management
 * Core state management and basic operations for payment dialog
 */

import { useState, useCallback } from 'react';
import { LocalSubBill } from '../../../../types';
import { PaymentState, SimplePaymentMethod, SplitType } from '../types';

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

export const usePaymentState = () => {
  const [state, setState] = useState<PaymentState>(defaultState);

  /**
   * Format currency amount
   */
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }, []);

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
   * Set sub-bills
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
   * Set loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  /**
   * Reset form to defaults
   */
  const resetForm = useCallback(() => {
    setState(defaultState);
  }, []);

  return {
    state,
    setState,
    formatCurrency,
    setSimplePaymentMethod,
    setCashReceived,
    setTips,
    setSplitType,
    setSplitCount,
    setSubBills,
    setTabValue,
    setLoading,
    resetForm,
  };
};
