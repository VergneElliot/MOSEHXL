/**
 * Payment Logic Hook — Partage board + optional change tab.
 */

import { useEffect, useCallback } from 'react';
import { OrderItem, Order } from '../../../types';
import { UsePaymentLogicReturn } from './types';
import {
  usePaymentState,
  usePaymentCalculations,
  usePaymentValidation,
  usePaymentProcessing,
} from './hooks';
import { createEmptyBills } from './splitAssignment';

export const usePaymentLogic = (
  orderItems: OrderItem[],
  _orderTotal: number,
  _orderTax: number,
  onOrderComplete: (message: string, createdOrder?: Order) => void,
  onOrderError: (message: string) => void,
  _onDataUpdate: () => void,
  onClearOrder: () => void,
  onClose: () => void
): UsePaymentLogicReturn => {
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
    onSuccess: createdOrder => {
      onOrderComplete('Payment processed successfully', createdOrder);
      onClose();
      onClearOrder();
    },
    onError: onOrderError,
    onReset: stateHook.resetForm,
  });

  // Seed empty bills once when opening partage (tab 0) if none yet
  useEffect(() => {
    if (stateHook.state.tabValue === 0 && stateHook.state.subBills.length === 0) {
      stateHook.setSubBills(createEmptyBills(stateHook.state.splitCount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateHook.state.tabValue]);

  const handleTabChange = useCallback(
    (newValue: number) => {
      stateHook.setTabValue(newValue);
    },
    [stateHook.setTabValue]
  );

  return {
    state: stateHook.state,
    setSimplePaymentMethod: stateHook.setSimplePaymentMethod,
    setCashReceived: stateHook.setCashReceived,
    setTips: stateHook.setTips,
    changeAmount: calculationsHook.cashChange,
    isSimplePaymentValid: validationHook.isSimplePaymentValid,
    handleSimplePayment: processingHook.handleSimplePayment,
    setSplitType: stateHook.setSplitType,
    setSplitCount: stateHook.setSplitCount,
    setSubBills: stateHook.setSubBills,
    updateSubBillPaymentMethod: calculationsHook.updateSubBillPaymentMethod,
    initializeSplitBills: calculationsHook.initializeSplitBills,
    handleSplitPayment: processingHook.handleSplitPayment,
    setTabValue: handleTabChange,
    resetForm: stateHook.resetForm,
    formatCurrency: stateHook.formatCurrency,
  };
};
