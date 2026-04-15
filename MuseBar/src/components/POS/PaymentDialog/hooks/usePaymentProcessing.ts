/**
 * Payment Processing
 * Handles API calls and payment execution logic
 */

import { useCallback } from 'react';
import { OrderItem } from '../../../../types';
import { usePOSAPI } from '../../../../hooks/usePOSAPI';
import { PaymentState } from '../types';

interface UsePaymentProcessingProps {
  state: PaymentState;
  orderItems: OrderItem[];
  totalWithTips: number;
  cashChange: number;
  onLoading: (loading: boolean) => void;
  onSuccess: (createdOrder?: any) => void;
  onError: (error: string) => void;
  onReset: () => void;
}

export const usePaymentProcessing = ({
  state,
  orderItems,
  totalWithTips,
  cashChange,
  onLoading,
  onSuccess,
  onError,
  onReset,
}: UsePaymentProcessingProps) => {
  
  const { createOrder } = usePOSAPI(
    (message, createdOrder) => onSuccess(createdOrder),
    (message) => onError(message),
    () => {} // onDataUpdate placeholder
  );

  /**
   * Handle simple payment processing.
   * For cash: when "Montant reçu" is empty we send totalAmount = order total and change = 0,
   * so the backend records one cash transaction for the full order amount (daily cash total is correct).
   */
  const handleSimplePayment = useCallback(async () => {
    onLoading(true);
    
    try {
      const orderData = {
        totalAmount: totalWithTips,
        totalTax: orderItems.reduce((sum, item) => sum + item.taxAmount, 0),
        paymentMethod: state.simplePaymentMethod,
        items: orderItems,
        tips: parseFloat(state.tips) || 0,
        // API stores order total and payment_method; when cash + empty montant reçu we send total so cash = order total
        cashReceived: state.simplePaymentMethod === 'cash'
          ? (parseFloat(state.cashReceived) || totalWithTips)
          : undefined,
        change: state.simplePaymentMethod === 'cash' ? cashChange : 0,
      };

      const created = await createOrder(orderData);
      onSuccess(created);
      onReset();
    } catch (error) {
      console.error('Payment failed:', error);
      onError(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      onLoading(false);
    }
  }, [
    state.simplePaymentMethod,
    state.tips,
    state.cashReceived,
    totalWithTips,
    cashChange,
    orderItems,
    createOrder,
    onLoading,
    onSuccess,
    onError,
    onReset,
  ]);

  /**
   * Handle split payment processing
   */
  const handleSplitPayment = useCallback(async () => {
    if (state.subBills.length === 0) {
      onError('No sub-bills configured for split payment');
      return;
    }

    onLoading(true);
    
    try {
      // Create a single order with split payment
      const orderData = {
        totalAmount: totalWithTips,
        totalTax: orderItems.reduce((sum, item) => sum + item.taxAmount, 0),
        paymentMethod: 'split' as const,
        items: orderItems,
        subBills: state.subBills,
        tips: state.subBills.reduce((sum, bill) => sum + parseFloat(bill.tip || '0'), 0),
      };

      const created = await createOrder(orderData);
      onSuccess(created);
      onReset();
    } catch (error) {
      console.error('Split payment failed:', error);
      onError(error instanceof Error ? error.message : 'Split payment processing failed');
    } finally {
      onLoading(false);
    }
  }, [
    state.subBills,
    totalWithTips,
    orderItems,
    createOrder,
    onLoading,
    onSuccess,
    onError,
    onReset,
  ]);

  /**
   * Process payment based on current tab
   */
  const processCurrentPayment = useCallback(async () => {
    if (state.tabValue === 0) {
      await handleSimplePayment();
    } else {
      await handleSplitPayment();
    }
  }, [state.tabValue, handleSimplePayment, handleSplitPayment]);

  /**
   * Validate and process payment
   */
  const executePayment = useCallback(async () => {
    // Basic validation before processing
    // Allow 0€ totals (e.g. fully discounted or complimentary orders), but prevent negative amounts
    if (totalWithTips < 0) {
      onError('Invalid payment amount');
      return;
    }

    if (state.tabValue === 0) {
      // Simple payment validation (cash: Montant reçu is optional)
      if (state.simplePaymentMethod === 'cash' && state.cashReceived && state.cashReceived.trim() !== '') {
        const received = parseFloat(state.cashReceived) || 0;
        if (received < totalWithTips) {
          onError('Insufficient cash amount');
          return;
        }
      }
    } else {
      // Split payment validation
      if (state.subBills.length === 0) {
        onError('No sub-bills configured');
        return;
      }
    }

    await processCurrentPayment();
  }, [
    totalWithTips,
    state.tabValue,
    state.simplePaymentMethod,
    state.cashReceived,
    state.subBills,
    processCurrentPayment,
    onError,
  ]);

  return {
    handleSimplePayment,
    handleSplitPayment,
    processCurrentPayment,
    executePayment,
  };
};
