/**
 * Payment Logic Hook
 * Centralized state management and business logic for payments
 * 
 * @deprecated Use individual modules from './hooks/' instead for better modularity
 * This file is maintained for backward compatibility
 */

import { useEffect, useCallback } from 'react';
import { OrderItem } from '../../../types';
import { UsePaymentLogicReturn } from './types';
import {
  usePaymentState,
  usePaymentCalculations,
  usePaymentValidation,
  usePaymentProcessing,
} from './hooks';

export const usePaymentLogic = (
  orderItems: OrderItem[],
  orderTotal: number,
  orderTax: number,
  onOrderComplete: (message: string, createdOrder?: any) => void,
  onOrderError: (message: string) => void,
  onDataUpdate: () => void,
  onClearOrder: () => void,
  onClose: () => void
): UsePaymentLogicReturn => {
  
  // Initialize modular hooks
  const stateHook = usePaymentState();
  
  const calculationsHook = usePaymentCalculations({
    state: stateHook.state,
    orderItems,
    onSubBillsUpdate: stateHook.setSubBills,
  });
  
  const validationHook = usePaymentValidation({
    state: stateHook.state,
    totalWithTips: calculationsHook.totalWithTips,
    isSplitAmountValid: calculationsHook.isSplitAmountValid,
  });
  
  const processingHook = usePaymentProcessing({
    state: stateHook.state,
    orderItems,
    totalWithTips: calculationsHook.totalWithTips,
    cashChange: calculationsHook.cashChange,
    onLoading: stateHook.setLoading,
    onSuccess: (createdOrder) => {
      onOrderComplete('Payment processed successfully', createdOrder);
      onClose();
      onClearOrder();
    },
    onError: onOrderError,
    onReset: stateHook.resetForm,
  });

  // Auto-initialize split bills when split type or count changes
  useEffect(() => {
    if (stateHook.state.tabValue === 1) { // Split payment tab
      calculationsHook.initializeSplitBills();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateHook.state.splitType, stateHook.state.splitCount, stateHook.state.tabValue, calculationsHook.initializeSplitBills]);

  // Composite operations that combine multiple hooks
  const handleTabChange = useCallback((newValue: number) => {
    stateHook.setTabValue(newValue);
    if (newValue === 1) {
      calculationsHook.initializeSplitBills();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateHook.setTabValue, calculationsHook.initializeSplitBills]);

  return {
    // State
    state: stateHook.state,
    
    // Simple payment
    setSimplePaymentMethod: stateHook.setSimplePaymentMethod,
    setCashReceived: stateHook.setCashReceived,
    setTips: stateHook.setTips,
    changeAmount: calculationsHook.cashChange,
    isSimplePaymentValid: validationHook.isSimplePaymentValid,
    handleSimplePayment: processingHook.handleSimplePayment,
    
    // Split payment
    setSplitType: stateHook.setSplitType,
    setSplitCount: stateHook.setSplitCount,
    setSubBills: stateHook.setSubBills,
    updateSubBillPaymentMethod: calculationsHook.updateSubBillPaymentMethod,
    initializeSplitBills: calculationsHook.initializeSplitBills,
    handleSplitPayment: processingHook.handleSplitPayment,
    
    // Tab management
    setTabValue: handleTabChange,
    
    // Form management
    resetForm: stateHook.resetForm,
    formatCurrency: stateHook.formatCurrency,
  };
};