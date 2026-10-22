import { useCallback, useMemo, useState } from 'react';
import type { OrderItem, Product } from '../types';
import type { ActiveTableState } from '../contexts/PinSessionsContext';
import { upsertLineNoteInOptions } from '../utils/lineItemNote';
import type { DiversFormData } from '../components/POS/DiversDialog';
import type { PourboireFormData } from '../components/POS/PourboireDialog';
import type { ProductOptionSelection } from '../components/POS/ProductOptionDialog';
import {
  buildOrderItemFromProduct,
  orderItemFromDivers,
  orderItemFromPourboire,
} from '../components/POS/posContainerItems';

interface UsePOSContainerCartArgs {
  addLinesToOrder: (items: OrderItem[]) => void;
  updateLineAt: (index: number, updates: Partial<OrderItem>) => void;
  setSnackbar: (snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }) => void;
  currentOrder: OrderItem[];
  activeTable: ActiveTableState | null;
  ensureSession: () => Promise<unknown>;
  ensureTableIntervention: () => Promise<void>;
  isHappyHourActive: boolean;
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number;
}

export function usePOSContainerCart({
  addLinesToOrder,
  updateLineAt,
  setSnackbar,
  currentOrder,
  activeTable,
  ensureSession,
  ensureTableIntervention,
  isHappyHourActive,
  calculateProductPrice,
}: UsePOSContainerCartArgs) {
  const [diversDialogOpen, setDiversDialogOpen] = useState(false);
  const [pourboireDialogOpen, setPourboireDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<{
    product: Product;
    quantity: number;
  } | null>(null);

  const handleAddToOrder = useCallback(
    async (item: OrderItem, quantity: number = 1) => {
      try {
        if (activeTable) {
          await ensureSession();
          await ensureTableIntervention();
        }
      } catch {
        setSnackbar({
          open: true,
          message: 'Session PIN requise pour une table',
          severity: 'error',
        });
        return;
      }
      const base = {
        ...item,
        quantity: 1,
        ...(activeTable ? { tableLineStatus: 'draft' as const } : {}),
      };
      const stamp = Date.now();
      const lines: OrderItem[] = [];
      for (let i = 0; i < quantity; i++) {
        lines.push({
          ...base,
          id: `${base.id}-${stamp}-${i}`,
          totalPrice: base.unitPrice,
          taxAmount: base.unitPrice * (base.taxRate / (1 + base.taxRate)),
        });
      }
      addLinesToOrder(lines);
    },
    [addLinesToOrder, setSnackbar, ensureSession, activeTable, ensureTableIntervention]
  );

  const buildOrderItem = useCallback(
    (product: Product, selections: ProductOptionSelection[]): OrderItem =>
      buildOrderItemFromProduct(product, selections, isHappyHourActive, calculateProductPrice),
    [isHappyHourActive, calculateProductPrice]
  );

  const handleRequestAddProduct = useCallback(
    (product: Product, quantity: number) => {
      if ((product.optionGroups?.length ?? 0) > 0) {
        setPendingProduct({ product, quantity });
        setOptionDialogOpen(true);
        return;
      }
      void handleAddToOrder(buildOrderItem(product, []), quantity);
    },
    [buildOrderItem, handleAddToOrder]
  );

  const handleConfirmProductOptions = useCallback(
    (selections: ProductOptionSelection[]) => {
      if (!pendingProduct) return;
      void handleAddToOrder(
        buildOrderItem(pendingProduct.product, selections),
        pendingProduct.quantity
      );
      setPendingProduct(null);
    },
    [pendingProduct, buildOrderItem, handleAddToOrder]
  );

  const handleUpdateLineNote = useCallback(
    async (index: number, note: string) => {
      const line = currentOrder[index];
      if (!line) return;
      try {
        if (activeTable) await ensureTableIntervention();
        updateLineAt(index, {
          options: upsertLineNoteInOptions(line.options, note),
        });
      } catch {
        /* cancelled */
      }
    },
    [updateLineAt, currentOrder, activeTable, ensureTableIntervention]
  );

  const handleDiversClick = useCallback(() => {
    setDiversDialogOpen(true);
  }, []);

  const handlePourboireClick = useCallback(() => {
    setPourboireDialogOpen(true);
  }, []);

  const handleCloseDiversDialog = useCallback(() => {
    setDiversDialogOpen(false);
  }, []);

  const handleClosePourboireDialog = useCallback(() => {
    setPourboireDialogOpen(false);
  }, []);

  const handleCloseOptionDialog = useCallback(() => {
    setOptionDialogOpen(false);
    setPendingProduct(null);
  }, []);

  const handleDiversSubmit = useCallback(
    (data: DiversFormData) => {
      const item = orderItemFromDivers(data);
      if (!item) return;
      void handleAddToOrder(item, 1);
    },
    [handleAddToOrder]
  );

  const handlePourboireSubmit = useCallback(
    (data: PourboireFormData) => {
      const item = orderItemFromPourboire(data);
      if (!item) return;
      void handleAddToOrder(item, 1);
    },
    [handleAddToOrder]
  );

  return useMemo(
    () => ({
      diversDialogOpen,
      pourboireDialogOpen,
      optionDialogOpen,
      pendingProduct,
      handleRequestAddProduct,
      handleConfirmProductOptions,
      handleUpdateLineNote,
      handleDiversClick,
      handlePourboireClick,
      handleCloseDiversDialog,
      handleClosePourboireDialog,
      handleCloseOptionDialog,
      handleDiversSubmit,
      handlePourboireSubmit,
    }),
    [
      diversDialogOpen,
      pourboireDialogOpen,
      optionDialogOpen,
      pendingProduct,
      handleRequestAddProduct,
      handleConfirmProductOptions,
      handleUpdateLineNote,
      handleDiversClick,
      handlePourboireClick,
      handleCloseDiversDialog,
      handleClosePourboireDialog,
      handleCloseOptionDialog,
      handleDiversSubmit,
      handlePourboireSubmit,
    ]
  );
}

export type POSContainerCart = ReturnType<typeof usePOSContainerCart>;
