import { pool } from '../../db/pool';

export interface OrderItemOptionRecord {
  id: number;
  order_item_id: number;
  establishment_id: string;
  group_id: number | null;
  group_name_snapshot: string;
  choice_id: number | null;
  choice_label_snapshot: string | null;
  free_text: string | null;
  display_order: number;
  created_at: Date;
}

export interface OrderItemOptionSnapshotInput {
  group_id: number | null;
  group_name_snapshot: string;
  choice_id: number | null;
  choice_label_snapshot: string | null;
  free_text: string | null;
  display_order: number;
}

function mapRow(row: Record<string, unknown>): OrderItemOptionRecord {
  return {
    id: Number(row.id),
    order_item_id: Number(row.order_item_id),
    establishment_id: String(row.establishment_id),
    group_id: row.group_id == null ? null : Number(row.group_id),
    group_name_snapshot: String(row.group_name_snapshot),
    choice_id: row.choice_id == null ? null : Number(row.choice_id),
    choice_label_snapshot:
      typeof row.choice_label_snapshot === 'string' ? row.choice_label_snapshot : null,
    free_text: typeof row.free_text === 'string' ? row.free_text : null,
    display_order: Number(row.display_order ?? 0),
    created_at: row.created_at as Date,
  };
}

export const OrderItemOptionModel = {
  async createMany(
    orderItemId: number,
    establishmentId: string,
    snapshots: OrderItemOptionSnapshotInput[]
  ): Promise<OrderItemOptionRecord[]> {
    if (snapshots.length === 0) return [];

    const created: OrderItemOptionRecord[] = [];
    for (const snapshot of snapshots) {
      const result = await pool.query(
        `INSERT INTO order_item_options (
           order_item_id, establishment_id, group_id, group_name_snapshot,
           choice_id, choice_label_snapshot, free_text, display_order
         )
         SELECT $1, o.establishment_id, $3, $4, $5, $6, $7, $8
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE oi.id = $1 AND o.establishment_id = $2
         RETURNING order_item_options.*`,
        [
          orderItemId,
          establishmentId,
          snapshot.group_id,
          snapshot.group_name_snapshot,
          snapshot.choice_id,
          snapshot.choice_label_snapshot,
          snapshot.free_text,
          snapshot.display_order,
        ]
      );
      if (result.rows[0]) {
        created.push(mapRow(result.rows[0]));
      }
    }
    return created;
  },

  async getByOrderItemIds(
    orderItemIds: number[],
    establishmentId: string
  ): Promise<Map<number, OrderItemOptionRecord[]>> {
    const map = new Map<number, OrderItemOptionRecord[]>();
    if (orderItemIds.length === 0) return map;

    const result = await pool.query(
      `SELECT oio.*
       FROM order_item_options oio
       JOIN order_items oi ON oi.id = oio.order_item_id
       JOIN orders o ON o.id = oi.order_id
       WHERE oio.order_item_id = ANY($1::int[])
         AND o.establishment_id = $2
       ORDER BY oio.order_item_id, oio.display_order, oio.id`,
      [orderItemIds, establishmentId]
    );

    for (const row of result.rows) {
      const option = mapRow(row);
      const list = map.get(option.order_item_id) ?? [];
      list.push(option);
      map.set(option.order_item_id, list);
    }
    return map;
  },
};
