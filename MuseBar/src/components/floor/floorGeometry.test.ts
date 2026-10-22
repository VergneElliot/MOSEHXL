import { describe, expect, it } from 'vitest';
import {
  FLOOR_CANVAS_HEIGHT,
  FLOOR_CANVAS_WIDTH,
  FLOOR_GRID,
  SIZE_PRESETS,
  asGeomNumber,
  clampTableRect,
  detectSizePreset,
  gridPlacement,
  nextTableLabel,
  normalizeTableGeometry,
  snap,
} from './floorGeometry';

describe('floorGeometry', () => {
  it('snap respects enabled flag and grid', () => {
    expect(snap(37, false)).toBe(37);
    expect(snap(37, true)).toBe(40);
    expect(snap(37, true, 10)).toBe(40);
    expect(snap(0, true, FLOOR_GRID)).toBe(0);
  });

  it('asGeomNumber coerces strings and falls back', () => {
    expect(asGeomNumber(12, 1)).toBe(12);
    expect(asGeomNumber('88', 1)).toBe(88);
    expect(asGeomNumber('x', 7)).toBe(7);
    expect(asGeomNumber(NaN, 3)).toBe(3);
  });

  it('normalizeTableGeometry applies defaults', () => {
    expect(normalizeTableGeometry({})).toEqual({
      pos_x: 40,
      pos_y: 40,
      width: SIZE_PRESETS.M.width,
      height: SIZE_PRESETS.M.height,
    });
    expect(normalizeTableGeometry({ pos_x: '10', pos_y: '20', width: '64', height: '64' })).toEqual({
      pos_x: 10,
      pos_y: 20,
      width: 64,
      height: 64,
    });
  });

  it('clampTableRect keeps tables inside the canvas', () => {
    expect(clampTableRect(-10, -10, 30, 30)).toEqual({
      pos_x: 0,
      pos_y: 0,
      width: 40,
      height: 40,
    });
    const huge = clampTableRect(0, 0, FLOOR_CANVAS_WIDTH + 50, FLOOR_CANVAS_HEIGHT + 50);
    expect(huge.width).toBe(FLOOR_CANVAS_WIDTH);
    expect(huge.height).toBe(FLOOR_CANVAS_HEIGHT);
    expect(huge.pos_x).toBe(0);
    expect(huge.pos_y).toBe(0);
  });

  it('detectSizePreset matches known sizes', () => {
    expect(detectSizePreset(SIZE_PRESETS.S.width, SIZE_PRESETS.S.height)).toBe('S');
    expect(detectSizePreset(SIZE_PRESETS.L.width, SIZE_PRESETS.L.height)).toBe('L');
    expect(detectSizePreset(99, 99)).toBe('custom');
  });

  it('nextTableLabel skips used numeric labels', () => {
    expect(nextTableLabel([])).toBe('1');
    expect(nextTableLabel(['1', ' 2 ', '4'])).toBe('3');
  });

  it('gridPlacement lays out by columns', () => {
    expect(gridPlacement(0)).toEqual({ pos_x: 40, pos_y: 40 });
    expect(gridPlacement(4)).toEqual({ pos_x: 40, pos_y: 140 });
    expect(gridPlacement(5, 4, 100, 100, 0, 0)).toEqual({ pos_x: 100, pos_y: 100 });
  });
});
