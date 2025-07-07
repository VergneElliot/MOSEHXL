"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubBillModel = exports.OrderItemModel = exports.OrderModel = exports.ProductModel = exports.CategoryModel = void 0;
const app_1 = require("../app");
// Database models
exports.CategoryModel = {
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('SELECT * FROM categories WHERE is_active = TRUE ORDER BY name');
            return result.rows;
        });
    },
    getAllArchived() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('SELECT * FROM categories WHERE is_active = FALSE ORDER BY name');
            return result.rows;
        });
    },
    getAllIncludingArchived() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('SELECT * FROM categories ORDER BY is_active DESC, name');
            return result.rows;
        });
    },
    getById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('SELECT * FROM categories WHERE id = $1 AND is_active = TRUE', [id]);
            return result.rows[0] || null;
        });
    },
    create(name, default_tax_rate) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('INSERT INTO categories (name, default_tax_rate, is_active) VALUES ($1, $2, TRUE) RETURNING *', [name, default_tax_rate]);
            return result.rows[0];
        });
    },
    update(id, name, default_tax_rate) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('UPDATE categories SET name = $1, default_tax_rate = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND is_active = TRUE RETURNING *', [name, default_tax_rate, id]);
            return result.rows[0] || null;
        });
    },
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('=== CATEGORY SMART DELETE ===');
            console.log('Category ID:', id);
            
            // Check if any products in this category were ever used in orders
            const orderHistoryResult = yield app_1.pool.query(`
              SELECT COUNT(DISTINCT oi.product_id) as products_in_orders
              FROM order_items oi 
              JOIN products p ON oi.product_id = p.id 
              WHERE p.category_id = $1
            `, [id]);
            
            const productsInOrderHistory = parseInt(orderHistoryResult.rows[0].products_in_orders, 10);
            console.log('Products from this category used in orders:', productsInOrderHistory);
            
            // Check current products in category (active + archived)
            const currentProductsResult = yield app_1.pool.query('SELECT COUNT(*) FROM products WHERE category_id = $1', [id]);
            const currentProductCount = parseInt(currentProductsResult.rows[0].count, 10);
            console.log('Current products in category:', currentProductCount);
            
            if (productsInOrderHistory > 0) {
                // Soft delete: category was part of order history, must be preserved for legal compliance
                console.log('Soft deleting category - has order history');
                const result = yield app_1.pool.query(
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
                const result = yield app_1.pool.query('DELETE FROM categories WHERE id = $1', [id]);
                console.log('=== END CATEGORY SMART DELETE ===');
                return { 
                    deleted: (result.rowCount || 0) > 0, 
                    action: 'hard',
                    reason: 'Category was empty and never used in orders'
                };
            }
        });
    },
    restore(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query(
                'UPDATE categories SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
                [id]
            );
            return (result.rowCount || 0) > 0;
        });
    }
};
exports.ProductModel = {
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = TRUE
      ORDER BY c.name, p.name
    `);
            return result.rows;
        });
    },
    getAllArchived() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = FALSE
      ORDER BY c.name, p.name
    `);
            return result.rows;
        });
    },
    getAllIncludingArchived() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.is_active DESC, c.name, p.name
    `);
            return result.rows;
        });
    },
    getById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('SELECT * FROM products WHERE id = $1 AND is_active = TRUE', [id]);
            return result.rows[0] || null;
        });
    },
    getByCategory(categoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('SELECT * FROM products WHERE category_id = $1 AND is_active = TRUE ORDER BY name', [categoryId]);
            return result.rows;
        });
    },
    create(product) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query(`
      INSERT INTO products (name, price, tax_rate, category_id, happy_hour_discount_percent, happy_hour_discount_fixed, is_happy_hour_eligible) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [product.name, product.price, product.tax_rate, product.category_id, product.happy_hour_discount_percent, product.happy_hour_discount_fixed, product.is_happy_hour_eligible]);
            return result.rows[0];
        });
    },
    update(id, product) {
        return __awaiter(this, void 0, void 0, function* () {
            const fields = Object.keys(product).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
            const values = Object.values(product).filter((_, index) => fields[index] !== 'id' && fields[index] !== 'created_at' && fields[index] !== 'updated_at');
            if (fields.length === 0)
                return null;
            const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            const result = yield app_1.pool.query(`UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`, [id, ...values]);
            return result.rows[0] || null;
        });
    },
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if product is referenced in order_items
            const orderItemsResult = yield app_1.pool.query('SELECT COUNT(*) FROM order_items WHERE product_id = $1', [id]);
            const hasOrderItems = parseInt(orderItemsResult.rows[0].count, 10) > 0;
            
            if (hasOrderItems) {
                // Soft delete: set is_active = FALSE (product used in orders)
                const result = yield app_1.pool.query('UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
                return (result.rowCount || 0) > 0;
            } else {
                // Hard delete: remove from database (product never used)
                const result = yield app_1.pool.query('DELETE FROM products WHERE id = $1', [id]);
                return (result.rowCount || 0) > 0;
            }
        });
    },
    restore(id) {
        return __awaiter(this, void 0, void 0, function* () {
            // Restore archived product: set is_active = TRUE
            const result = yield app_1.pool.query('UPDATE products SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
            return (result.rowCount || 0) > 0;
        });
    }
};
exports.OrderModel = {
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('SELECT * FROM orders ORDER BY created_at DESC');
            return result.rows;
        });
    },
    getById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('SELECT * FROM orders WHERE id = $1', [id]);
            return result.rows[0] || null;
        });
    },
    create(order) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query(`
      INSERT INTO orders (total_amount, total_tax, payment_method, status, notes) 
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [order.total_amount, order.total_tax, order.payment_method, order.status, order.notes]);
            return result.rows[0];
        });
    },
    update(id, order) {
        return __awaiter(this, void 0, void 0, function* () {
            const fields = Object.keys(order).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
            const values = Object.values(order).filter((_, index) => fields[index] !== 'id' && fields[index] !== 'created_at' && fields[index] !== 'updated_at');
            if (fields.length === 0)
                return null;
            const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            const result = yield app_1.pool.query(`UPDATE orders SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`, [id, ...values]);
            return result.rows[0] || null;
        });
    },
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('DELETE FROM orders WHERE id = $1', [id]);
            return (result.rowCount || 0) > 0;
        });
    }
};
exports.OrderItemModel = {
    getByOrderId(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [orderId]);
            return result.rows;
        });
    },
    create(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, tax_rate, tax_amount, happy_hour_applied, happy_hour_discount_amount, sub_bill_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
    `, [item.order_id, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.tax_rate, item.tax_amount, item.happy_hour_applied, item.happy_hour_discount_amount, item.sub_bill_id]);
            return result.rows[0];
        });
    },
    update(id, item) {
        return __awaiter(this, void 0, void 0, function* () {
            const fields = Object.keys(item).filter(key => key !== 'id' && key !== 'created_at');
            const values = Object.values(item).filter((_, index) => fields[index] !== 'id' && fields[index] !== 'created_at');
            if (fields.length === 0)
                return null;
            const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            const result = yield app_1.pool.query(`UPDATE order_items SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...values]);
            return result.rows[0] || null;
        });
    },
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('DELETE FROM order_items WHERE id = $1', [id]);
            return (result.rowCount || 0) > 0;
        });
    }
};
exports.SubBillModel = {
    getByOrderId(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query('SELECT * FROM sub_bills WHERE order_id = $1 ORDER BY created_at', [orderId]);
            return result.rows;
        });
    },
    create(subBill) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield app_1.pool.query(`
      INSERT INTO sub_bills (order_id, payment_method, amount, status) 
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [subBill.order_id, subBill.payment_method, subBill.amount, subBill.status]);
            return result.rows[0];
        });
    },
    update(id, subBill) {
        return __awaiter(this, void 0, void 0, function* () {
            const fields = Object.keys(subBill).filter(key => key !== 'id' && key !== 'created_at');
            const values = Object.values(subBill).filter((_, index) => fields[index] !== 'id' && fields[index] !== 'created_at');
            if (fields.length === 0)
                return null;
            const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            const result = yield app_1.pool.query(`UPDATE sub_bills SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...values]);
            return result.rows[0] || null;
        });
    }
};
