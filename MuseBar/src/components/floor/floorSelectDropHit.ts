import type { FloorCanvasTable } from './FloorCanvasView';

const DROP_THRESHOLD_PX = 12;

/** Map viewport client coords to floor canvas space. */
export function clientToCanvasPoint(
  clientX: number,
  clientY: number,
  viewport: DOMRect,
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } {
  return {
    x: (clientX - viewport.left - pan.x) / zoom,
    y: (clientY - viewport.top - pan.y) / zoom,
  };
}

export function hitTestFloorTable(
  tables: FloorCanvasTable[],
  canvasX: number,
  canvasY: number,
  excludeId?: number | null
): FloorCanvasTable | null {
  // Top-most: higher z ≈ later in list; walk reverse
  for (let i = tables.length - 1; i >= 0; i -= 1) {
    const t = tables[i]!;
    if (excludeId != null && t.id === excludeId) continue;
    if (t.disabled) continue;
    if (
      canvasX >= t.pos_x &&
      canvasX <= t.pos_x + t.width &&
      canvasY >= t.pos_y &&
      canvasY <= t.pos_y + t.height
    ) {
      return t;
    }
  }
  return null;
}

export function selectDropMovedEnough(
  startClientX: number,
  startClientY: number,
  clientX: number,
  clientY: number
): boolean {
  return Math.hypot(clientX - startClientX, clientY - startClientY) > DROP_THRESHOLD_PX;
}
