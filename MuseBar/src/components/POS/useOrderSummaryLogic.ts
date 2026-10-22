import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OrderItem } from '../../types';
import { getLineNoteFromOptions } from '../../utils/lineItemNote';

function resolveTargetIds(order: OrderItem[], selected: Set<string>): string[] {
  const eligible = order.filter(i => !i.isTip);
  if (selected.size === 0) return eligible.map(i => i.id);
  return eligible.filter(i => selected.has(i.id)).map(i => i.id);
}

interface UseOrderSummaryLogicArgs {
  currentOrder: OrderItem[];
  cartSelectedIds: Set<string>;
  onCartSelectedIdsChange: (ids: Set<string>) => void;
  activeTableLabel?: string | null;
  onUpdateLineNote?: (index: number, note: string) => void;
  onClearOrder: () => void;
}

export function useOrderSummaryLogic({
  currentOrder,
  cartSelectedIds,
  onCartSelectedIdsChange,
  activeTableLabel = null,
  onUpdateLineNote,
  onClearOrder,
}: UseOrderSummaryLogicArgs) {
  const [lineNoteDialog, setLineNoteDialog] = useState<{
    targetIds: string[];
    productName: string;
    initialNote: string;
  } | null>(null);

  useEffect(() => {
    const alive = new Set(currentOrder.map(i => i.id));
    const next = new Set([...cartSelectedIds].filter(id => alive.has(id)));
    if (next.size !== cartSelectedIds.size) {
      onCartSelectedIdsChange(next);
    }
  }, [currentOrder, cartSelectedIds, onCartSelectedIdsChange]);

  const selectedIds = cartSelectedIds;

  const eligibleIds = useMemo(
    () => currentOrder.filter(i => !i.isTip).map(i => i.id),
    [currentOrder]
  );

  const allEligibleSelected =
    eligibleIds.length > 0 && eligibleIds.every(id => selectedIds.has(id));

  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    currentOrder.forEach((item, index) => map.set(item.id, index));
    return map;
  }, [currentOrder]);

  const targetIds = useMemo(
    () => resolveTargetIds(currentOrder, selectedIds),
    [currentOrder, selectedIds]
  );

  const hasPendingTableValidation = useMemo(() => {
    const targets = currentOrder.filter((line) => targetIds.includes(line.id) && !line.isTip);
    if (targets.length === 0) return false;
    if (!activeTableLabel) return true;
    return targets.some((line) => line.tableLineStatus !== 'validated');
  }, [activeTableLabel, currentOrder, targetIds]);

  const hasTargetItems = targetIds.length > 0;
  const hasTargets = targetIds.length > 0;

  const toggleSelect = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onCartSelectedIdsChange(next);
    },
    [selectedIds, onCartSelectedIdsChange]
  );

  const toggleSelectAll = useCallback(() => {
    if (allEligibleSelected) {
      onCartSelectedIdsChange(new Set());
    } else {
      onCartSelectedIdsChange(new Set(eligibleIds));
    }
  }, [allEligibleSelected, eligibleIds, onCartSelectedIdsChange]);

  const applyToTargets = useCallback(
    (fn?: (index: number) => void) => {
      if (!fn) return;
      for (const id of targetIds) {
        const index = indexById.get(id);
        if (index != null) fn(index);
      }
    },
    [targetIds, indexById]
  );

  const handleOpenNotes = useCallback(() => {
    if (!onUpdateLineNote || targetIds.length === 0) return;
    const noteable = targetIds.filter(id => {
      const item = currentOrder[indexById.get(id) ?? -1];
      return item && item.productId;
    });
    if (noteable.length === 0) return;
    const firstId = noteable[0];
    if (firstId === undefined) return;
    const firstIndex = indexById.get(firstId);
    if (firstIndex === undefined) return;
    const first = currentOrder[firstIndex];
    if (!first) return;
    setLineNoteDialog({
      targetIds: noteable,
      productName:
        noteable.length === 1
          ? first.productName
          : `${noteable.length} articles`,
      initialNote:
        noteable.length === 1 ? getLineNoteFromOptions(first.options) : '',
    });
  }, [onUpdateLineNote, targetIds, currentOrder, indexById]);

  const handleClearOrder = useCallback(() => {
    onCartSelectedIdsChange(new Set());
    onClearOrder();
  }, [onClearOrder, onCartSelectedIdsChange]);

  const handleSaveLineNotes = useCallback(
    (note: string) => {
      if (lineNoteDialog == null || !onUpdateLineNote) return;
      for (const id of lineNoteDialog.targetIds) {
        const index = indexById.get(id);
        if (index != null) onUpdateLineNote(index, note);
      }
    },
    [lineNoteDialog, onUpdateLineNote, indexById]
  );

  const clearActionTitle = activeTableLabel
    ? 'Quitter la table — retour mode comptoir'
    : 'Vider la commande';
  const clearActionDisabled = !activeTableLabel && currentOrder.length === 0;

  const canNote = Boolean(onUpdateLineNote) && targetIds.some(id => {
    const item = currentOrder[indexById.get(id) ?? -1];
    return item && item.productId;
  });

  return {
    selectedIds,
    eligibleIds,
    allEligibleSelected,
    indexById,
    targetIds,
    hasPendingTableValidation,
    hasTargetItems,
    hasTargets,
    toggleSelect,
    toggleSelectAll,
    applyToTargets,
    handleOpenNotes,
    handleClearOrder,
    handleSaveLineNotes,
    lineNoteDialog,
    closeLineNoteDialog: () => setLineNoteDialog(null),
    clearActionTitle,
    clearActionDisabled,
    canNote,
  };
}
