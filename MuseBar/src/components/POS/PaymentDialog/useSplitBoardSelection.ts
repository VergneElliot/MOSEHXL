import { useCallback, useEffect, useState } from 'react';
import type { OrderItem } from '../../../types';

/** Pool checkbox selection; pruned when items leave the unassigned list. */
export function useSplitBoardSelection(pool: OrderItem[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(prev => {
      const next = new Set([...prev].filter(id => pool.some(i => i.id === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [pool]);

  const allPoolSelected = pool.length > 0 && selectedIds.size === pool.length;

  const toggleAll = useCallback(() => {
    if (allPoolSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(pool.map(i => i.id)));
  }, [allPoolSelected, pool]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const removeIds = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return {
    selectedIds,
    allPoolSelected,
    toggleAll,
    toggleOne,
    removeIds,
    clearSelection,
  };
}
