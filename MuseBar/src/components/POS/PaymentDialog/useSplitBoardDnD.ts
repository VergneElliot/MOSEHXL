import React, { useState } from 'react';
import type { OrderItem } from '../../../types';
import { setCompactDragGhost } from '../posDragGhost';
import { SPLIT_DND_MIME } from './splitDnD';

interface UseSplitBoardDnDArgs {
  selectedIds: Set<string>;
  saleOrder: OrderItem[];
  assignToBill: (ids: string[], billIndex: number) => void;
}

/** HTML5 drag-and-drop from the pool onto a payment cart. */
export function useSplitBoardDnD({
  selectedIds,
  saleOrder,
  assignToBill,
}: UseSplitBoardDnDArgs) {
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const handleDragStart = (event: React.DragEvent, itemId: string) => {
    const ids =
      selectedIds.has(itemId) && selectedIds.size > 1 ? [...selectedIds] : [itemId];
    event.dataTransfer.setData(SPLIT_DND_MIME, JSON.stringify(ids));
    event.dataTransfer.effectAllowed = 'move';
    if (ids.length === 1) {
      const item = saleOrder.find(i => i.id === ids[0]);
      setCompactDragGhost(event, item?.productName ?? 'Article');
    } else {
      setCompactDragGhost(event, `${ids.length} articles`);
    }
  };

  const handleDropOnBill = (event: React.DragEvent, billIndex: number) => {
    event.preventDefault();
    setDropTarget(null);
    const raw = event.dataTransfer.getData(SPLIT_DND_MIME);
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as string[];
      if (Array.isArray(ids) && ids.length > 0) assignToBill(ids, billIndex);
    } catch {
      // ignore bad payload
    }
  };

  const handleDragOverBill = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    setDropTarget(index);
  };

  const handleDragLeaveBill = (index: number) => {
    setDropTarget(prev => (prev === index ? null : prev));
  };

  return {
    dropTarget,
    handleDragStart,
    handleDropOnBill,
    handleDragOverBill,
    handleDragLeaveBill,
  };
}
