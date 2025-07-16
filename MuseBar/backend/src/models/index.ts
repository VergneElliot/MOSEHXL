import { pool } from '../app';

// TypeScript interfaces
export interface Category {
  id: number;
  name: string;
  default_tax_rate: number;
  color: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  tax_rate: number;
  category_id: number;
  happy_hour_discount_percent?: number;
  happy_hour_discount_fixed?: number;
  is_happy_hour_eligible: boolean;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface Order {
  id: number;
  total_amount: number;
  total_tax: number;
  payment_method: 'cash' | 'card' | 'split';
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  tips?: number; // Pourboire
  change?: number; // Monnaie rendue
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied: boolean;
  happy_hour_discount_amount: number;
  sub_bill_id?: number;
  description?: string; // Description for special items like Divers
  created_at: Date;
}

export interface SubBill {
  id: number;
  order_id: number;
  payment_method: 'cash' | 'card';
  amount: number;
  status: 'pending' | 'paid';
  created_at: Date;
}

// Business Settings Model
export interface BusinessSettings {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  tax_identification: string;
  updated_at: Date;
}

// Database models
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

  async create(name: string, default_tax_rate: number, color: string = '#1976d2'): Promise<Category> {
    const result = await pool.query(
      'INSERT INTO categories (name, default_tax_rate, color, is_active) VALUES ($1, $2, $3, TRUE) RETURNING *',
      [name, default_tax_rate, color]
    );
    return result.rows[0];
  },

  async update(id: number, name: string, default_tax_rate: number, color: string): Promise<Category | null> {
    const result = await pool.query(
      'UPDATE categories SET name = $1, default_tax_rate = $2, color = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND is_active = TRUE RETURNING *',
      [name, default_tax_rate, color, id]
    );
    return result.rows[0] || null;
  },

  async delete(id: number): Promise<{ deleted: boolean; action: 'hard' | 'soft'; reason?: string }> {
    // Check if any products in this category were ever used in orders
    const orderHistoryResult = await pool.query(`
      SELECT COUNT(DISTINCT oi.product_id) as products_in_orders
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE p.category_id = $1
    `, [id]);
    
    const productsInOrderHistory = parseInt(orderHistoryResult.rows[0].products_in_orders, 10);
    
    // Get all products in this category (active + archived) for cascading
    const categoryProductsResult = await pool.query('SELECT id, name, is_active FROM products WHERE category_id = $1', [id]);
    const categoryProducts = categoryProductsResult.rows;
    
    if (productsInOrderHistory > 0) {
      // Soft delete: category was part of order history, must be preserved for legal compliance
      // CASCADE: Also archive all products in this category
      
      // Archive the category
      const categoryResult = await pool.query(
        'UPDATE categories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
      );
      
      // Cascade: Archive all products in this category
      if (categoryProducts.length > 0) {
        await pool.query(
          'UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE category_id = $1',
          [id]
        );
      }
      return { 
        deleted: (categoryResult.rowCount || 0) > 0, 
        action: 'soft',
        reason: `Category and ${categoryProducts.length} products archived (legal preservation required due to order history)`
      };
    } else {
      // Hard delete: no order history
      // CASCADE: Also hard delete all products in this category
      console.log('Hard deleting category and cascading to products - no order history');
      
      // Check if any products in this category have order history (they shouldn't, but double-check)
      const productOrderHistoryResult = await pool.query(`
        SELECT p.id, p.name, COUNT(oi.id) as order_count
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        WHERE p.category_id = $1
        GROUP BY p.id, p.name
        HAVING COUNT(oi.id) > 0
      `, [id]);
      
      if (productOrderHistoryResult.rows.length > 0) {
        // Fall back to soft delete if individual products have order history
        const categoryResult = await pool.query(
          'UPDATE categories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
          [id]
        );
        
        await pool.query(
          'UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE category_id = $1',
          [id]
        );
        
        return { 
          deleted: (categoryResult.rowCount || 0) > 0, 
          action: 'soft',
          reason: `Category and ${categoryProducts.length} products archived (some products had order history)`
        };
      }
      
      // Hard delete products first, then category
      if (categoryProducts.length > 0) {
        await pool.query('DELETE FROM products WHERE category_id = $1', [id]);
      }
      
      // Hard delete the category
      const categoryResult = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
      return { 
        deleted: (categoryResult.rowCount || 0) > 0, 
        action: 'hard',
        reason: `Category and ${categoryProducts.length} products permanently deleted (no order history)`
      };
    }
  },

  async restore(id: number): Promise<boolean> {
    // Restore the category
    const categoryResult = await pool.query(
      'UPDATE categories SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (categoryResult.rowCount && categoryResult.rowCount > 0) {
      // CASCADE: Also restore all archived products in this category
      const productsResult = await pool.query(
        'UPDATE products SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE category_id = $1 AND is_active = FALSE RETURNING id, name',
        [id]
      );
      
      return true;
    }
    
    return false;
  }
};

export const ProductModel = {
  async getAll(): Promise<Product[]> {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = TRUE
      ORDER BY c.name, p.name
    `);
    return result.rows;
  },

  async getAllArchived(): Promise<Product[]> {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = FALSE
      ORDER BY c.name, p.name
    `);
    return result.rows;
  },

  async getAllIncludingArchived(): Promise<Product[]> {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.is_active DESC, c.name, p.name
    `);
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
    const result = await pool.query(`
      INSERT INTO products (name, price, tax_rate, category_id, happy_hour_discount_percent, happy_hour_discount_fixed, is_happy_hour_eligible) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [product.name, product.price, product.tax_rate, product.category_id, product.happy_hour_discount_percent, product.happy_hour_discount_fixed, product.is_happy_hour_eligible]);
    return result.rows[0];
  },

  async update(id: number, product: Partial<Product>): Promise<Product | null> {
    const fields = Object.keys(product).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
    const values = Object.values(product).filter((_, index) => fields[index] !== 'id' && fields[index] !== 'created_at' && fields[index] !== 'updated_at');
    
    if (fields.length === 0) return null;
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  },

  async delete(id: number): Promise<boolean> {
    // Check if product is referenced in order_items
    const orderItemsResult = await pool.query('SELECT COUNT(*) FROM order_items WHERE product_id = $1', [id]);
    const hasOrderItems = parseInt(orderItemsResult.rows[0].count, 10) > 0;
    
    if (hasOrderItems) {
      // Soft delete: set is_active = FALSE (product used in orders)
      const result = await pool.query('UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
      return (result.rowCount || 0) > 0;
    } else {
      // Hard delete: remove from database (product never used)
      const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    }
  },

  async restore(id: number): Promise<boolean> {
    // Restore archived product: set is_active = TRUE
    const result = await pool.query('UPDATE products SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
    return (result.rowCount || 0) > 0;
  }
};

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
    const tipsValue = order.tips || 0;
    const changeValue = order.change || 0;
    
    const result = await pool.query(`
      INSERT INTO orders (total_amount, total_tax, payment_method, status, notes, tips, change) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [order.total_amount, order.total_tax, order.payment_method, order.status, order.notes, tipsValue, changeValue]);
    
    return result.rows[0];
  },

  async update(id: number, order: Partial<Order>): Promise<Order | null> {
    const fields = Object.keys(order).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
    const values = Object.values(order).filter((_, index) => fields[index] !== 'id' && fields[index] !== 'created_at' && fields[index] !== 'updated_at');
    
    if (fields.length === 0) return null;
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE orders SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
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
    const result = await pool.query(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, tax_rate, tax_amount, happy_hour_applied, happy_hour_discount_amount, sub_bill_id, description) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
    `, [item.order_id, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.tax_rate, item.tax_amount, item.happy_hour_applied, item.happy_hour_discount_amount, item.sub_bill_id, item.description]);
    return result.rows[0];
  },

  async update(id: number, item: Partial<OrderItem>): Promise<OrderItem | null> {
    const fields = Object.keys(item).filter(key => key !== 'id' && key !== 'created_at');
    const values = Object.values(item).filter((_, index) => fields[index] !== 'id' && fields[index] !== 'created_at');
    
    if (fields.length === 0) return null;
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE order_items SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
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
    const result = await pool.query(`
      INSERT INTO sub_bills (order_id, payment_method, amount, status) 
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [subBill.order_id, subBill.payment_method, subBill.amount, subBill.status]);
    return result.rows[0];
  },

  async update(id: number, subBill: Partial<SubBill>): Promise<SubBill | null> {
    const fields = Object.keys(subBill).filter(key => key !== 'id' && key !== 'created_at');
    const values = Object.values(subBill).filter((_, index) => fields[index] !== 'id' && fields[index] !== 'created_at');
    
    if (fields.length === 0) return null;
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const result = await pool.query(
      `UPDATE sub_bills SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }
}; 

export const BusinessSettingsModel = {
  async get(): Promise<BusinessSettings | null> {
    const result = await pool.query('SELECT * FROM business_settings ORDER BY updated_at DESC LIMIT 1');
    return result.rows[0] || null;
  },
  async update(settings: Partial<BusinessSettings>): Promise<BusinessSettings | null> {
    // Only allow updating the latest row, or insert if none exists
    const existing = await this.get();
    if (existing) {
      const updated = {
        ...existing,
        ...settings,
        updated_at: new Date()
      };
      await pool.query(
        `UPDATE business_settings SET name = $1, address = $2, phone = $3, email = $4, siret = $5, tax_identification = $6, updated_at = $7 WHERE id = $8`,
        [updated.name, updated.address, updated.phone, updated.email, updated.siret, updated.tax_identification, updated.updated_at, existing.id]
      );
      return this.get();
    } else {
      const inserted = await pool.query(
        `INSERT INTO business_settings (name, address, phone, email, siret, tax_identification, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [settings.name, settings.address, settings.phone, settings.email, settings.siret, settings.tax_identification, new Date()]
      );
      return inserted.rows[0];
    }
  }
}; 