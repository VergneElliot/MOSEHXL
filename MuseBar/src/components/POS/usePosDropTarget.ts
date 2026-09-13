import { useEffect, useRef, type RefObject } from 'react';
import {
  POS_DROP_ATTR,
  POS_TOUCH_DROP_EVENT,
  type PosTouchDropDetail,
} from './posTouchDnD';

/**
 * Marks an element as a touch/HTML5 drop zone via data-pos-drop and listens for
 * custom touch-drop events from attachPosTouchDrag.
 */
export function usePosDropTarget(
  dropId: string,
  onTouchDrop: (detail: PosTouchDropDetail) => void
): RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null);
  const onDropRef = useRef(onTouchDrop);
  onDropRef.current = onTouchDrop;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute(POS_DROP_ATTR, dropId);
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PosTouchDropDetail>).detail;
      if (!detail?.mime || detail.data == null) return;
      onDropRef.current(detail);
    };
    el.addEventListener(POS_TOUCH_DROP_EVENT, handler);
    return () => {
      el.removeEventListener(POS_TOUCH_DROP_EVENT, handler);
      if (el.getAttribute(POS_DROP_ATTR) === dropId) {
        el.removeAttribute(POS_DROP_ATTR);
      }
    };
  }, [dropId]);

  return ref;
}
