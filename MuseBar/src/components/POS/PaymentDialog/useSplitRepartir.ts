/**
 * Context menu + « Répartir » dialog state for the split board.
 * The menu anchor carries the item ids the dialog operates on.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { LocalSubBill, OrderItem } from '../../../types';
import {
  billTotalFromItems,
  cents,
  dialogResidualIndex,
  resolveSplitShareCents,
  splitItemsByShareCents,
} from './splitAssignment';

export interface SplitMenuAnchor {
  mouseX: number;
  mouseY: number;
  itemIds: string[];
}

interface UseSplitRepartirOptions {
  subBills: LocalSubBill[];
  orderTotal: number;
  resolveItems: (ids: string[]) => OrderItem[];
  onSubBillsChange: (bills: LocalSubBill[]) => void;
  /** Called after a split is applied so the caller can drop the ids from its selection. */
  onItemsAssigned: (ids: string[]) => void;
}

export function useSplitRepartir({
  subBills,
  orderTotal,
  resolveItems,
  onSubBillsChange,
  onItemsAssigned,
}: UseSplitRepartirOptions) {
  const [menuAnchor, setMenuAnchor] = useState<SplitMenuAnchor | null>(null);
  const [pickBillsOpen, setPickBillsOpen] = useState(false);
  const [pickBillIds, setPickBillIds] = useState<Set<number>>(new Set());
  /** Raw typed amounts in the Répartir dialog (empty string = auto / residual). */
  const [pickAmounts, setPickAmounts] = useState<Record<number, string>>({});

  const closeMenu = useCallback(() => setMenuAnchor(null), []);

  const openContextMenu = useCallback((event: React.MouseEvent, itemIds: string[]) => {
    event.preventDefault();
    if (itemIds.length === 0) return;
    setMenuAnchor({ mouseX: event.clientX + 2, mouseY: event.clientY - 6, itemIds });
  }, []);

  const openRepartirDialog = useCallback(
    (itemIds: string[]) => {
      if (itemIds.length === 0) return;
      setMenuAnchor({ mouseX: 0, mouseY: 0, itemIds });
      setPickBillIds(new Set(subBills.map((_, i) => i)));
      setPickAmounts({});
      setPickBillsOpen(true);
    },
    [subBills]
  );

  const closeRepartirDialog = useCallback(() => {
    setPickBillsOpen(false);
    setPickAmounts({});
  }, []);

  const toggleBill = useCallback((index: number) => {
    setPickBillIds(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
        setPickAmounts(a => {
          const copy = { ...a };
          delete copy[index];
          return copy;
        });
      } else next.add(index);
      return next;
    });
  }, []);

  const setBillAmount = useCallback((index: number, raw: string) => {
    setPickAmounts(prev => ({ ...prev, [index]: raw }));
  }, []);

  const pickItemsTotal = useMemo(() => {
    if (!menuAnchor) return 0;
    return billTotalFromItems(resolveItems(menuAnchor.itemIds));
  }, [menuAnchor, resolveItems]);

  const pickParsedAmounts = useMemo(() => {
    const out: Record<number, number | null> = {};
    for (const index of pickBillIds) {
      const raw = (pickAmounts[index] ?? '').trim().replace(',', '.');
      if (raw === '') out[index] = null;
      else {
        const v = parseFloat(raw);
        out[index] = Number.isFinite(v) && v >= 0 ? v : null;
      }
    }
    return out;
  }, [pickBillIds, pickAmounts]);

  const pickShares = useMemo(() => {
    const indices = [...pickBillIds];
    return resolveSplitShareCents(cents(pickItemsTotal), indices, pickParsedAmounts);
  }, [pickBillIds, pickItemsTotal, pickParsedAmounts]);

  const pickResidual = dialogResidualIndex([...pickBillIds], pickParsedAmounts);

  const pickSharesValid = useMemo(() => {
    if (pickBillIds.size === 0 || pickItemsTotal <= 0) return false;
    const sum = Object.values(pickShares).reduce((a, b) => a + b, 0);
    return sum === cents(pickItemsTotal);
  }, [pickBillIds.size, pickItemsTotal, pickShares]);

  const applyRepartir = useCallback(() => {
    if (!menuAnchor || !pickSharesValid) return;
    const items = resolveItems(menuAnchor.itemIds);
    onSubBillsChange(splitItemsByShareCents(subBills, items, pickShares, orderTotal));
    onItemsAssigned(menuAnchor.itemIds);
    setMenuAnchor(null);
    setPickBillsOpen(false);
    setPickAmounts({});
  }, [
    menuAnchor,
    pickSharesValid,
    resolveItems,
    onSubBillsChange,
    subBills,
    pickShares,
    orderTotal,
    onItemsAssigned,
  ]);

  return {
    menuAnchor,
    closeMenu,
    openContextMenu,
    openRepartirDialog,
    closeRepartirDialog,
    pickBillsOpen,
    pickBillIds,
    pickAmounts,
    pickItemsTotal,
    pickParsedAmounts,
    pickShares,
    pickResidual,
    pickSharesValid,
    toggleBill,
    setBillAmount,
    applyRepartir,
  };
}

export type SplitRepartirState = ReturnType<typeof useSplitRepartir>;
