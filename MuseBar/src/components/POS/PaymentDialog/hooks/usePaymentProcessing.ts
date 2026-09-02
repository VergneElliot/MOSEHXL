import { logger } from '../../../../utils/logger';
/**
 * Payment Processing
 * Tips: sum of Pourboire cart lines → orders.tips (not sale items).
 * Split: sale lines only in items / sub_bills amounts.
 */

import { useCallback } from 'react';
import { OrderItem, Order } from '../../../../types';
import { usePOSAPI } from '../../../../hooks/usePOSAPI';
import { PaymentState } from '../types';
import { saleLines, tipsFromOrder } from '../../../../hooks/usePOSOrderTotals';

interface UsePaymentProcessingProps {
  state: PaymentState;
  orderItems: OrderItem[];
  totalWithTips: number;
  cashChange: number;
  onLoading: (loading: boolean) => void;
  onSuccess: (createdOrder?: Order) => void;
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
    (_message, createdOrder) => onSuccess(createdOrder),
    message => onError(message),
    () => {}
  );

  const handleSimplePayment = useCallback(async () => {
    onLoading(true);
    try {
      const saleItems = saleLines(orderItems);
      const tips = tipsFromOrder(orderItems);
      const orderData = {
        totalAmount: saleItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
        totalTax: saleItems.reduce((sum, item) => sum + item.taxAmount, 0),
        paymentMethod: state.simplePaymentMethod,
        items: saleItems,
        tips,
        cashReceived:
          state.simplePaymentMethod === 'cash'
            ? parseFloat(state.cashReceived) || totalWithTips
            : undefined,
        change: state.simplePaymentMethod === 'cash' ? cashChange : 0,
      };

      const created = await createOrder(orderData);
      onSuccess(created);
      onReset();
    } catch (error) {
      logger.error('Payment failed:', error);
      onError(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      onLoading(false);
    }
  }, [
    state.simplePaymentMethod,
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

  const handleSplitPayment = useCallback(async () => {
    if (state.subBills.length === 0) {
      onError('No sub-bills configured for split payment');
      return;
    }

    onLoading(true);
    try {
      const saleItems = saleLines(orderItems);
      const tips = tipsFromOrder(orderItems);
      const saleTotal = saleItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

      // Single payer (equal count=1): store as card/cash, not split — cleaner for closures.
      if (state.subBills.length === 1) {
        const bill = state.subBills[0]!;
        const method = bill.payments[0]?.method === 'cash' ? 'cash' : 'card';
        const created = await createOrder({
          totalAmount: saleTotal,
          totalTax: saleItems.reduce((sum, item) => sum + item.taxAmount, 0),
          paymentMethod: method,
          items: saleItems,
          tips,
          change: 0,
        });
        onSuccess(created);
        onReset();
        return;
      }

      const created = await createOrder({
        totalAmount: saleTotal,
        totalTax: saleItems.reduce((sum, item) => sum + item.taxAmount, 0),
        paymentMethod: 'split',
        items: saleItems,
        subBills: state.subBills,
        tips,
      });
      onSuccess(created);
      onReset();
    } catch (error) {
      logger.error('Split payment failed:', error);
      onError(error instanceof Error ? error.message : 'Split payment processing failed');
    } finally {
      onLoading(false);
    }
  }, [state.subBills, orderItems, createOrder, onLoading, onSuccess, onError, onReset]);

  const processCurrentPayment = useCallback(async () => {
    await handleSplitPayment();
  }, [handleSplitPayment]);

  const executePayment = useCallback(async () => {
    if (totalWithTips < 0) {
      onError('Invalid payment amount');
      return;
    }
    if (state.subBills.length === 0) {
      onError('No sub-bills configured');
      return;
    }
    await processCurrentPayment();
  }, [totalWithTips, state.subBills, processCurrentPayment, onError]);

  return {
    handleSimplePayment,
    handleSplitPayment,
    processCurrentPayment,
    executePayment,
  };
};
