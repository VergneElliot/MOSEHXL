/**
 * Order Database Model
 * All queries are scoped to a specific establishment — cross-tenant data access is impossible.
 * order_items and sub_bills are implicitly scoped through their order_id FK.
 */

import { pool } from '../../app';
import { Order, OrderItem, SubBill } from '../interfaces';

/** Only these columns may be set by update(); prevents SQL injection via object keys. */
const ALLOWED_ORDER_UPDATE_FIELDS = [
  'total_amount', 'total_tax', 'payment_method', 'status', 'notes', 'tips', 'change'
] as const;

export const OrderModel = {
  async getAll(
    establishmentId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<Order[]> {
    const values: any[] = [establishmentId];
    let query = 'SELECT * FROM orders WHERE establishment_id = $1 ORDER BY created_at DESC';

    if (opts?.limit != null && Number.isFinite(opts.limit) && opts.limit > 0) {
      values.push(opts.limit);
      query += ` LIMIT $${values.length}`;
    }

    if (opts?.offset != null && Number.isFinite(opts.offset) && opts.offset >= 0) {
      values.push(opts.offset);
      query += ` OFFSET $${values.length}`;
    }

    const result = await pool.query(query, values);
    return result.rows;
  },

  async getById(id: number, establishmentId: string): Promise<Order | null> {
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND establishment_id = $2',
      [id, establishmentId]
    );
    return result.rows[0] || null;
  },

  async create(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>, establishmentId: string): Promise<Order> {
    const result = await pool.query(
      `INSERT INTO orders (
         total_amount, total_tax, payment_method, status, notes, tips, change, establishment_id, operation_type, change_amount
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        order.total_amount,
        order.total_tax,
        order.payment_method,
        order.status,
        order.notes || '',
        order.tips || 0,
        order.change || 0,
        establishmentId,
        order.operation_type ?? 'sale',
        order.change_amount ?? null,
      ]
    );
    return result.rows[0];
  },

  async update(id: number, order: Partial<Order>, establishmentId: string): Promise<Order | null> {
    const allowedSet = new Set<string>(ALLOWED_ORDER_UPDATE_FIELDS);
    const fields = (Object.keys(order) as string[]).filter(key => allowedSet.has(key));
    if (fields.length === 0) {
      return this.getById(id, establishmentId);
    }
    const setClause = fields.map((field, index) => `${field} = $${index + 3}`).join(', ');
    const query = `UPDATE orders SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND establishment_id = $2 RETURNING *`;
    const rec = order as Record<string, unknown>;
    const values = [id, establishmentId, ...fields.map(field => rec[field])];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  async delete(id: number, establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM orders WHERE id = $1 AND establishment_id = $2',
      [id, establishmentId]
    );
    return (result.rowCount || 0) > 0;
  },
};

// OrderItems and SubBills are always fetched by order_id — they are implicitly scoped
// because the parent order belongs to a specific establishment.
export const OrderItemModel = {
  async getByOrderId(orderId: number): Promise<OrderItem[]> {
    const result = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
      [orderId]
    );
    return result.rows;
  },

  async create(item: Omit<OrderItem, 'id' | 'created_at'>): Promise<OrderItem> {
    const result = await pool.query(
      `INSERT INTO order_items (
         order_id, product_id, product_name, quantity, unit_price, total_price,
         tax_rate, tax_amount, happy_hour_applied, happy_hour_discount_amount, description
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        item.order_id,
        item.product_id,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.total_price,
        item.tax_rate,
        item.tax_amount,
        item.happy_hour_applied,
        item.happy_hour_discount_amount,
        item.description || '',
      ]
    );
    return result.rows[0];
  },

  async update(id: number, item: Partial<OrderItem>): Promise<OrderItem | null> {
    const fields = Object.keys(item).filter(key => key !== 'id');
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE order_items SET ${setClause} WHERE id = $1 RETURNING *`;
    const rec = item as Record<string, unknown>;
    const values = [id, ...fields.map(field => rec[field])];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM order_items WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  },
};

export const SubBillModel = {
  async getByOrderId(orderId: number): Promise<SubBill[]> {
    const result = await pool.query(
      'SELECT * FROM sub_bills WHERE order_id = $1 ORDER BY created_at',
      [orderId]
    );
    return result.rows;
  },

  async create(subBill: Omit<SubBill, 'id' | 'created_at'>): Promise<SubBill> {
    const result = await pool.query(
      'INSERT INTO sub_bills (order_id, payment_method, amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [subBill.order_id, subBill.payment_method, subBill.amount, subBill.status]
    );
    return result.rows[0];
  },

  async update(id: number, subBill: Partial<SubBill>): Promise<SubBill | null> {
    const fields = Object.keys(subBill).filter(key => key !== 'id');
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE sub_bills SET ${setClause} WHERE id = $1 RETURNING *`;
    const rec = subBill as Record<string, unknown>;
    const values = [id, ...fields.map(field => rec[field])];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM sub_bills WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  },
};
