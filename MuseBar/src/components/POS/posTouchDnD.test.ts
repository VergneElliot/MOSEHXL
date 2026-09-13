import { describe, expect, it } from 'vitest';
import { parsePosProductDropPayload } from './posProductDrop';
import {
  POS_TOUCH_CONTEXT_MENU_DELAY_MS,
  POS_TOUCH_DRAG_DELAY_MS,
  POS_TOUCH_DRAG_TOLERANCE_PX,
} from './posTouchDnD';

describe('posTouchDnD constants', () => {
  it('keeps drag arm shorter than split context menu', () => {
    expect(POS_TOUCH_DRAG_DELAY_MS).toBe(500);
    expect(POS_TOUCH_DRAG_TOLERANCE_PX).toBe(10);
    expect(POS_TOUCH_CONTEXT_MENU_DELAY_MS).toBeGreaterThan(POS_TOUCH_DRAG_DELAY_MS);
  });
});

describe('parsePosProductDropPayload', () => {
  it('parses product and special payloads', () => {
    expect(
      parsePosProductDropPayload(
        JSON.stringify({ kind: 'product', productId: 'p1', quantity: 2 })
      )
    ).toEqual({ kind: 'product', productId: 'p1', quantity: 2 });
    expect(parsePosProductDropPayload(JSON.stringify({ kind: 'divers' }))).toEqual({
      kind: 'divers',
    });
  });
});
