/**
 * Payment Calculations
 * Handles split bill calculations and payment amount logic
 */

import { useCallback, useMemo } from 'react';
import { OrderItem, LocalSubBill } from '../../../../types';
import { PaymentState, SplitType } from '../types';

interface UsePaymentCalculationsProps {
  state: PaymentState;
  orderItems: OrderItem[];
  onSubBillsUpdate: (bills: LocalSubBill[]) => void;
}

export const usePaymentCalculations = ({
  state,
  orderItems,
  onSubBillsUpdate,
}: UsePaymentCalculationsProps) => {

  /**
   * Calculate total amount for order
   */
  const totalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [orderItems]);

  /**
   * Calculate tips amount
   */
  const tipsAmount = useMemo(() => {
    const tips = parseFloat(state.tips) || 0;
    return Math.max(0, tips);
  }, [state.tips]);

  /**
   * Calculate total with tips
   */
  const totalWithTips = useMemo(() => {
    return totalAmount + tipsAmount;
  }, [totalAmount, tipsAmount]);

  /**
   * Calculate cash change
   */
  const cashChange = useMemo(() => {
    if (state.simplePaymentMethod !== 'cash') return 0;
    const received = parseFloat(state.cashReceived) || 0;
    return Math.max(0, received - totalWithTips);
  }, [state.simplePaymentMethod, state.cashReceived, totalWithTips]);

  /**
   * Initialize split bills based on type
   */
  const initializeSplitBills = useCallback(() => {
    if (state.splitType === 'equal') {
      const amountPerBill = totalWithTips / state.splitCount;
      const bills: LocalSubBill[] = Array.from({ length: state.splitCount }, (_, index) => ({
        id: `split-${index + 1}`,
        total: amountPerBill,
        payments: [],
        items: orderItems.map(item => ({
          ...item,
          quantity: item.quantity / state.splitCount,
        })),
        tip: (tipsAmount / state.splitCount).toFixed(2),
      }));
      onSubBillsUpdate(bills);
    } else {
      // Custom split - create empty bills for manual assignment
      const bills: LocalSubBill[] = Array.from({ length: state.splitCount }, (_, index) => ({
        id: `custom-${index + 1}`,
        total: 0,
        payments: [],
        items: [],
        tip: '0',
      }));
      onSubBillsUpdate(bills);
    }
  }, [state.splitType, state.splitCount, totalWithTips, orderItems, tipsAmount, onSubBillsUpdate]);

  /**
   * Update sub-bill amount
   */
  const updateSubBillAmount = useCallback((billId: string, amount: number) => {
    const updatedBills = state.subBills.map(bill =>
      bill.id === billId ? { ...bill, total: amount } : bill
    );
    onSubBillsUpdate(updatedBills);
  }, [state.subBills, onSubBillsUpdate]);

  /**
   * Update sub-bill payment method  
   */
  const updateSubBillPaymentMethod = useCallback((billId: string, paymentMethod: 'cash' | 'card') => {
    // Note: LocalSubBill doesn't have paymentMethod, this might need adjustment based on actual usage
    const updatedBills = state.subBills.map(bill =>
      bill.id === billId ? { ...bill, payments: [{ amount: bill.total, method: paymentMethod }] } : bill
    );
    onSubBillsUpdate(updatedBills);
  }, [state.subBills, onSubBillsUpdate]);

  /**
   * Calculate total of all sub-bills
   */
  const subBillsTotal = useMemo(() => {
    return state.subBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
  }, [state.subBills]);

  /**
   * Check if split amounts are valid
   */
  const isSplitAmountValid = useMemo(() => {
    if (state.subBills.length === 0) return false;
    const tolerance = 0.01; // Allow 1 cent difference due to rounding
    return Math.abs(subBillsTotal - totalWithTips) <= tolerance;
  }, [subBillsTotal, totalWithTips]);

  return {
    totalAmount,
    tipsAmount,
    totalWithTips,
    cashChange,
    subBillsTotal,
    isSplitAmountValid,
    initializeSplitBills,
    updateSubBillAmount,
    updateSubBillPaymentMethod,
  };
};
