import { pool } from '../app';

// TypeScript interfaces
export interface Category {
  id: number;
  name: string;
  default_tax_rate: number;
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

  async create(name: string, default_tax_rate: number): Promise<Category> {
    const result = await pool.query(
      'INSERT INTO categories (name, default_tax_rate, is_active) VALUES ($1, $2, TRUE) RETURNING *',
      [name, default_tax_rate]
    );
    return result.rows[0];
  },

  async update(id: number, name: string, default_tax_rate: number): Promise<Category | null> {
    const result = await pool.query(
      'UPDATE categories SET name = $1, default_tax_rate = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND is_active = TRUE RETURNING *',
      [name, default_tax_rate, id]
    );
    return result.rows[0] || null;
  },

  async delete(id: number): Promise<{ deleted: boolean; action: 'hard' | 'soft'; reason?: string }> {
    console.log('=== CATEGORY SMART DELETE ===');
    console.log('Category ID:', id);
    
    // Check if any products in this category were ever used in orders
    const orderHistoryResult = await pool.query(`
      SELECT COUNT(DISTINCT oi.product_id) as products_in_orders
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE p.category_id = $1
    `, [id]);
    
    const productsInOrderHistory = parseInt(orderHistoryResult.rows[0].products_in_orders, 10);
    console.log('Products from this category used in orders:', productsInOrderHistory);
    
    // Check current products in category (active + archived)
    const currentProductsResult = await pool.query('SELECT COUNT(*) FROM products WHERE category_id = $1', [id]);
    const currentProductCount = parseInt(currentProductsResult.rows[0].count, 10);
    console.log('Current products in category:', currentProductCount);
    
    if (productsInOrderHistory > 0) {
      // Soft delete: category was part of order history, must be preserved for legal compliance
      console.log('Soft deleting category - has order history');
      const result = await pool.query(
        'UPDATE categories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
      );
      console.log('=== END CATEGORY SMART DELETE ===');
      return { 
        deleted: (result.rowCount || 0) > 0, 
        action: 'soft',
        reason: 'Category contains products that were used in orders (legal preservation required)'
      };
    } else if (currentProductCount > 0) {
      // Error: has active products but no order history
      console.log('Error - category has products but no order history');
      console.log('=== END CATEGORY SMART DELETE ===');
      throw new Error('Cannot delete category: it contains products. Please delete or move all products first.');
    } else {
      // Hard delete: no products, no order history
      console.log('Hard deleting category - no products or order history');
      const result = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
      console.log('=== END CATEGORY SMART DELETE ===');
      return { 
        deleted: (result.rowCount || 0) > 0, 
        action: 'hard',
        reason: 'Category was empty and never used in orders'
      };
    }
  },

  async restore(id: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE categories SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return (result.rowCount || 0) > 0;
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
    const result = await pool.query(`
      INSERT INTO orders (total_amount, total_tax, payment_method, status, notes) 
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [order.total_amount, order.total_tax, order.payment_method, order.status, order.notes]);
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
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, tax_rate, tax_amount, happy_hour_applied, happy_hour_discount_amount, sub_bill_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
    `, [item.order_id, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.tax_rate, item.tax_amount, item.happy_hour_applied, item.happy_hour_discount_amount, item.sub_bill_id]);
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