/**
 * Payment State Management
 * Core state management and basic operations for payment dialog
 */

import { useState, useCallback } from 'react';
import { LocalSubBill } from '../../../../types';
import { PaymentState, SimplePaymentMethod, SplitType } from '../types';
import { formatCurrency } from '../../../../utils/formatCurrency';

const defaultState: PaymentState = {
  tabValue: 0,
  simplePaymentMethod: 'card',
  cashReceived: '',
  tips: '',
  splitType: 'custom',
  splitCount: 2,
  subBills: [],
  loading: false,
};

export const usePaymentState = () => {
  const [state, setState] = useState<PaymentState>(defaultState);

  const setSimplePaymentMethod = useCallback((method: SimplePaymentMethod) => {
    setState(prev => ({
      ...prev,
      simplePaymentMethod: method,
      ...(method === 'cash' ? { tips: '' } : {}),
    }));
  }, []);

  const setCashReceived = useCallback((amount: string) => {
    setState(prev => ({ ...prev, cashReceived: amount }));
  }, []);

  const setTips = useCallback((tips: string) => {
    setState(prev => ({ ...prev, tips }));
  }, []);

  const setSplitType = useCallback((type: SplitType) => {
    setState(prev => ({ ...prev, splitType: type }));
  }, []);

  const setSplitCount = useCallback((count: number) => {
    setState(prev => ({ ...prev, splitCount: count }));
  }, []);

  const setSubBills = useCallback((bills: LocalSubBill[]) => {
    setState(prev => ({ ...prev, subBills: bills }));
  }, []);

  /** Tab 0 = Partage, tab 1 = Faire de la monnaie. */
  const setTabValue = useCallback((value: number) => {
    setState(prev => ({
      ...prev,
      tabValue: value,
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

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
