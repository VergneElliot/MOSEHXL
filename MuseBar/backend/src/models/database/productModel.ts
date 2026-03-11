/**
 * Product and Category Database Models
 * Multi-tenant via establishment_id column — same pattern as OrderModel.
 */

import { pool } from '../../app';
import { Product, Category } from '../interfaces';

/** Only these columns may be set by ProductModel.update(); prevents SQL injection via object keys. */
const ALLOWED_PRODUCT_UPDATE_FIELDS = [
  'name', 'price', 'tax_rate', 'category_id',
  'happy_hour_discount_percent', 'happy_hour_discount_fixed', 'is_happy_hour_eligible', 'is_active'
] as const;

export const CategoryModel = {
  async getAll(establishmentId: string): Promise<Category[]> {
    const result = await pool.query(
      'SELECT * FROM categories WHERE establishment_id = $1 AND is_active = TRUE ORDER BY name',
      [establishmentId]
    );
    return result.rows;
  },

  async getAllArchived(establishmentId: string): Promise<Category[]> {
    const result = await pool.query(
      'SELECT * FROM categories WHERE establishment_id = $1 AND is_active = FALSE ORDER BY name',
      [establishmentId]
    );
    return result.rows;
  },

  async getAllIncludingArchived(establishmentId: string): Promise<Category[]> {
    const result = await pool.query(
      'SELECT * FROM categories WHERE establishment_id = $1 ORDER BY is_active DESC, name',
      [establishmentId]
    );
    return result.rows;
  },

  async getById(id: number, establishmentId: string): Promise<Category | null> {
    const result = await pool.query(
      'SELECT * FROM categories WHERE id = $1 AND establishment_id = $2 AND is_active = TRUE',
      [id, establishmentId]
    );
    return result.rows[0] || null;
  },

  async create(name: string, default_tax_rate: number, color: string, establishmentId: string): Promise<Category> {
    const result = await pool.query(
      `INSERT INTO categories (name, default_tax_rate, color, is_active, establishment_id)
       VALUES ($1, $2, $3, TRUE, $4)
       RETURNING *`,
      [name, default_tax_rate, color, establishmentId]
    );
    return result.rows[0];
  },

  async update(id: number, name: string | undefined, default_tax_rate: number | undefined, color: string | undefined, establishmentId: string, is_active?: boolean): Promise<Category | null> {
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: unknown[] = [id, establishmentId];
    let paramIndex = 3;
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (default_tax_rate !== undefined) {
      updates.push(`default_tax_rate = $${paramIndex++}`);
      values.push(default_tax_rate);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (updates.length <= 1) return this.getById(id, establishmentId);
    const setClause = updates.join(', ');
    const result = await pool.query(
      `UPDATE categories SET ${setClause} WHERE id = $1 AND establishment_id = $2 RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: number, establishmentId: string): Promise<{ deleted: boolean; action: 'hard' | 'soft'; reason?: string }> {
    const orderItemsResult = await pool.query(
      `SELECT COUNT(*) FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE p.category_id = $1 AND o.establishment_id = $2`,
      [id, establishmentId]
    );
    const usedInOrders = parseInt(orderItemsResult.rows[0].count, 10) > 0;
    const productsResult = await pool.query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1 AND establishment_id = $2 AND is_active = TRUE',
      [id, establishmentId]
    );
    const productCount = parseInt(productsResult.rows[0].count);

    if (usedInOrders || productCount > 0) {
      const softDeleteResult = await pool.query(
        'UPDATE categories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND establishment_id = $2',
        [id, establishmentId]
      );
      return {
        deleted: (softDeleteResult.rowCount || 0) > 0,
        action: 'soft',
        reason: usedInOrders
          ? 'Category used in past orders (legal retention)'
          : `Category has ${productCount} active products`,
      };
    }
    const hardDeleteResult = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND establishment_id = $2',
      [id, establishmentId]
    );
    return {
      deleted: (hardDeleteResult.rowCount || 0) > 0,
      action: 'hard',
    };
  },

  async restore(id: number, establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE categories SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND establishment_id = $2',
      [id, establishmentId]
    );
    return (result.rowCount || 0) > 0;
  },
};

export const ProductModel = {
  async getAll(establishmentId: string): Promise<Product[]> {
    const result = await pool.query(
      'SELECT * FROM products WHERE establishment_id = $1 AND is_active = TRUE ORDER BY name',
      [establishmentId]
    );
    return result.rows;
  },

  async getAllArchived(establishmentId: string): Promise<Product[]> {
    const result = await pool.query(
      'SELECT * FROM products WHERE establishment_id = $1 AND is_active = FALSE ORDER BY name',
      [establishmentId]
    );
    return result.rows;
  },

  async getAllIncludingArchived(establishmentId: string): Promise<Product[]> {
    const result = await pool.query(
      'SELECT * FROM products WHERE establishment_id = $1 ORDER BY is_active DESC, name',
      [establishmentId]
    );
    return result.rows;
  },

  async getById(id: number, establishmentId: string): Promise<Product | null> {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND establishment_id = $2 AND is_active = TRUE',
      [id, establishmentId]
    );
    return result.rows[0] || null;
  },

  async getByCategory(categoryId: number, establishmentId: string): Promise<Product[]> {
    const result = await pool.query(
      'SELECT * FROM products WHERE category_id = $1 AND establishment_id = $2 AND is_active = TRUE ORDER BY name',
      [categoryId, establishmentId]
    );
    return result.rows;
  },

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>, establishmentId: string): Promise<Product> {
    const result = await pool.query(
      `INSERT INTO products (
         name, price, tax_rate, category_id, happy_hour_discount_percent,
         happy_hour_discount_fixed, is_happy_hour_eligible, is_active, establishment_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
       RETURNING *`,
      [
        product.name,
        product.price,
        product.tax_rate,
        product.category_id,
        product.happy_hour_discount_percent || 0,
        product.happy_hour_discount_fixed || 0,
        product.is_happy_hour_eligible,
        establishmentId,
      ]
    );
    return result.rows[0];
  },

  async update(id: number, product: Partial<Product>, establishmentId: string): Promise<Product | null> {
    const allowedSet = new Set<string>(ALLOWED_PRODUCT_UPDATE_FIELDS);
    const fields = (Object.keys(product) as string[]).filter(key => allowedSet.has(key));
    if (fields.length === 0) {
      return this.getById(id, establishmentId);
    }
    const setClause = fields.map((field, index) => `${field} = $${index + 3}`).join(', ');
    const query = `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND establishment_id = $2 AND is_active = TRUE RETURNING *`;
    const rec = product as Record<string, unknown>;
    const values = [id, establishmentId, ...fields.map(field => rec[field])];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  async delete(id: number, establishmentId: string): Promise<{ deleted: boolean; action: 'hard' | 'soft' }> {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = $1 AND o.establishment_id = $2`,
      [id, establishmentId]
    );
    const usedInOrders = parseInt(countResult.rows[0].count, 10) > 0;
    if (usedInOrders) {
      const result = await pool.query(
        'UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND establishment_id = $2',
        [id, establishmentId]
      );
      return { deleted: (result.rowCount || 0) > 0, action: 'soft' };
    }
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND establishment_id = $2',
      [id, establishmentId]
    );
    return { deleted: (result.rowCount || 0) > 0, action: 'hard' };
  },

  async restore(id: number, establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE products SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND establishment_id = $2',
      [id, establishmentId]
    );
    return (result.rowCount || 0) > 0;
  },
};
