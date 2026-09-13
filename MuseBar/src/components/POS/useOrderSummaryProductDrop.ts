import { useCallback, useState, type DragEvent, type RefObject } from 'react';
import { POS_PRODUCT_DND_MIME, type PosProductDragPayload } from './posProductDnD';
import { parsePosProductDropPayload } from './posProductDrop';
import { usePosDropTarget } from './usePosDropTarget';
import './posDropActive.css';

export function useOrderSummaryProductDrop(
  onDropProduct?: (payload: PosProductDragPayload) => void
): {
  dropRef: RefObject<HTMLElement | null>;
  dropActive: boolean;
  handleDragOver: (e: DragEvent) => void;
  handleDragLeave: (e: DragEvent) => void;
  handleDrop: (e: DragEvent) => void;
} {
  const [dropActive, setDropActive] = useState(false);

  const dropRef = usePosDropTarget('cart', detail => {
    if (!onDropProduct) return;
    const payload = parsePosProductDropPayload(detail.data);
    if (payload) onDropProduct(payload);
  });

  const handleDragOver = useCallback((e: DragEvent) => {
    const types = [...e.dataTransfer.types];
    if (!types.includes(POS_PRODUCT_DND_MIME) && !types.includes('text/plain')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDropActive(false);
      if (!onDropProduct) return;
      const raw =
        e.dataTransfer.getData(POS_PRODUCT_DND_MIME) || e.dataTransfer.getData('text/plain');
      const payload = parsePosProductDropPayload(raw);
      if (payload) onDropProduct(payload);
    },
    [onDropProduct]
  );

  return { dropRef, dropActive, handleDragOver, handleDragLeave, handleDrop };
}
