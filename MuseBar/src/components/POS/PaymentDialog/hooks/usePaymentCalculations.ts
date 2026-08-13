/**
 * Payment Calculations
 * Split bill math. Tips come from Pourboire cart lines (isTip), not dialog state.
 * Split amounts cover sale CA only; tips are sent separately as orders.tips.
 */

import { useCallback, useMemo } from 'react';
import { OrderItem, LocalSubBill } from '../../../../types';
import { PaymentState } from '../types';
import { saleLines, tipsFromOrder } from '../../../../hooks/usePOSOrderTotals';

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
  const saleOrderItems = useMemo(() => saleLines(orderItems), [orderItems]);

  const totalAmount = useMemo(() => {
    return saleOrderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [saleOrderItems]);

  const tipsAmount = useMemo(() => tipsFromOrder(orderItems), [orderItems]);

  /** Charge shown to card terminal = CA + tip (tip still stored separately). */
  const totalWithTips = useMemo(() => totalAmount + tipsAmount, [totalAmount, tipsAmount]);

  const cashChange = useMemo(() => {
    if (state.simplePaymentMethod !== 'cash') return 0;
    if (!state.cashReceived || state.cashReceived.trim() === '') return 0;
    const received = parseFloat(state.cashReceived) || 0;
    return Math.max(0, received - totalWithTips);
  }, [state.simplePaymentMethod, state.cashReceived, totalWithTips]);

  /**
   * Initialize split bills.
   * Equal: distribute sale CA in whole cents. Tip is order-level, not per-bill.
   */
  const initializeSplitBills = useCallback(() => {
    if (state.splitType === 'equal') {
      const total = totalAmount;
      const n = Math.max(1, state.splitCount);
      const totalCents = Math.round(total * 100);
      const baseCents = Math.floor(totalCents / n);
      const remainder = totalCents - baseCents * n;
      const bills: LocalSubBill[] = Array.from({ length: n }, (_, index) => {
        const partCents = baseCents + (index < remainder ? 1 : 0);
        const partAmount = partCents / 100;
        return {
          id: `split-${index + 1}`,
          total: partAmount,
          payments: [{ amount: partAmount, method: 'card' as const }],
          items: saleOrderItems.map(item => ({
            ...item,
            quantity: item.quantity / n,
          })),
          tip: '0',
        };
      });
      onSubBillsUpdate(bills);
    } else {
      const n = Math.max(2, state.splitCount);
      const bills: LocalSubBill[] = Array.from({ length: n }, (_, index) => ({
        id: `custom-${index + 1}`,
        total: 0,
        payments: [{ amount: 0, method: 'card' as const }],
        items: [],
        tip: '0',
      }));
      onSubBillsUpdate(bills);
    }
  }, [state.splitType, state.splitCount, totalAmount, saleOrderItems, onSubBillsUpdate]);

  const updateSubBillAmount = useCallback(
    (billId: string, amount: number) => {
      const updatedBills = state.subBills.map(bill =>
        bill.id === billId ? { ...bill, total: amount } : bill
      );
      onSubBillsUpdate(updatedBills);
    },
    [state.subBills, onSubBillsUpdate]
  );

  const updateSubBillPaymentMethod = useCallback(
    (billId: string, paymentMethod: 'cash' | 'card') => {
      const updatedBills = state.subBills.map(bill =>
        bill.id === billId
          ? { ...bill, payments: [{ amount: bill.total, method: paymentMethod }] }
          : bill
      );
      onSubBillsUpdate(updatedBills);
    },
    [state.subBills, onSubBillsUpdate]
  );

  const subBillsTotal = useMemo(() => {
    return state.subBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
  }, [state.subBills]);

  const isSplitAmountValid = useMemo(() => {
    if (state.subBills.length === 0) return false;
    const sumCents = Math.round(subBillsTotal * 100);
    const totalCents = Math.round(totalAmount * 100);
    return sumCents === totalCents;
  }, [subBillsTotal, totalAmount, state.subBills.length]);

  return {
    totalAmount,
    tipsAmount,
    totalWithTips,
    cashChange,
    subBillsTotal,
    isSplitAmountValid,
    saleOrderItems,
    initializeSplitBills,
    updateSubBillAmount,
    updateSubBillPaymentMethod,
  };
};
