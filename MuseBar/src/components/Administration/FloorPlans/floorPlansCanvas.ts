import type * as floorApi from '../../../services/api/floor';
import type { FloorCanvasTable } from '../../floor/FloorCanvasView';
import { normalizeTableGeometry } from '../../floor/floorGeometry';

export function toCanvasTables(tables: floorApi.DiningTableDto[]): FloorCanvasTable[] {
  return tables.map((t) => ({
    id: t.id,
    label: t.label,
    ...normalizeTableGeometry(t),
    shape: t.shape || 'rectangle',
    capacity: t.capacity != null ? Number(t.capacity) : null,
  }));
}
