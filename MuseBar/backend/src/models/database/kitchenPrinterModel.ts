import { pool } from '../../db/pool';

export type KitchenPrinterConnectionType = 'bridge' | 'network_escpos';

export interface KitchenPrinter {
  id: number;
  establishment_id: string;
  name: string;
  slug: string;
  connection_type: KitchenPrinterConnectionType;
  connection_config: Record<string, unknown>;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateKitchenPrinterInput {
  name: string;
  slug?: string;
  connection_type?: KitchenPrinterConnectionType;
  connection_config?: Record<string, unknown>;
  display_order?: number;
}

export interface UpdateKitchenPrinterInput {
  name?: string;
  slug?: string;
  connection_type?: KitchenPrinterConnectionType;
  connection_config?: Record<string, unknown>;
  display_order?: number;
  is_active?: boolean;
}

export function slugifyKitchenPrinterName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return slug.length > 0 ? slug : 'printer';
}

function mapPrinter(row: Record<string, unknown>): KitchenPrinter {
  return {
    id: Number(row.id),
    establishment_id: String(row.establishment_id),
    name: String(row.name),
    slug: String(row.slug),
    connection_type: row.connection_type as KitchenPrinterConnectionType,
    connection_config:
      row.connection_config && typeof row.connection_config === 'object' && !Array.isArray(row.connection_config)
        ? (row.connection_config as Record<string, unknown>)
        : {},
    display_order: Number(row.display_order ?? 0),
    is_active: row.is_active !== false,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

export const KitchenPrinterModel = {
  async getAllActive(establishmentId: string): Promise<KitchenPrinter[]> {
    const result = await pool.query(
      `SELECT *
       FROM kitchen_printers
       WHERE establishment_id = $1
         AND is_active = TRUE
       ORDER BY display_order, name, id`,
      [establishmentId]
    );
    return result.rows.map(mapPrinter);
  },

  async getById(id: number, establishmentId: string): Promise<KitchenPrinter | null> {
    const result = await pool.query(
      `SELECT *
       FROM kitchen_printers
       WHERE id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    if (result.rows.length === 0) return null;
    return mapPrinter(result.rows[0]);
  },

  async create(input: CreateKitchenPrinterInput, establishmentId: string): Promise<KitchenPrinter> {
    const slug = (input.slug?.trim() || slugifyKitchenPrinterName(input.name)).toLowerCase();
    const result = await pool.query(
      `INSERT INTO kitchen_printers (
         establishment_id, name, slug, connection_type, connection_config, display_order
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING *`,
      [
        establishmentId,
        input.name.trim(),
        slug,
        input.connection_type ?? 'bridge',
        JSON.stringify(input.connection_config ?? {}),
        input.display_order ?? 0,
      ]
    );
    return mapPrinter(result.rows[0]);
  },

  async update(
    id: number,
    input: UpdateKitchenPrinterInput,
    establishmentId: string
  ): Promise<KitchenPrinter | null> {
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: unknown[] = [id, establishmentId];
    let paramIndex = 3;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name.trim());
    }
    if (input.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      values.push(input.slug.trim().toLowerCase());
    }
    if (input.connection_type !== undefined) {
      updates.push(`connection_type = $${paramIndex++}`);
      values.push(input.connection_type);
    }
    if (input.connection_config !== undefined) {
      updates.push(`connection_config = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(input.connection_config));
    }
    if (input.display_order !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(input.display_order);
    }
    if (input.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }

    if (updates.length === 1) {
      return this.getById(id, establishmentId);
    }

    const result = await pool.query(
      `UPDATE kitchen_printers
       SET ${updates.join(', ')}
       WHERE id = $1 AND establishment_id = $2
       RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return mapPrinter(result.rows[0]);
  },

  async delete(id: number, establishmentId: string): Promise<{ deleted: boolean; action: 'hard' | 'soft' }> {
    const assignmentCount = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM product_kitchen_printers
       WHERE kitchen_printer_id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    const assigned = Number(assignmentCount.rows[0]?.count ?? 0) > 0;
    if (assigned) {
      const result = await pool.query(
        `UPDATE kitchen_printers
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND establishment_id = $2`,
        [id, establishmentId]
      );
      return { deleted: (result.rowCount || 0) > 0, action: 'soft' };
    }

    const result = await pool.query(
      `DELETE FROM kitchen_printers WHERE id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    return { deleted: (result.rowCount || 0) > 0, action: 'hard' };
  },

  async getAssignmentsForProducts(
    establishmentId: string,
    productIds: number[]
  ): Promise<Map<number, KitchenPrinter[]>> {
    const map = new Map<number, KitchenPrinter[]>();
    if (productIds.length === 0) return map;

    const result = await pool.query(
      `SELECT pkp.product_id, kp.*
       FROM product_kitchen_printers pkp
       JOIN kitchen_printers kp ON kp.id = pkp.kitchen_printer_id
       WHERE pkp.establishment_id = $1
         AND pkp.product_id = ANY($2::int[])
         AND kp.is_active = TRUE
       ORDER BY kp.display_order, kp.name, kp.id`,
      [establishmentId, productIds]
    );

    for (const row of result.rows) {
      const productId = Number(row.product_id);
      const printer = mapPrinter(row);
      const list = map.get(productId) ?? [];
      list.push(printer);
      map.set(productId, list);
    }
    return map;
  },

  async setProductAssignments(
    productId: number,
    printerIds: number[],
    establishmentId: string
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM product_kitchen_printers
         WHERE product_id = $1 AND establishment_id = $2`,
        [productId, establishmentId]
      );

      if (printerIds.length > 0) {
        const validPrinters = await client.query(
          `SELECT id
           FROM kitchen_printers
           WHERE establishment_id = $1
             AND is_active = TRUE
             AND id = ANY($2::int[])`,
          [establishmentId, printerIds]
        );
        const validIds = validPrinters.rows.map((row) => Number(row.id));
        for (const printerId of validIds) {
          await client.query(
            `INSERT INTO product_kitchen_printers (product_id, kitchen_printer_id, establishment_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (product_id, kitchen_printer_id) DO NOTHING`,
            [productId, printerId, establishmentId]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
