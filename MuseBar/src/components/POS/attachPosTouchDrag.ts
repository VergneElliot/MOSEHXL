import {
  POS_TOUCH_DRAG_DELAY_MS,
  POS_TOUCH_DRAG_TOLERANCE_PX,
  dispatchPosTouchDrop,
  findPosDropZone,
  isTouchDragIgnoredTarget,
  setPosDropHighlight,
  type PosTouchDragPayload,
} from './posTouchDnD';
import { createDragGhostChip, placeDragGhostChip } from './posDragGhostChip';

export type AttachPosTouchDragOptions = {
  getPayload: () => PosTouchDragPayload | null;
  onArmed?: () => void;
  onEnded?: () => void;
};

type HostWithPayload = HTMLElement & { __posTouchPayload?: PosTouchDragPayload };

/**
 * Native listeners (passive:false after arm) so we can preventDefault and stop
 * scroll once the idle-press delay has fired.
 */
export function attachPosTouchDrag(
  el: HTMLElement,
  options: AttachPosTouchDragOptions
): () => void {
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let delayTimer: number | null = null;
  let armed = false;
  let ghost: HTMLElement | null = null;
  let activePointerId: number | null = null;
  let payload: PosTouchDragPayload | null = null;

  const clearDelay = () => {
    if (delayTimer != null) {
      window.clearTimeout(delayTimer);
      delayTimer = null;
    }
  };

  const cleanupDrag = () => {
    clearDelay();
    armed = false;
    activePointerId = null;
    payload = null;
    setPosDropHighlight(null);
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
    options.onEnded?.();
  };

  const arm = () => {
    const next = options.getPayload();
    if (!next) {
      cleanupDrag();
      return;
    }
    armed = true;
    payload = next;
    ghost = createDragGhostChip(next.label);
    document.body.appendChild(ghost);
    placeDragGhostChip(ghost, lastX, lastY);
    options.onArmed?.();
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    if (isTouchDragIgnoredTarget(e.target)) return;
    const touch = e.touches[0];
    if (!touch) return;
    cleanupDrag();
    startX = lastX = touch.clientX;
    startY = lastY = touch.clientY;
    activePointerId = touch.identifier;
    delayTimer = window.setTimeout(() => {
      delayTimer = null;
      arm();
    }, POS_TOUCH_DRAG_DELAY_MS);
  };

  const onTouchMove = (e: TouchEvent) => {
    const touch =
      activePointerId != null
        ? [...e.touches].find(t => t.identifier === activePointerId)
        : e.touches[0];
    if (!touch) return;
    lastX = touch.clientX;
    lastY = touch.clientY;
    const dist = Math.hypot(lastX - startX, lastY - startY);

    if (!armed) {
      if (dist > POS_TOUCH_DRAG_TOLERANCE_PX) clearDelay();
      return;
    }

    e.preventDefault();
    if (ghost) placeDragGhostChip(ghost, lastX, lastY);
    const zone = findPosDropZone(lastX, lastY);
    setPosDropHighlight(zone?.id ?? null);
  };

  const onTouchEnd = (e: TouchEvent) => {
    const wasArmed = armed;
    const dropPayload = payload;
    const touch = e.changedTouches[0];
    const x = touch?.clientX ?? lastX;
    const y = touch?.clientY ?? lastY;

    if (wasArmed && dropPayload) {
      e.preventDefault();
      const zone = findPosDropZone(x, y);
      if (zone) {
        dispatchPosTouchDrop(zone.el, { mime: dropPayload.mime, data: dropPayload.data });
      }
    }
    cleanupDrag();
  };

  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd, { passive: false });
  el.addEventListener('touchcancel', cleanupDrag, { passive: true });

  return () => {
    cleanupDrag();
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
    el.removeEventListener('touchcancel', cleanupDrag);
  };
}

/** @internal test helper typing */
export type { HostWithPayload };
