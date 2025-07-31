/**
 * Models Index
 * Centralized export of all database models and interfaces
 */

// Export interfaces
export * from './interfaces';

// Export database models
export { OrderModel, OrderItemModel, SubBillModel } from './database/orderModel';
export { CategoryModel, ProductModel } from './database/productModel';

// Export business settings model (keeping it simple for now)
import { pool } from '../app';
import { BusinessSettings } from './interfaces';

export const BusinessSettingsModel = {
  async get(): Promise<BusinessSettings | null> {
    const result = await pool.query('SELECT * FROM business_settings ORDER BY id DESC LIMIT 1');
    return result.rows[0] || null;
  },

  async update(settings: Partial<BusinessSettings>): Promise<BusinessSettings | null> {
    const fields = Object.keys(settings).filter(key => key !== 'id');
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE business_settings SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = 1 RETURNING *`;
    const values = [1, ...fields.map(field => (settings as any)[field])];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }
}; 