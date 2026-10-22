import { request } from './core';

export interface DiningTableStatusDto {
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
  open_ticket_id: number | null;
  open_ticket_updated_at: string | null;
  opened_by_user_id: number | null;
  last_served_by_user_id: number | null;
  /** True when the open ticket has at least one validated line (service en cours). */
  has_validated_items: boolean;
  /** Draft or validated lines — not free for transfer. */
  has_active_items?: boolean;
}

function coerce(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** GET /floor/status — occupancy includes has_active_items (draft|validated). */
export async function getFloorStatus(): Promise<DiningTableStatusDto[]> {
  const res = await request<{ tables: DiningTableStatusDto[] }>('/floor/status');
  return res.tables.map((t) => ({
    ...t,
    pos_x: coerce(t.pos_x, 0),
    pos_y: coerce(t.pos_y, 0),
    width: coerce(t.width, 80),
    height: coerce(t.height, 80),
    capacity: t.capacity == null ? null : coerce(t.capacity, 0),
    sort_order: coerce(t.sort_order, 0),
    open_ticket_id: t.open_ticket_id ?? null,
    open_ticket_updated_at: t.open_ticket_updated_at ?? null,
    opened_by_user_id: t.opened_by_user_id ?? null,
    last_served_by_user_id: t.last_served_by_user_id ?? null,
    has_validated_items: t.has_validated_items === true,
    has_active_items: t.has_active_items === true,
  }));
}
