import { describe, expect, it, vi } from 'vitest';
import {
  POS_DROP_ACTIVE_CLASS,
  POS_DROP_ATTR,
  POS_TOUCH_CONTEXT_MENU_DELAY_MS,
  POS_TOUCH_DRAG_DELAY_MS,
  POS_TOUCH_DRAG_TOLERANCE_PX,
  POS_TOUCH_DROP_EVENT,
  dispatchPosTouchDrop,
  findPosDropZone,
  isTouchDragIgnoredTarget,
  setPosDropHighlight,
} from './posTouchDnD';

describe('posTouchDnD constants', () => {
  it('keeps drag arm shorter than split context menu', () => {
    expect(POS_TOUCH_DRAG_DELAY_MS).toBe(500);
    expect(POS_TOUCH_DRAG_TOLERANCE_PX).toBe(10);
    expect(POS_TOUCH_CONTEXT_MENU_DELAY_MS).toBeGreaterThan(POS_TOUCH_DRAG_DELAY_MS);
  });
});

describe('posTouchDnD helpers', () => {
  it('findPosDropZone walks the hit stack', () => {
    const zone = document.createElement('div');
    zone.setAttribute(POS_DROP_ATTR, 'bill-1');
    const child = document.createElement('span');
    zone.appendChild(child);
    document.body.appendChild(zone);
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [child, zone],
    });
    expect(findPosDropZone(10, 10)).toEqual({ id: 'bill-1', el: zone });
    zone.remove();
  });

  it('setPosDropHighlight toggles active class', () => {
    const a = document.createElement('div');
    a.setAttribute(POS_DROP_ATTR, 'a');
    const b = document.createElement('div');
    b.setAttribute(POS_DROP_ATTR, 'b');
    document.body.append(a, b);
    setPosDropHighlight('a');
    expect(a.classList.contains(POS_DROP_ACTIVE_CLASS)).toBe(true);
    setPosDropHighlight('b');
    expect(a.classList.contains(POS_DROP_ACTIVE_CLASS)).toBe(false);
    expect(b.classList.contains(POS_DROP_ACTIVE_CLASS)).toBe(true);
    setPosDropHighlight(null);
    expect(b.classList.contains(POS_DROP_ACTIVE_CLASS)).toBe(false);
    a.remove();
    b.remove();
  });

  it('isTouchDragIgnoredTarget skips interactive controls', () => {
    const btn = document.createElement('button');
    const wrap = document.createElement('div');
    wrap.appendChild(btn);
    expect(isTouchDragIgnoredTarget(btn)).toBe(true);
    expect(isTouchDragIgnoredTarget(wrap)).toBe(false);
    expect(isTouchDragIgnoredTarget(null)).toBe(false);
  });

  it('dispatchPosTouchDrop emits a bubbling custom event', () => {
    const zone = document.createElement('div');
    const handler = vi.fn();
    zone.addEventListener(POS_TOUCH_DROP_EVENT, handler);
    dispatchPosTouchDrop(zone, { mime: 'text/plain', data: 'x' });
    expect(handler).toHaveBeenCalledOnce();
  });
});
