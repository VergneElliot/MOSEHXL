import { request } from './core';

export interface DiningTableDto {
  id: number;
  establishment_id: string;
  floor_plan_id: number;
  label: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  capacity: number | null;
  shape: string;
  sort_order: number;
  is_active: boolean;
}

function coerceGeomNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDiningTable<T extends DiningTableDto>(table: T): T {
  return {
    ...table,
    pos_x: coerceGeomNumber(table.pos_x, 0),
    pos_y: coerceGeomNumber(table.pos_y, 0),
    width: coerceGeomNumber(table.width, 80),
    height: coerceGeomNumber(table.height, 80),
    capacity: table.capacity == null ? null : coerceGeomNumber(table.capacity, 0),
    sort_order: coerceGeomNumber(table.sort_order, 0),
  };
}

export async function listDiningTables(floorPlanId?: number): Promise<DiningTableDto[]> {
  const q = floorPlanId != null ? `?plan_id=${floorPlanId}` : '';
  const res = await request<{ tables: DiningTableDto[] }>(`/floor/tables${q}`);
  return res.tables.map((t) => normalizeDiningTable(t));
}

export async function createDiningTable(input: {
  floor_plan_id: number;
  label: string;
  pos_x?: number;
  pos_y?: number;
  width?: number;
  height?: number;
  capacity?: number | null;
  shape?: string;
  sort_order?: number;
}): Promise<DiningTableDto> {
  const res = await request<{ table: DiningTableDto }>('/floor/tables', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return normalizeDiningTable(res.table);
}

export async function updateDiningTable(
  id: number,
  patch: Partial<{
    label: string;
    capacity: number | null;
    sort_order: number;
    is_active: boolean;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
    shape: string;
  }>
): Promise<DiningTableDto> {
  const res = await request<{ table: DiningTableDto }>(`/floor/tables/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return normalizeDiningTable(res.table);
}

export async function deleteDiningTable(id: number): Promise<void> {
  await request(`/floor/tables/${id}`, { method: 'DELETE' });
}
