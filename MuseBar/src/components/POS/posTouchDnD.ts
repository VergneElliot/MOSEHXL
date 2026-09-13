/** Shared POS / Split touch-drag timing (idle press before drag arms). */
export const POS_TOUCH_DRAG_DELAY_MS = 500;
export const POS_TOUCH_DRAG_TOLERANCE_PX = 10;
/** Split context menu must be longer than drag arm so it does not steal the gesture. */
export const POS_TOUCH_CONTEXT_MENU_DELAY_MS = 800;

export const POS_DROP_ATTR = 'data-pos-drop';
export const POS_DROP_ACTIVE_CLASS = 'pos-drop-active';
export const POS_TOUCH_DROP_EVENT = 'pos-touch-drop';

export type PosTouchDropDetail = {
  mime: string;
  data: string;
};

export type PosTouchDragPayload = {
  mime: string;
  data: string;
  label: string;
};

export function findPosDropZone(
  clientX: number,
  clientY: number
): { id: string; el: HTMLElement } | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const node of stack) {
    if (!(node instanceof HTMLElement)) continue;
    const withAttr =
      node.hasAttribute(POS_DROP_ATTR) ? node : node.closest<HTMLElement>(`[${POS_DROP_ATTR}]`);
    if (!withAttr) continue;
    const id = withAttr.getAttribute(POS_DROP_ATTR);
    if (!id) continue;
    return { id, el: withAttr };
  }
  return null;
}

export function setPosDropHighlight(dropId: string | null): void {
  document.querySelectorAll(`.${POS_DROP_ACTIVE_CLASS}`).forEach(el => {
    el.classList.remove(POS_DROP_ACTIVE_CLASS);
  });
  if (!dropId) return;
  const el = document.querySelector<HTMLElement>(`[${POS_DROP_ATTR}="${CSS.escape(dropId)}"]`);
  el?.classList.add(POS_DROP_ACTIVE_CLASS);
}

export function isTouchDragIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('button, input, textarea, select, a, [data-no-touch-drag]'));
}

export function dispatchPosTouchDrop(
  zoneEl: HTMLElement,
  detail: PosTouchDropDetail
): void {
  zoneEl.dispatchEvent(
    new CustomEvent<PosTouchDropDetail>(POS_TOUCH_DROP_EVENT, {
      bubbles: true,
      cancelable: true,
      detail,
    })
  );
}
