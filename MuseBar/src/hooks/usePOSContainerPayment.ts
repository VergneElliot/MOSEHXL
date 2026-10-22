import { useCallback, useMemo, useState } from 'react';
import type { Order, OrderItem } from '../types';
import type { ActiveTableState } from '../contexts/PinSessionsContext';
import { usePOSAPI } from './usePOSAPI';
import { saleLines, tipsFromOrder } from './usePOSOrderTotals';

interface UsePOSContainerPaymentArgs {
  setSnackbar: (snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }) => void;
  setPaymentDialogOpen: (open: boolean) => void;
  clearOrder: () => void;
  closeActiveTicketAfterOrder: (orderId: number) => Promise<void> | void;
  activeTable: ActiveTableState | null;
  ensureSession: () => Promise<unknown>;
  currentOrder: OrderItem[];
  orderTotal: number;
  orderTax: number;
  onDataUpdate: () => void;
}

export function usePOSContainerPayment({
  setSnackbar,
  setPaymentDialogOpen,
  clearOrder,
  closeActiveTicketAfterOrder,
  activeTable,
  ensureSession,
  currentOrder,
  orderTotal,
  orderTax,
  onDataUpdate,
}: UsePOSContainerPaymentArgs) {
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);

  const handlePaymentComplete = useCallback(
    (message: string, createdOrder?: Order) => {
      setSnackbar({ open: true, message, severity: 'success' });
      const rawId = createdOrder?.id;
      const parsedId =
        typeof rawId === 'number'
          ? rawId
          : typeof rawId === 'string'
            ? parseInt(rawId, 10)
            : NaN;
      if (Number.isFinite(parsedId) && parsedId > 0) {
        setLastOrderId(parsedId);
        setPrintDialogOpen(true);
        void closeActiveTicketAfterOrder(parsedId);
      }
    },
    [setSnackbar, closeActiveTicketAfterOrder]
  );

  const handlePaymentError = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: 'error' });
    },
    [setSnackbar]
  );

  const { createOrder, processChange } = usePOSAPI(
    handlePaymentComplete,
    handlePaymentError,
    onDataUpdate
  );

  const handleFaireDeLaMonnaie = useCallback(
    async (amount: number) => {
      await processChange({ amount, direction: 'card-to-cash' });
    },
    [processChange]
  );

  const handleCheckout = useCallback(async () => {
    try {
      if (activeTable) await ensureSession();
      setPaymentDialogOpen(true);
    } catch {
      setSnackbar({
        open: true,
        message: 'Session PIN requise pour encaisser une table',
        severity: 'error',
      });
    }
  }, [activeTable, setPaymentDialogOpen, setSnackbar, ensureSession]);

  const handleQuickPayment = useCallback(
    async (method: 'cash' | 'card') => {
      if (currentOrder.length === 0) return;
      try {
        if (activeTable) await ensureSession();
        const created = await createOrder({
          paymentMethod: method,
          totalAmount: orderTotal,
          totalTax: orderTax,
          items: saleLines(currentOrder),
          tips: tipsFromOrder(currentOrder),
          change: 0,
        });
        void created;
        clearOrder();
      } catch {
        // Error already reported by usePOSAPI or session cancelled
      }
    },
    [activeTable, currentOrder, orderTotal, orderTax, createOrder, clearOrder, ensureSession]
  );

  const handleQuickCard = useCallback(() => {
    void handleQuickPayment('card');
  }, [handleQuickPayment]);

  const handleQuickCash = useCallback(() => {
    void handleQuickPayment('cash');
  }, [handleQuickPayment]);

  const handleClosePaymentDialog = useCallback(() => {
    setPaymentDialogOpen(false);
  }, [setPaymentDialogOpen]);

  const handleClosePrintDialog = useCallback(() => {
    setPrintDialogOpen(false);
  }, []);

  return useMemo(
    () => ({
      printDialogOpen,
      lastOrderId,
      handlePaymentComplete,
      handlePaymentError,
      handleFaireDeLaMonnaie,
      handleCheckout,
      handleQuickCard,
      handleQuickCash,
      handleClosePaymentDialog,
      handleClosePrintDialog,
    }),
    [
      printDialogOpen,
      lastOrderId,
      handlePaymentComplete,
      handlePaymentError,
      handleFaireDeLaMonnaie,
      handleCheckout,
      handleQuickCard,
      handleQuickCash,
      handleClosePaymentDialog,
      handleClosePrintDialog,
    ]
  );
}

export type POSContainerPayment = ReturnType<typeof usePOSContainerPayment>;
