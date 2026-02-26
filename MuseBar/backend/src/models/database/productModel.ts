/**
 * Product and Category Database Models
 * All queries are scoped to a specific establishment — cross-tenant data access is impossible.
 */

import { pool } from '../../app';
import { Product, Category } from '../interfaces';

export const CategoryModel = {
  async getAll(establishmentId: string): Promise<Category[]> {
    const result = await pool.query(
      'SELECT * FROM categories WHERE is_active = TRUE AND establishment_id = $1 ORDER BY name',
      [establishmentId]
    );
    return result.rows;
  },

  async getAllArchived(establishmentId: string): Promise<Category[]> {
    const result = await pool.query(
      'SELECT * FROM categories WHERE is_active = FALSE AND establishment_id = $1 ORDER BY name',
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
      'SELECT * FROM categories WHERE id = $1 AND is_active = TRUE AND establishment_id = $2',
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

  async update(id: number, name: string, default_tax_rate: number, color: string, establishmentId: string): Promise<Category | null> {
    const result = await pool.query(
      `UPDATE categories
       SET name = $2, default_tax_rate = $3, color = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_active = TRUE AND establishment_id = $5
       RETURNING *`,
      [id, name, default_tax_rate, color, establishmentId]
    );
    return result.rows[0] || null;
  },

  async delete(id: number, establishmentId: string): Promise<{ deleted: boolean; action: 'hard' | 'soft'; reason?: string }> {
    const productsResult = await pool.query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_active = TRUE AND establishment_id = $2',
      [id, establishmentId]
    );
    const productCount = parseInt(productsResult.rows[0].count);

    if (productCount > 0) {
      const softDeleteResult = await pool.query(
        'UPDATE categories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND establishment_id = $2',
        [id, establishmentId]
      );
      return {
        deleted: (softDeleteResult.rowCount || 0) > 0,
        action: 'soft',
        reason: `Category has ${productCount} active products`,
      };
    } else {
      const hardDeleteResult = await pool.query(
        'DELETE FROM categories WHERE id = $1 AND establishment_id = $2',
        [id, establishmentId]
      );
      return {
        deleted: (hardDeleteResult.rowCount || 0) > 0,
        action: 'hard',
      };
    }
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
      'SELECT * FROM products WHERE is_active = TRUE AND establishment_id = $1 ORDER BY name',
      [establishmentId]
    );
    return result.rows;
  },

  async getAllArchived(establishmentId: string): Promise<Product[]> {
    const result = await pool.query(
      'SELECT * FROM products WHERE is_active = FALSE AND establishment_id = $1 ORDER BY name',
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
      'SELECT * FROM products WHERE id = $1 AND is_active = TRUE AND establishment_id = $2',
      [id, establishmentId]
    );
    return result.rows[0] || null;
  },

  async getByCategory(categoryId: number, establishmentId: string): Promise<Product[]> {
    const result = await pool.query(
      'SELECT * FROM products WHERE category_id = $1 AND is_active = TRUE AND establishment_id = $2 ORDER BY name',
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
    const fields = Object.keys(product).filter(key => key !== 'id' && key !== 'establishment_id');
    const setClause = fields.map((field, index) => `${field} = $${index + 3}`).join(', ');
    const query = `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND establishment_id = $2 AND is_active = TRUE RETURNING *`;
    const rec = product as Record<string, unknown>;
    const values = [id, establishmentId, ...fields.map(field => rec[field])];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  async delete(id: number, establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND establishment_id = $2',
      [id, establishmentId]
    );
    return (result.rowCount || 0) > 0;
  },

  async restore(id: number, establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE products SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND establishment_id = $2',
      [id, establishmentId]
    );
    return (result.rowCount || 0) > 0;
  },
};
