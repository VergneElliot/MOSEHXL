/**
 * Order CRUD Operations
 * Handles basic Create, Read, Update, Delete operations for orders
 */

import express from 'express';
import { OrderModel, OrderItemModel, SubBillModel } from '../../models';
import { requireAuth } from '../auth';
import { validateBody, validateParams, commonValidations, paramValidations } from '../../middleware/validation';

const router = express.Router();

/**
 * GET all orders (for history)
 * GET /api/orders
 */
router.get('/', async (req, res) => {
  try {
    const orders = await OrderModel.getAll();
    
    // Include items and sub-bills for each order
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItemModel.getByOrderId(order.id);
        const subBills = order.payment_method === 'split' ? await SubBillModel.getByOrderId(order.id) : [];
        return {
          ...order,
          items,
          sub_bills: subBills,
          tips: order.tips || 0,
          change: order.change || 0
        };
      })
    );
    
    res.json(ordersWithDetails);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * GET order by ID with items and sub-bills
 * GET /api/orders/:id
 */
router.get('/:id', validateParams([paramValidations.id]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const order = await OrderModel.getById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items
    const items = await OrderItemModel.getByOrderId(id);
    
    // Get sub-bills if it's a split payment
    const subBills = order.payment_method === 'split' ? await SubBillModel.getByOrderId(id) : [];

    res.json({
      ...order,
      items,
      sub_bills: subBills,
      tips: order.tips || 0,
      change: order.change || 0
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * POST create new order
 * POST /api/orders
 */
router.post('/', validateBody(commonValidations.orderCreate), async (req, res) => {
  try {
    const {
      total_amount,
      total_tax,
      payment_method,
      status,
      notes,
      items,
      sub_bills,
      tips,
      change
    } = req.body;

    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = req.user ? String(req.user.id) : undefined;

    // Create the order
    const order = await OrderModel.create({
      total_amount,
      total_tax,
      payment_method,
      status,
      notes: notes || '',
      tips: tips || 0,
      change: change || 0
    });

    // Create order items
    const createdItems = await Promise.all(
      items.map(async (item: any) => {
        return await OrderItemModel.create({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          happy_hour_applied: item.happy_hour_applied || false,
          happy_hour_discount_amount: item.happy_hour_discount_amount || 0,
          description: item.description || ''
        });
      })
    );

    // Create sub-bills if split payment
    let createdSubBills: any[] = [];
    if (payment_method === 'split' && sub_bills && Array.isArray(sub_bills)) {
      createdSubBills = await Promise.all(
        sub_bills.map(async (subBill: any) => {
          return await SubBillModel.create({
            order_id: order.id,
            payment_method: subBill.payment_method,
            amount: subBill.amount,
            status: 'pending'
          });
        })
      );
    }

    // Return the complete order with items and sub-bills
    const completeOrder = {
      ...order,
      items: createdItems,
      sub_bills: createdSubBills
    };

    res.status(201).json(completeOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * PUT update order
 * PUT /api/orders/:id
 */
router.put('/:id', validateParams([paramValidations.id]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const order = await OrderModel.getById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = await OrderModel.update(id, req.body);
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

/**
 * DELETE order
 * DELETE /api/orders/:id
 */
router.delete('/:id', validateParams([paramValidations.id]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const order = await OrderModel.getById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const deleted = await OrderModel.delete(id);
    if (deleted) {
      res.json({ message: 'Order deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete order' });
    }
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router; 