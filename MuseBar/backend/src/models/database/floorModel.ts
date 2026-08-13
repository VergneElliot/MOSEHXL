import { pool } from '../../db/pool';

export interface FloorPlan {
  id: number;
  establishment_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DiningTable {
  id: number;
  establishment_id: string;
  floor_plan_id: number;
  label: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  capacity: number | null;
  shape: 'rectangle' | 'circle' | 'square';
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const FloorPlanModel = {
  async list(establishmentId: string): Promise<FloorPlan[]> {
    const result = await pool.query(
      `SELECT * FROM floor_plans
       WHERE establishment_id = $1
       ORDER BY display_order ASC, id ASC`,
      [establishmentId]
    );
    return result.rows as FloorPlan[];
  },

  async get(id: number, establishmentId: string): Promise<FloorPlan | null> {
    const result = await pool.query(
      `SELECT * FROM floor_plans WHERE id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    return (result.rows[0] as FloorPlan | undefined) ?? null;
  },

  async create(
    establishmentId: string,
    input: { name: string; display_order?: number; is_active?: boolean }
  ): Promise<FloorPlan> {
    const result = await pool.query(
      `INSERT INTO floor_plans (establishment_id, name, display_order, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        establishmentId,
        input.name,
        input.display_order ?? 0,
        input.is_active !== false,
      ]
    );
    return result.rows[0] as FloorPlan;
  },

  async update(
    id: number,
    establishmentId: string,
    patch: Partial<Pick<FloorPlan, 'name' | 'display_order' | 'is_active'>>
  ): Promise<FloorPlan | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of ['name', 'display_order', 'is_active'] as const) {
      if (patch[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(patch[key]);
      }
    }
    if (fields.length === 0) return this.get(id, establishmentId);
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, establishmentId);
    const result = await pool.query(
      `UPDATE floor_plans SET ${fields.join(', ')}
       WHERE id = $${i++} AND establishment_id = $${i}
       RETURNING *`,
      values
    );
    return (result.rows[0] as FloorPlan | undefined) ?? null;
  },

  async delete(id: number, establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM floor_plans WHERE id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    return (result.rowCount || 0) > 0;
  },
};

export const DiningTableModel = {
  async list(
    establishmentId: string,
    floorPlanId?: number
  ): Promise<DiningTable[]> {
    if (floorPlanId != null) {
      const result = await pool.query(
        `SELECT * FROM dining_tables
         WHERE establishment_id = $1 AND floor_plan_id = $2
         ORDER BY sort_order ASC, id ASC`,
        [establishmentId, floorPlanId]
      );
      return result.rows as DiningTable[];
    }
    const result = await pool.query(
      `SELECT * FROM dining_tables
       WHERE establishment_id = $1
       ORDER BY floor_plan_id ASC, sort_order ASC, id ASC`,
      [establishmentId]
    );
    return result.rows as DiningTable[];
  },

  async get(id: number, establishmentId: string): Promise<DiningTable | null> {
    const result = await pool.query(
      `SELECT * FROM dining_tables WHERE id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    return (result.rows[0] as DiningTable | undefined) ?? null;
  },

  async create(
    establishmentId: string,
    input: {
      floor_plan_id: number;
      label: string;
      pos_x?: number;
      pos_y?: number;
      width?: number;
      height?: number;
      capacity?: number | null;
      shape?: DiningTable['shape'];
      sort_order?: number;
      is_active?: boolean;
    }
  ): Promise<DiningTable> {
    const result = await pool.query(
      `INSERT INTO dining_tables (
         establishment_id, floor_plan_id, label, pos_x, pos_y, width, height,
         capacity, shape, sort_order, is_active
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        establishmentId,
        input.floor_plan_id,
        input.label,
        input.pos_x ?? 0,
        input.pos_y ?? 0,
        input.width ?? 80,
        input.height ?? 80,
        input.capacity ?? null,
        input.shape ?? 'rectangle',
        input.sort_order ?? 0,
        input.is_active !== false,
      ]
    );
    return result.rows[0] as DiningTable;
  },

  async update(
    id: number,
    establishmentId: string,
    patch: Partial<
      Pick<
        DiningTable,
        | 'label'
        | 'pos_x'
        | 'pos_y'
        | 'width'
        | 'height'
        | 'capacity'
        | 'shape'
        | 'sort_order'
        | 'is_active'
        | 'floor_plan_id'
      >
    >
  ): Promise<DiningTable | null> {
    const allowed = [
      'label',
      'pos_x',
      'pos_y',
      'width',
      'height',
      'capacity',
      'shape',
      'sort_order',
      'is_active',
      'floor_plan_id',
    ] as const;
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of allowed) {
      if (patch[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(patch[key]);
      }
    }
    if (fields.length === 0) return this.get(id, establishmentId);
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, establishmentId);
    const result = await pool.query(
      `UPDATE dining_tables SET ${fields.join(', ')}
       WHERE id = $${i++} AND establishment_id = $${i}
       RETURNING *`,
      values
    );
    return (result.rows[0] as DiningTable | undefined) ?? null;
  },

  async delete(id: number, establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM dining_tables WHERE id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    return (result.rowCount || 0) > 0;
  },

  async listStatus(establishmentId: string): Promise<
    Array<
      DiningTable & {
        open_ticket_id: number | null;
        open_ticket_updated_at: Date | null;
        opened_by_user_id: number | null;
        last_served_by_user_id: number | null;
      }
    >
  > {
    const result = await pool.query(
      `SELECT t.*,
              ot.id AS open_ticket_id,
              ot.updated_at AS open_ticket_updated_at,
              ot.opened_by_user_id,
              ot.last_served_by_user_id
       FROM dining_tables t
       LEFT JOIN open_tickets ot
         ON ot.dining_table_id = t.id AND ot.status = 'open'
       WHERE t.establishment_id = $1 AND t.is_active = TRUE
       ORDER BY t.floor_plan_id ASC, t.sort_order ASC, t.id ASC`,
      [establishmentId]
    );
    return result.rows;
  },
};
