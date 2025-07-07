import express from 'express';
import { OrderModel, OrderItemModel, SubBillModel } from '../models';
import { LegalJournalModel } from '../models/legalJournal';
import { AuditTrailModel } from '../models/auditTrail';

const router = express.Router();

// GET all orders (for history)
router.get('/', async (req, res) => {
  try {
    const orders = await OrderModel.getAll();
    
    // Include items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItemModel.getByOrderId(order.id);
        return {
          ...order,
          items
        };
      })
    );
    
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET order by ID with items and sub-bills
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

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
      sub_bills: subBills
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST create new order
router.post('/', async (req, res) => {
  try {
    const { 
      total_amount, 
      total_tax, 
      payment_method, 
      status, 
      notes,
      items,
      sub_bills 
    } = req.body;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = req.user ? String(req.user.id) : undefined;

    if (total_amount === undefined || typeof total_amount !== 'number' || total_amount < 0) {
      return res.status(400).json({ error: 'Valid total amount is required' });
    }

    if (total_tax === undefined || typeof total_tax !== 'number' || total_tax < 0) {
      return res.status(400).json({ error: 'Valid total tax is required' });
    }

    if (!payment_method || !['cash', 'card', 'split'].includes(payment_method)) {
      return res.status(400).json({ error: 'Valid payment method is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    // Create the order
    const order = await OrderModel.create({
      total_amount,
      total_tax,
      payment_method,
      status: status || 'completed',
      notes
    });

    // Create order items
    const createdItems = [];
    for (const item of items) {
      const orderItem = await OrderItemModel.create({
        ...item,
        order_id: order.id
      });
      createdItems.push(orderItem);
    }

    // Create sub-bills if it's a split payment
    const createdSubBills = [];
    if (payment_method === 'split' && sub_bills && Array.isArray(sub_bills)) {
      for (const subBill of sub_bills) {
        const createdSubBill = await SubBillModel.create({
          ...subBill,
          order_id: order.id
        });
        createdSubBills.push(createdSubBill);
      }
    }

    // Log transaction in legal journal for French compliance
    try {
      const journalEntry = await LegalJournalModel.logTransaction(
        {
          id: order.id,
          finalAmount: total_amount,
          taxAmount: total_tax,
          payment_method,
          items: createdItems,
          created_at: order.created_at
        },
        userId
      );
      console.log(`Legal journal entry created: sequence ${journalEntry.sequence_number}`);
    } catch (journalError) {
      console.error('Failed to log transaction in legal journal:', journalError);
    }

    await AuditTrailModel.logAction({
      user_id: userId,
      action_type: 'CREATE_ORDER',
      resource_type: 'ORDER',
      resource_id: String(order.id),
      action_details: { total_amount, total_tax, payment_method, status, notes, items, sub_bills },
      ip_address: ip,
      user_agent: userAgent
    });

    res.status(201).json({
      ...order,
      items: createdItems,
      sub_bills: createdSubBills
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT update order
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    const updateData: any = {};
    if (req.body.total_amount !== undefined) updateData.total_amount = req.body.total_amount;
    if (req.body.total_tax !== undefined) updateData.total_tax = req.body.total_tax;
    if (req.body.payment_method !== undefined) updateData.payment_method = req.body.payment_method;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    const order = await OrderModel.update(id, updateData);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = req.user ? String(req.user.id) : undefined;
    await AuditTrailModel.logAction({
      user_id: userId,
      action_type: 'UPDATE_ORDER',
      resource_type: 'ORDER',
      resource_id: String(id),
      action_details: updateData,
      ip_address: ip,
      user_agent: userAgent
    });
    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// PUT update order item
router.put('/:orderId/items/:itemId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const itemId = parseInt(req.params.itemId);
    
    if (isNaN(orderId) || isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid order or item ID' });
    }

    // Verify order exists
    const order = await OrderModel.getById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updateData: any = {};
    
    if (req.body.quantity !== undefined) updateData.quantity = req.body.quantity;
    if (req.body.unit_price !== undefined) updateData.unit_price = req.body.unit_price;
    if (req.body.total_price !== undefined) updateData.total_price = req.body.total_price;
    if (req.body.tax_amount !== undefined) updateData.tax_amount = req.body.tax_amount;
    if (req.body.happy_hour_applied !== undefined) updateData.happy_hour_applied = req.body.happy_hour_applied;
    if (req.body.happy_hour_discount_amount !== undefined) updateData.happy_hour_discount_amount = req.body.happy_hour_discount_amount;
    if (req.body.sub_bill_id !== undefined) updateData.sub_bill_id = req.body.sub_bill_id;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const item = await OrderItemModel.update(itemId, updateData);
    if (!item) {
      return res.status(404).json({ error: 'Order item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error updating order item:', error);
    res.status(500).json({ error: 'Failed to update order item' });
  }
});

// DELETE order
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    const deleted = await OrderModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = req.user ? String(req.user.id) : undefined;
    await AuditTrailModel.logAction({
      user_id: userId,
      action_type: 'DELETE_ORDER',
      resource_type: 'ORDER',
      resource_id: String(id),
      ip_address: ip,
      user_agent: userAgent
    });
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router; 