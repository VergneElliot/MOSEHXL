import { request } from './core';
import type { DiningTableStatusDto } from './floor';

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
