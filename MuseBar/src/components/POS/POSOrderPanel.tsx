import React from 'react';
import type { OrderItem } from '../../types';
import { usePOSOrderTotals } from '../../hooks/usePOSOrderTotals';
import { formatCurrency } from '../../utils/formatCurrency';
import OrderSummary from './OrderSummary';

export interface POSOrderPanelProps {
  currentOrder: OrderItem[];
  onRemoveItem: (index: number) => void;
  onClearOrder: () => void;
  onCheckout: () => void;
  onQuickCard: () => void;
  onQuickCash: () => void;
  onFaireDeLaMonnaie: (amount: number) => Promise<void>;
  onApplyHappyHour?: (index: number) => void;
  onApplyOffert?: (index: number) => void;
  onApplyPerso?: (index: number) => void;
  onUpdateLineNote?: (index: number, note: string) => void;
}

const POSOrderPanel = React.memo(function POSOrderPanel({
  currentOrder,
  onRemoveItem,
  onClearOrder,
  onCheckout,
  onQuickCard,
  onQuickCash,
  onFaireDeLaMonnaie,
  onApplyHappyHour,
  onApplyOffert,
  onApplyPerso,
  onUpdateLineNote,
}: POSOrderPanelProps) {
  const { orderTotal, orderTax, orderSubtotal, canProcessPayment } = usePOSOrderTotals(currentOrder);

  return (
    <OrderSummary
      currentOrder={currentOrder}
      orderTotal={orderTotal}
      orderTax={orderTax}
      orderSubtotal={orderSubtotal}
      canProcessPayment={canProcessPayment}
      onRemoveItem={onRemoveItem}
      onClearOrder={onClearOrder}
      onCheckout={onCheckout}
      onQuickCard={onQuickCard}
      onQuickCash={onQuickCash}
      onFaireDeLaMonnaie={onFaireDeLaMonnaie}
      onApplyHappyHour={onApplyHappyHour}
      onApplyOffert={onApplyOffert}
      onApplyPerso={onApplyPerso}
      onUpdateLineNote={onUpdateLineNote}
      formatCurrency={formatCurrency}
    />
  );
});

export default POSOrderPanel;
