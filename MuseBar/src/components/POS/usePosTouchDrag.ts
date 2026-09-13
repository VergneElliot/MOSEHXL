import { useEffect, useRef, type RefObject } from 'react';
import { attachPosTouchDrag, type AttachPosTouchDragOptions } from './attachPosTouchDrag';
import type { PosTouchDragPayload } from './posTouchDnD';

/**
 * Attach shared touch-drag (500ms idle / 10px tolerance) to a host element.
 * `getPayload` is read via ref so callers need not memoize.
 */
export function usePosTouchDrag(
  hostRef: RefObject<HTMLElement | null>,
  getPayload: () => PosTouchDragPayload | null,
  extras?: Pick<AttachPosTouchDragOptions, 'onArmed' | 'onEnded'>
): void {
  const getPayloadRef = useRef(getPayload);
  getPayloadRef.current = getPayload;
  const onArmedRef = useRef(extras?.onArmed);
  onArmedRef.current = extras?.onArmed;
  const onEndedRef = useRef(extras?.onEnded);
  onEndedRef.current = extras?.onEnded;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    return attachPosTouchDrag(el, {
      getPayload: () => getPayloadRef.current(),
      onArmed: () => onArmedRef.current?.(),
      onEnded: () => onEndedRef.current?.(),
    });
  }, [hostRef]);
}
