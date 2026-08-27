/** Shared floor canvas geometry helpers (Admin editor + POS map). */

export const FLOOR_CANVAS_WIDTH = 1600;
export const FLOOR_CANVAS_HEIGHT = 1000;
export const FLOOR_GRID = 20;

export type TableShape = 'rectangle' | 'square' | 'circle';

export type SizePreset = 'S' | 'M' | 'L';

export const SIZE_PRESETS: Record<SizePreset, { width: number; height: number }> = {
  S: { width: 64, height: 64 },
  M: { width: 88, height: 88 },
  L: { width: 120, height: 88 },
};

export function snap(value: number, enabled: boolean, grid = FLOOR_GRID): number {
  if (!enabled) return value;
  return Math.round(value / grid) * grid;
}

export function clampTableRect(
  x: number,
  y: number,
  width: number,
  height: number
): { pos_x: number; pos_y: number; width: number; height: number } {
  const w = Math.max(40, Math.min(width, FLOOR_CANVAS_WIDTH));
  const h = Math.max(40, Math.min(height, FLOOR_CANVAS_HEIGHT));
  const pos_x = Math.max(0, Math.min(x, FLOOR_CANVAS_WIDTH - w));
  const pos_y = Math.max(0, Math.min(y, FLOOR_CANVAS_HEIGHT - h));
  return { pos_x, pos_y, width: w, height: h };
}

export function detectSizePreset(width: number, height: number): SizePreset | 'custom' {
  for (const key of Object.keys(SIZE_PRESETS) as SizePreset[]) {
    const p = SIZE_PRESETS[key];
    if (Math.abs(p.width - width) < 2 && Math.abs(p.height - height) < 2) return key;
  }
  return 'custom';
}

export function nextTableLabel(existing: string[]): string {
  const used = new Set(existing.map((l) => l.trim()));
  let n = 1;
  while (used.has(String(n))) n += 1;
  return String(n);
}

export function gridPlacement(
  index: number,
  cols = 4,
  cellW = 100,
  cellH = 100,
  originX = 40,
  originY = 40
): { pos_x: number; pos_y: number } {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { pos_x: originX + col * cellW, pos_y: originY + row * cellH };
}
