/**
 * Product and Category Database Models
 * Handles database operations for products and categories
 */

import { pool } from '../../app';
import { Product, Category } from '../interfaces';

export const CategoryModel = {
  async getAll(): Promise<Category[]> {
    const result = await pool.query('SELECT * FROM categories WHERE is_active = TRUE ORDER BY name');
    return result.rows;
  },

  async getAllArchived(): Promise<Category[]> {
    const result = await pool.query('SELECT * FROM categories WHERE is_active = FALSE ORDER BY name');
    return result.rows;
  },

  async getAllIncludingArchived(): Promise<Category[]> {
    const result = await pool.query('SELECT * FROM categories ORDER BY is_active DESC, name');
    return result.rows;
  },

  async getById(id: number): Promise<Category | null> {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1 AND is_active = TRUE', [id]);
    return result.rows[0] || null;
  },

  async create(name: string, default_tax_rate: number, color: string): Promise<Category> {
    const query = `
      INSERT INTO categories (name, default_tax_rate, color, is_active)
      VALUES ($1, $2, $3, TRUE)
      RETURNING *
    `;
    const values = [name, default_tax_rate, color];

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async update(id: number, name: string, default_tax_rate: number, color: string): Promise<Category | null> {
    const query = `
      UPDATE categories 
      SET name = $2, default_tax_rate = $3, color = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = TRUE
      RETURNING *
    `;
    const values = [id, name, default_tax_rate, color];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  async delete(id: number): Promise<{ deleted: boolean; action: 'hard' | 'soft'; reason?: string }> {
    // Check if category has products
    const productsResult = await pool.query('SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_active = TRUE', [id]);
    const productCount = parseInt(productsResult.rows[0].count);

    if (productCount > 0) {
      // Soft delete if category has products
      const softDeleteResult = await pool.query(
        'UPDATE categories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
      return {
        deleted: (softDeleteResult.rowCount || 0) > 0,
        action: 'soft',
        reason: `Category has ${productCount} active products`
      };
    } else {
      // Hard delete if no products
      const hardDeleteResult = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
      return {
        deleted: (hardDeleteResult.rowCount || 0) > 0,
        action: 'hard'
      };
    }
  },

  async restore(id: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE categories SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }
};

export const ProductModel = {
  async getAll(): Promise<Product[]> {
    const result = await pool.query('SELECT * FROM products WHERE is_active = TRUE ORDER BY name');
    return result.rows;
  },

  async getAllArchived(): Promise<Product[]> {
    const result = await pool.query('SELECT * FROM products WHERE is_active = FALSE ORDER BY name');
    return result.rows;
  },

  async getAllIncludingArchived(): Promise<Product[]> {
    const result = await pool.query('SELECT * FROM products ORDER BY is_active DESC, name');
    return result.rows;
  },

  async getById(id: number): Promise<Product | null> {
    const result = await pool.query('SELECT * FROM products WHERE id = $1 AND is_active = TRUE', [id]);
    return result.rows[0] || null;
  },

  async getByCategory(categoryId: number): Promise<Product[]> {
    const result = await pool.query('SELECT * FROM products WHERE category_id = $1 AND is_active = TRUE ORDER BY name', [categoryId]);
    return result.rows;
  },

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const query = `
      INSERT INTO products (
        name, price, tax_rate, category_id, happy_hour_discount_percent,
        happy_hour_discount_fixed, is_happy_hour_eligible, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING *
    `;
    const values = [
      product.name,
      product.price,
      product.tax_rate,
      product.category_id,
      product.happy_hour_discount_percent || 0,
      product.happy_hour_discount_fixed || 0,
      product.is_happy_hour_eligible
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async update(id: number, product: Partial<Product>): Promise<Product | null> {
    const fields = Object.keys(product).filter(key => key !== 'id');
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = TRUE RETURNING *`;
    const rec = product as Record<string, unknown>;
    const values = [id, ...fields.map(field => rec[field])];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  async delete(id: number): Promise<boolean> {
    // Soft delete products
    const result = await pool.query(
      'UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return (result.rowCount || 0) > 0;
  },

  async restore(id: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE products SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }
}; 