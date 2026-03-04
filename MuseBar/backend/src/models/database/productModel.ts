/**
 * Product and Category Database Models
 * All queries run against the establishment-specific schema so each tenant only sees its own data.
 */

import { pool } from '../../app';
import { Product, Category } from '../interfaces';
import { EstablishmentModel } from '../establishment';

/** Only these columns may be set by ProductModel.update(); prevents SQL injection via object keys. */
const ALLOWED_PRODUCT_UPDATE_FIELDS = [
  'name', 'price', 'tax_rate', 'category_id',
  'happy_hour_discount_percent', 'happy_hour_discount_fixed', 'is_happy_hour_eligible', 'is_active'
] as const;

async function schemaFor(establishmentId: string): Promise<string> {
  return EstablishmentModel.getSchemaNameForEstablishment(establishmentId);
}

export const CategoryModel = {
  async getAll(establishmentId: string): Promise<Category[]> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `SELECT * FROM "${schema}".categories WHERE is_active = TRUE ORDER BY name`,
      []
    );
    return result.rows;
  },

  async getAllArchived(establishmentId: string): Promise<Category[]> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `SELECT * FROM "${schema}".categories WHERE is_active = FALSE ORDER BY name`,
      []
    );
    return result.rows;
  },

  async getAllIncludingArchived(establishmentId: string): Promise<Category[]> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `SELECT * FROM "${schema}".categories ORDER BY is_active DESC, name`,
      []
    );
    return result.rows;
  },

  async getById(id: number, establishmentId: string): Promise<Category | null> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `SELECT * FROM "${schema}".categories WHERE id = $1 AND is_active = TRUE`,
      [id]
    );
    return result.rows[0] || null;
  },

  async create(name: string, default_tax_rate: number, color: string, establishmentId: string): Promise<Category> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `INSERT INTO "${schema}".categories (name, default_tax_rate, color, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING *`,
      [name, default_tax_rate, color]
    );
    return result.rows[0];
  },

  async update(id: number, name: string, default_tax_rate: number, color: string, establishmentId: string): Promise<Category | null> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `UPDATE "${schema}".categories
       SET name = $2, default_tax_rate = $3, color = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_active = TRUE
       RETURNING *`,
      [id, name, default_tax_rate, color]
    );
    return result.rows[0] || null;
  },

  async delete(id: number, establishmentId: string): Promise<{ deleted: boolean; action: 'hard' | 'soft'; reason?: string }> {
    const schema = await schemaFor(establishmentId);
    const productsResult = await pool.query(
      `SELECT COUNT(*) FROM "${schema}".products WHERE category_id = $1 AND is_active = TRUE`,
      [id]
    );
    const productCount = parseInt(productsResult.rows[0].count);

    if (productCount > 0) {
      const softDeleteResult = await pool.query(
        `UPDATE "${schema}".categories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );
      return {
        deleted: (softDeleteResult.rowCount || 0) > 0,
        action: 'soft',
        reason: `Category has ${productCount} active products`,
      };
    } else {
      const hardDeleteResult = await pool.query(
        `DELETE FROM "${schema}".categories WHERE id = $1`,
        [id]
      );
      return {
        deleted: (hardDeleteResult.rowCount || 0) > 0,
        action: 'hard',
      };
    }
  },

  async restore(id: number, establishmentId: string): Promise<boolean> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `UPDATE "${schema}".categories SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  },
};

export const ProductModel = {
  async getAll(establishmentId: string): Promise<Product[]> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `SELECT * FROM "${schema}".products WHERE is_active = TRUE ORDER BY name`,
      []
    );
    return result.rows;
  },

  async getAllArchived(establishmentId: string): Promise<Product[]> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `SELECT * FROM "${schema}".products WHERE is_active = FALSE ORDER BY name`,
      []
    );
    return result.rows;
  },

  async getAllIncludingArchived(establishmentId: string): Promise<Product[]> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `SELECT * FROM "${schema}".products ORDER BY is_active DESC, name`,
      []
    );
    return result.rows;
  },

  async getById(id: number, establishmentId: string): Promise<Product | null> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `SELECT * FROM "${schema}".products WHERE id = $1 AND is_active = TRUE`,
      [id]
    );
    return result.rows[0] || null;
  },

  async getByCategory(categoryId: number, establishmentId: string): Promise<Product[]> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `SELECT * FROM "${schema}".products WHERE category_id = $1 AND is_active = TRUE ORDER BY name`,
      [categoryId]
    );
    return result.rows;
  },

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>, establishmentId: string): Promise<Product> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `INSERT INTO "${schema}".products (
         name, price, tax_rate, category_id, happy_hour_discount_percent,
         happy_hour_discount_fixed, is_happy_hour_eligible, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING *`,
      [
        product.name,
        product.price,
        product.tax_rate,
        product.category_id,
        product.happy_hour_discount_percent || 0,
        product.happy_hour_discount_fixed || 0,
        product.is_happy_hour_eligible,
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
    const schema = await schemaFor(establishmentId);
    const setClause = fields.map((field, index) => `${field} = $${index + 3}`).join(', ');
    const query = `UPDATE "${schema}".products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = TRUE RETURNING *`;
    const rec = product as Record<string, unknown>;
    const values = [id, ...fields.map(field => rec[field])];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  async delete(id: number, establishmentId: string): Promise<boolean> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `UPDATE "${schema}".products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  },

  async restore(id: number, establishmentId: string): Promise<boolean> {
    const schema = await schemaFor(establishmentId);
    const result = await pool.query(
      `UPDATE "${schema}".products SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  },
};
