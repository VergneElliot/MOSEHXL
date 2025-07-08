import express from 'express';
import { OrderModel, OrderItemModel, SubBillModel } from '../models';
import { LegalJournalModel } from '../models/legalJournal';
import { AuditTrailModel } from '../models/auditTrail';
import { requireAuth } from './auth';

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
    const userId = (req as any).user ? String((req as any).user.id) : undefined;

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
    const userId = (req as any).user ? String((req as any).user.id) : undefined;
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
    const userId = (req as any).user ? String((req as any).user.id) : undefined;
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

// POST cancel/refund order - Create negative accounting entries for legal compliance
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const { reason, partial_items = null } = req.body;

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    // Get the original order
    const originalOrder = await OrderModel.getById(id);
    if (!originalOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (originalOrder.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed orders can be cancelled' });
    }

    // Get order items
    const orderItems = await OrderItemModel.getByOrderId(id);
    
    let itemsToCancel = orderItems;
    if (partial_items && Array.isArray(partial_items)) {
      // Partial cancellation - only cancel specified items
      itemsToCancel = orderItems.filter(item => 
        partial_items.some(partial => partial.item_id === item.id)
      );
    }

    if (itemsToCancel.length === 0) {
      return res.status(400).json({ error: 'No items to cancel' });
    }

    // Calculate cancellation amounts with proper tax breakdown
    const taxBreakdown = { '10': 0, '20': 0 }; // Tax rates: 10% and 20%
    let totalCancellationAmount = 0;
    let totalTaxAmount = 0;

    const cancellationDetails = itemsToCancel.map(item => {
      const itemTotalPrice = parseFloat(item.total_price.toString());
      const itemTaxRate = parseFloat(item.tax_rate.toString()) / 100; // Convert from percentage
      
      // Calculate tax amount for this item
      const itemTaxAmount = itemTotalPrice * itemTaxRate / (1 + itemTaxRate);
      const itemNetAmount = itemTotalPrice - itemTaxAmount;
      
      // Add to tax breakdown
      const taxRatePercent = Math.round(itemTaxRate * 100);
      if (taxBreakdown.hasOwnProperty(taxRatePercent.toString())) {
        taxBreakdown[taxRatePercent.toString() as '10' | '20'] += itemTaxAmount;
      }
      
      totalCancellationAmount += itemTotalPrice;
      totalTaxAmount += itemTaxAmount;
      
      return {
        item_id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price.toString()),
        total_price: itemTotalPrice,
        tax_rate: itemTaxRate,
        tax_amount: itemTaxAmount,
        net_amount: itemNetAmount
      };
    });

    const totalNetAmount = totalCancellationAmount - totalTaxAmount;

    // Create cancellation order with negative amounts
    const cancellationOrder = await OrderModel.create({
      total_amount: -totalCancellationAmount,
      total_tax: -totalTaxAmount,
      payment_method: originalOrder.payment_method,
      status: 'completed',
      notes: `ANNULATION de la commande #${id} - Raison: ${reason}`
    });

    // Create negative order items
    const cancellationItems = [];
    for (const cancelItem of cancellationDetails) {
      const negativeItem = await OrderItemModel.create({
        order_id: cancellationOrder.id,
        product_id: orderItems.find(oi => oi.id === cancelItem.item_id)?.product_id || undefined,
        product_name: `[ANNULATION] ${cancelItem.product_name}`,
        quantity: -cancelItem.quantity,
        unit_price: cancelItem.unit_price,
        total_price: -cancelItem.total_price,
        tax_rate: cancelItem.tax_rate * 100, // Convert back to percentage for storage
        tax_amount: -cancelItem.tax_amount,
        happy_hour_applied: false,
        happy_hour_discount_amount: 0
      });
      cancellationItems.push(negativeItem);
    }

    // Log to legal journal for compliance
    try {
      await LegalJournalModel.addEntry(
        'REFUND',
        cancellationOrder.id,
        -totalCancellationAmount,
        -totalTaxAmount,
        originalOrder.payment_method || 'cash',
        {
          type: 'ORDER_CANCELLATION',
          original_order_id: id,
          reason: reason,
          cancelled_items: cancellationDetails,
          tax_breakdown: taxBreakdown,
          total_net_amount: -totalNetAmount,
          total_tax_amount: -totalTaxAmount,
          total_amount: -totalCancellationAmount,
          partial_cancellation: partial_items !== null
        },
        (req as any).user ? String((req as any).user.id) : undefined
      );
    } catch (journalError) {
      console.error('Legal journal error (continuing):', journalError);
    }

    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = (req as any).user ? String((req as any).user.id) : undefined;
    
    try {
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'CANCEL_ORDER',
        resource_type: 'ORDER',
        resource_id: String(id),
        action_details: { 
          original_order_id: id,
          cancellation_order_id: cancellationOrder.id,
          reason: reason,
          cancelled_items: cancellationDetails.length,
          total_cancelled_amount: totalCancellationAmount,
          total_tax_cancelled: totalTaxAmount,
          tax_breakdown: taxBreakdown,
          partial_cancellation: partial_items !== null
        },
        ip_address: ip,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }

    res.status(201).json({
      message: partial_items 
        ? `Annulation partielle effectuée avec succès pour ${cancellationDetails.length} article(s)`
        : 'Annulation de commande effectuée avec succès',
      cancellation_order: {
        id: cancellationOrder.id,
        original_order_id: id,
        total_cancelled_amount: totalCancellationAmount,
        total_net_cancelled: totalNetAmount,
        total_tax_cancelled: totalTaxAmount,
        tax_breakdown: taxBreakdown,
        cancelled_items: cancellationDetails.length,
        partial_cancellation: partial_items !== null,
        reason: reason
      }
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ 
      error: 'Échec de l\'annulation de la commande.',
      details: error.message 
    });
  }
});

export default router; 