import React from 'react';
import type { OrderItem } from '../../types';
import { usePOSOrderTotals } from '../../hooks/usePOSOrderTotals';
import { formatCurrency } from '../../utils/formatCurrency';
import OrderSummary from './OrderSummary';
import type { PosProductDragPayload } from './posProductDnD';

export interface POSOrderPanelProps {
  currentOrder: OrderItem[];
  onRemoveItem: (index: number) => void;
  onClearOrder: () => void;
  onCheckout: () => void;
  onQuickCard: () => void;
  onQuickCash: () => void;
  onApplyHappyHour?: (index: number) => void;
  onApplyOffert?: (index: number) => void;
  onApplyPerso?: (index: number) => void;
  onUpdateLineNote?: (index: number, note: string) => void;
  onDropProduct?: (payload: PosProductDragPayload) => void;
  onSelectTable?: () => void;
  activeTableLabel?: string | null;
  onSuivre?: () => void;
}

const POSOrderPanel = React.memo(function POSOrderPanel({
  currentOrder,
  onRemoveItem,
  onClearOrder,
  onCheckout,
  onQuickCard,
  onQuickCash,
  onApplyHappyHour,
  onApplyOffert,
  onApplyPerso,
  onUpdateLineNote,
  onDropProduct,
  onSelectTable,
  activeTableLabel,
  onSuivre,
}: POSOrderPanelProps) {
  const { orderTotal, orderTax, orderSubtotal, tipsTotal, canProcessPayment } =
    usePOSOrderTotals(currentOrder);

  return (
    <OrderSummary
      currentOrder={currentOrder}
      orderTotal={orderTotal}
      orderTax={orderTax}
      orderSubtotal={orderSubtotal}
      tipsTotal={tipsTotal}
      canProcessPayment={canProcessPayment}
      onRemoveItem={onRemoveItem}
      onClearOrder={onClearOrder}
      onCheckout={onCheckout}
      onQuickCard={onQuickCard}
      onQuickCash={onQuickCash}
      onApplyHappyHour={onApplyHappyHour}
      onApplyOffert={onApplyOffert}
      onApplyPerso={onApplyPerso}
      onUpdateLineNote={onUpdateLineNote}
      onDropProduct={onDropProduct}
      onSelectTable={onSelectTable}
      activeTableLabel={activeTableLabel}
      onSuivre={onSuivre}
      formatCurrency={formatCurrency}
    />
  );
});

export default POSOrderPanel;
