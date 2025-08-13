/**
 * Order Database Model
 * Handles database operations for orders
 */

import { pool } from '../../app';
import { Order, OrderItem, SubBill } from '../interfaces';

export const OrderModel = {
  async getAll(): Promise<Order[]> {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    return result.rows;
  },

  async getById(id: number): Promise<Order | null> {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    const query = `
      INSERT INTO orders (
        total_amount, total_tax, payment_method, status, notes, tips, change
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      order.total_amount,
      order.total_tax,
      order.payment_method,
      order.status,
      order.notes || '',
      order.tips || 0,
      order.change || 0
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async update(id: number, order: Partial<Order>): Promise<Order | null> {
    const fields = Object.keys(order).filter(key => key !== 'id');
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE orders SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
    const rec = order as Record<string, unknown>;
    const values = [id, ...fields.map(field => rec[field])];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM orders WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }
};

export const OrderItemModel = {
  async getByOrderId(orderId: number): Promise<OrderItem[]> {
    const result = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [orderId]);
    return result.rows;
  },

  async create(item: Omit<OrderItem, 'id' | 'created_at'>): Promise<OrderItem> {
    const query = `
      INSERT INTO order_items (
        order_id, product_id, product_name, quantity, unit_price, total_price,
        tax_rate, tax_amount, happy_hour_applied, happy_hour_discount_amount, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
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
      item.description || ''
    ];

    const result = await pool.query(query, values);
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
  }
};

export const SubBillModel = {
  async getByOrderId(orderId: number): Promise<SubBill[]> {
    const result = await pool.query('SELECT * FROM sub_bills WHERE order_id = $1 ORDER BY created_at', [orderId]);
    return result.rows;
  },

  async create(subBill: Omit<SubBill, 'id' | 'created_at'>): Promise<SubBill> {
    const query = `
      INSERT INTO sub_bills (order_id, payment_method, amount, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [subBill.order_id, subBill.payment_method, subBill.amount, subBill.status];

    const result = await pool.query(query, values);
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
  }
}; 