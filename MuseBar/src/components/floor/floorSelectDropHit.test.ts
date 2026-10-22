import { describe, expect, it } from 'vitest';
import type { FloorCanvasTable } from './FloorCanvasView';
import {
  clientToCanvasPoint,
  hitTestFloorTable,
  selectDropMovedEnough,
} from './floorSelectDropHit';

function table(partial: Partial<FloorCanvasTable> & Pick<FloorCanvasTable, 'id'>): FloorCanvasTable {
  return {
    label: String(partial.id),
    pos_x: 0,
    pos_y: 0,
    width: 80,
    height: 80,
    shape: 'rectangle',
    ...partial,
  };
}

describe('floorSelectDropHit', () => {
  it('clientToCanvasPoint undoes pan and zoom', () => {
    const viewport = { left: 100, top: 50 } as DOMRect;
    expect(clientToCanvasPoint(140, 90, viewport, { x: 10, y: 5 }, 2)).toEqual({
      x: 15,
      y: 17.5,
    });
  });

  it('hitTestFloorTable prefers top-most enabled table', () => {
    const tables = [
      table({ id: 1, pos_x: 0, pos_y: 0 }),
      table({ id: 2, pos_x: 0, pos_y: 0 }),
      table({ id: 3, pos_x: 200, pos_y: 200, disabled: true }),
    ];
    expect(hitTestFloorTable(tables, 10, 10)?.id).toBe(2);
    expect(hitTestFloorTable(tables, 10, 10, 2)?.id).toBe(1);
    expect(hitTestFloorTable(tables, 210, 210)).toBeNull();
    expect(hitTestFloorTable(tables, 500, 500)).toBeNull();
  });

  it('selectDropMovedEnough uses a 12px threshold', () => {
    expect(selectDropMovedEnough(0, 0, 5, 5)).toBe(false);
    expect(selectDropMovedEnough(0, 0, 20, 0)).toBe(true);
  });
});
