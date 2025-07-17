import express from 'express';
import { OrderModel, OrderItemModel, SubBillModel } from '../models';
import { LegalJournalModel } from '../models/legalJournal';
import { AuditTrailModel } from '../models/auditTrail';
import { requireAuth } from './auth';
import { pool } from '../app';

const router = express.Router();

// GET all orders (for history)
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
      sub_bills: subBills,
      tips: order.tips || 0,
      change: order.change || 0
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
      sub_bills,
      tips,
      change
    } = req.body;
    
    // Debug log for sub_bills

    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = (req as any).user ? String((req as any).user.id) : undefined;

    // Validate required fields
    if (total_amount === undefined || typeof total_amount !== 'number' || total_amount < 0) {
      return res.status(400).json({ error: 'Valid total amount is required' });
    }

    if (total_tax === undefined || typeof total_tax !== 'number' || total_tax < 0) {
      return res.status(400).json({ error: 'Valid total tax is required' });
    }

    if (!payment_method || !['cash', 'card', 'split'].includes(payment_method)) {
      return res.status(400).json({ error: 'Valid payment method is required' });
    }

    // Allow empty items array for special "change" operations (non-sale transactions)
    const isChangeOperation =
      total_amount === 0 &&
      total_tax === 0 &&
      change > 0 &&
      notes &&
      (notes.includes('Changement de caisse') || notes.includes('Faire de la Monnaie'));
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Order items are required' });
    }
    
    // For regular orders, require at least one item
    if (!isChangeOperation && items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    // Parse tips and change as numbers to ensure correct saving
    const tipsValue = tips !== undefined ? parseFloat(tips) || 0 : 0;
    const changeValue = change !== undefined ? parseFloat(change) || 0 : 0;

    // Create the order
    const order = await OrderModel.create({
      total_amount,
      total_tax,
      payment_method,
      status: status || 'completed',
      notes,
      tips: tipsValue,
      change: changeValue
    });

    // Create order items (skip for change operations)
    const createdItems = [];
    if (!isChangeOperation) {
      for (const item of items) {
        const orderItem = await OrderItemModel.create({
          ...item,
          order_id: order.id
        });
        createdItems.push(orderItem);
      }
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
      // Debug log for saved sub_bills
  
    }

    // Log transaction in legal journal for French compliance (skip for change operations)
    if (!isChangeOperation) {
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
    
      } catch (journalError) {
        console.error('Failed to log transaction in legal journal:', journalError);
      }
    } else {
  
    }

    await AuditTrailModel.logAction({
      user_id: userId,
      action_type: 'CREATE_ORDER',
      resource_type: 'ORDER',
      resource_id: String(order.id),
      action_details: { total_amount, total_tax, payment_method, status, notes, items, sub_bills, tips, change },
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
    if (req.body.tips !== undefined) updateData.tips = req.body.tips;
    if (req.body.change !== undefined) updateData.change = req.body.change;
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



// POST quick item return (retour)
router.post('/retour', requireAuth, async (req, res) => {
  try {
    const { item, reason, paymentMethod = 'cash' } = req.body;
    if (!item || !reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Item and return reason are required' });
    }
    
    if (!['cash', 'card'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Payment method must be either "cash" or "card"' });
    }
    
    // Calculate negative amounts
    const totalPrice = parseFloat(item.totalPrice);
    const taxRate = parseFloat(item.taxRate);
    const itemTaxAmount = totalPrice * taxRate / (1 + taxRate);
    const netAmount = totalPrice - itemTaxAmount;
    
    // Create negative order
    const order = await OrderModel.create({
      total_amount: -totalPrice,
      total_tax: -itemTaxAmount,
      payment_method: paymentMethod,
      status: 'completed',
      notes: `RETOUR direct - Article: ${item.productName} - Raison: ${reason} - Paiement: ${paymentMethod}`
    });
    
    // Create negative order item
    const retourItem = await OrderItemModel.create({
      order_id: order.id,
      product_id: item.productId,
      product_name: `[RETOUR] ${item.productName}`,
      quantity: -Math.abs(item.quantity || 1),
      unit_price: item.unitPrice,
      total_price: -totalPrice,
      tax_rate: taxRate * 100,
      tax_amount: -itemTaxAmount,
      happy_hour_applied: false,
      happy_hour_discount_amount: 0
    });
    
    // Log to legal journal
    try {
      await LegalJournalModel.addEntry(
        'REFUND',
        order.id,
        -totalPrice,
        -itemTaxAmount,
        paymentMethod,
        {
          type: 'RETOUR_DIRECT',
          reason,
          product_name: item.productName,
          quantity: -Math.abs(item.quantity || 1),
          net_amount: -netAmount,
          tax_amount: -itemTaxAmount,
          total_amount: -totalPrice,
          payment_method: paymentMethod
        },
        (req as any).user ? String((req as any).user.id) : undefined
      );
    } catch (journalError) {
      console.error('Legal journal error (retour):', journalError);
    }
    
    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = (req as any).user ? String((req as any).user.id) : undefined;
    try {
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'RETOUR_ITEM',
        resource_type: 'ORDER',
        resource_id: String(order.id),
        action_details: { retour_item: retourItem, reason, payment_method: paymentMethod },
        ip_address: ip,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Audit log error (retour):', error);
    }
    
    res.status(201).json({
      message: 'Retour enregistré avec succès',
      retour_order: order,
      retour_item: retourItem
    });
  } catch (error: any) {
    console.error('Error processing retour:', error);
    res.status(500).json({ error: 'Erreur lors du retour de l\'article', details: error.message });
  }
});

// POST return from history (based on original order payment method)
router.post('/retour-from-history', requireAuth, async (req, res) => {
  try {
    const { originalOrderId, reason, itemsToReturn } = req.body;
    
    if (!originalOrderId || !reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Original order ID and return reason are required' });
    }
    
    if (!itemsToReturn || !Array.isArray(itemsToReturn) || itemsToReturn.length === 0) {
      return res.status(400).json({ error: 'Items to return are required' });
    }
    
    // Get the original order
    const originalOrder = await OrderModel.getById(originalOrderId);
    if (!originalOrder) {
      return res.status(404).json({ error: 'Original order not found' });
    }
    
    if (originalOrder.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed orders can be returned' });
    }
    
    // Get original order items and sub-bills
    const originalItems = await OrderItemModel.getByOrderId(originalOrderId);
    const originalSubBills = originalOrder.payment_method === 'split' 
      ? await SubBillModel.getByOrderId(originalOrderId) 
      : [];
    
    // Calculate return amounts
    let totalReturnAmount = 0;
    let totalReturnTax = 0;
    const returnItems = [];
    
    for (const returnItem of itemsToReturn) {
      const originalItem = originalItems.find(item => item.id === returnItem.item_id);
      if (!originalItem) {
        return res.status(400).json({ error: `Original item ${returnItem.item_id} not found` });
      }
      
      const itemTotalPrice = Math.abs(originalItem.total_price);
      const itemTaxAmount = Math.abs(originalItem.tax_amount);
      
      totalReturnAmount += itemTotalPrice;
      totalReturnTax += itemTaxAmount;
      
      returnItems.push({
        ...originalItem,
        total_price: -itemTotalPrice,
        tax_amount: -itemTaxAmount,
        quantity: -Math.abs(originalItem.quantity)
      });
    }
    
    // Create return order with same payment method as original
    const returnOrder = await OrderModel.create({
      total_amount: -totalReturnAmount,
      total_tax: -totalReturnTax,
      payment_method: originalOrder.payment_method,
      status: 'completed',
      notes: `RETOUR basé sur commande #${originalOrderId} - Raison: ${reason}`
    });
    
    // Create return order items
    const createdReturnItems = [];
    for (const returnItem of returnItems) {
      const createdItem = await OrderItemModel.create({
        order_id: returnOrder.id,
        product_id: returnItem.product_id,
        product_name: `[RETOUR] ${returnItem.product_name}`,
        quantity: returnItem.quantity,
        unit_price: returnItem.unit_price,
        total_price: returnItem.total_price,
        tax_rate: returnItem.tax_rate,
        tax_amount: returnItem.tax_amount,
        happy_hour_applied: false,
        happy_hour_discount_amount: 0
      });
      createdReturnItems.push(createdItem);
    }
    
    // Handle split payment returns
    if (originalOrder.payment_method === 'split' && originalSubBills.length > 0) {
      // Calculate proportional returns for each sub-bill
      const originalTotal = originalItems.reduce((sum, item) => sum + Math.abs(item.total_price), 0);
      
      for (const originalSubBill of originalSubBills) {
        const subBillRatio = Math.abs(originalSubBill.amount) / originalTotal;
        const returnAmount = totalReturnAmount * subBillRatio;
        
        if (returnAmount > 0) {
          await SubBillModel.create({
            order_id: returnOrder.id,
            payment_method: originalSubBill.payment_method,
            amount: -returnAmount,
            status: 'paid'
          });
        }
      }
    }
    
    // Log to legal journal
    try {
      await LegalJournalModel.addEntry(
        'REFUND',
        returnOrder.id,
        -totalReturnAmount,
        -totalReturnTax,
        originalOrder.payment_method,
        {
          type: 'RETOUR_FROM_HISTORY',
          original_order_id: originalOrderId,
          reason,
          return_items: returnItems.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            total_price: item.total_price,
            tax_amount: item.tax_amount
          })),
          total_return_amount: -totalReturnAmount,
          total_return_tax: -totalReturnTax,
          payment_method: originalOrder.payment_method,
          split_payment: originalOrder.payment_method === 'split'
        },
        (req as any).user ? String((req as any).user.id) : undefined
      );
    } catch (journalError) {
      console.error('Legal journal error (retour from history):', journalError);
    }
    
    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = (req as any).user ? String((req as any).user.id) : undefined;
    try {
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'RETOUR_FROM_HISTORY',
        resource_type: 'ORDER',
        resource_id: String(returnOrder.id),
        action_details: { 
          original_order_id: originalOrderId,
          return_order_id: returnOrder.id,
          reason,
          return_items_count: returnItems.length,
          total_return_amount: totalReturnAmount,
          payment_method: originalOrder.payment_method
        },
        ip_address: ip,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Audit log error (retour from history):', error);
    }
    
    res.status(201).json({
      message: 'Retour basé sur l\'historique enregistré avec succès',
      return_order: returnOrder,
      return_items: createdReturnItems,
      original_order_id: originalOrderId,
      payment_method: originalOrder.payment_method
    });
  } catch (error: any) {
    console.error('Error processing retour from history:', error);
    res.status(500).json({ error: 'Erreur lors du retour basé sur l\'historique', details: error.message });
  }
});

// POST cancel entire order (full cancellation with tips/change reversal)
router.post('/cancel-order', requireAuth, async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    
    if (!orderId || !reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Order ID and cancellation reason are required' });
    }
    
    // Get the original order
    const originalOrder = await OrderModel.getById(orderId);
    if (!originalOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (originalOrder.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed orders can be cancelled' });
    }
    
    // Get original order items and sub-bills
    const originalItems = await OrderItemModel.getByOrderId(orderId);
    const originalSubBills = originalOrder.payment_method === 'split' 
      ? await SubBillModel.getByOrderId(orderId) 
      : [];
    
    // Calculate total amounts to reverse
    const totalOrderAmount = Math.abs(originalOrder.total_amount);
    const totalOrderTax = Math.abs(originalOrder.total_tax);
    const totalTips = Math.abs(originalOrder.tips || 0);
    const totalChange = Math.abs(originalOrder.change || 0);
    
    // Create main cancellation order (order items only)
    const cancellationOrder = await OrderModel.create({
      total_amount: -totalOrderAmount,
      total_tax: -totalOrderTax,
      payment_method: originalOrder.payment_method,
      status: 'completed',
      notes: `ANNULATION complète - Commande #${orderId} - Raison: ${reason}`,
      tips: 0, // No tips on cancellation order
      change: 0 // No change on cancellation order
    });
    
    // Create negative order items (reverse all original items)
    const createdCancellationItems = [];
    for (const originalItem of originalItems) {
      const cancellationItem = await OrderItemModel.create({
        order_id: cancellationOrder.id,
        product_id: originalItem.product_id,
        product_name: `[ANNULATION] ${originalItem.product_name}`,
        quantity: -Math.abs(originalItem.quantity),
        unit_price: originalItem.unit_price,
        total_price: -Math.abs(originalItem.total_price),
        tax_rate: originalItem.tax_rate,
        tax_amount: -Math.abs(originalItem.tax_amount),
        happy_hour_applied: false,
        happy_hour_discount_amount: 0
      });
      createdCancellationItems.push(cancellationItem);
    }
    
    // Handle split payment cancellations for main order
    if (originalOrder.payment_method === 'split' && originalSubBills.length > 0) {
      // Calculate proportional cancellations for each sub-bill
      const originalTotal = originalItems.reduce((sum, item) => sum + Math.abs(item.total_price), 0);
      
      for (const originalSubBill of originalSubBills) {
        const subBillRatio = Math.abs(originalSubBill.amount) / originalTotal;
        const cancellationAmount = totalOrderAmount * subBillRatio;
        
        if (cancellationAmount > 0) {
          await SubBillModel.create({
            order_id: cancellationOrder.id,
            payment_method: originalSubBill.payment_method,
            amount: -cancellationAmount,
            status: 'paid'
          });
        }
      }
    }
    
    // Create separate tip reversal order if there were tips
    let tipReversalOrder = null;
    if (totalTips > 0) {
      tipReversalOrder = await OrderModel.create({
        total_amount: 0, // No order amount, just tip reversal
        total_tax: 0,
        payment_method: originalOrder.payment_method,
        status: 'completed',
        notes: `ANNULATION pourboire - Commande #${orderId} - Raison: ${reason}`,
        tips: -totalTips, // Negative tip to reverse
        change: 0
      });
      
      // Handle tip reversal for all payment methods
      if (originalOrder.payment_method === 'split' && originalSubBills.length > 0) {
        // For split payments, create card→cash reversal
        await SubBillModel.create({
          order_id: tipReversalOrder.id,
          payment_method: 'card',
          amount: -totalTips, // Negative card amount (reverse card payment)
          status: 'paid'
        });
        await SubBillModel.create({
          order_id: tipReversalOrder.id,
          payment_method: 'cash',
          amount: totalTips, // Positive cash amount (money back to cash drawer)
          status: 'paid'
        });
      } else if (originalOrder.payment_method === 'card') {
        // For card payments, create card→cash reversal
        await SubBillModel.create({
          order_id: tipReversalOrder.id,
          payment_method: 'card',
          amount: -totalTips, // Negative card amount (reverse card payment)
          status: 'paid'
        });
        await SubBillModel.create({
          order_id: tipReversalOrder.id,
          payment_method: 'cash',
          amount: totalTips, // Positive cash amount (money back to cash drawer)
          status: 'paid'
        });
      } else if (originalOrder.payment_method === 'cash') {
        // For cash payments, create cash→card reversal
        await SubBillModel.create({
          order_id: tipReversalOrder.id,
          payment_method: 'cash',
          amount: -totalTips, // Negative cash amount (reverse cash payment)
          status: 'paid'
        });
        await SubBillModel.create({
          order_id: tipReversalOrder.id,
          payment_method: 'card',
          amount: totalTips, // Positive card amount (money back to card)
          status: 'paid'
        });
      }
    }
    
    // Create separate change reversal order if there was change
    let changeReversalOrder = null;
    if (totalChange > 0) {
      changeReversalOrder = await OrderModel.create({
        total_amount: 0, // No order amount, just change reversal
        total_tax: 0,
        payment_method: originalOrder.payment_method,
        status: 'completed',
        notes: `ANNULATION monnaie - Commande #${orderId} - Raison: ${reason}`,
        tips: 0,
        change: -totalChange // Negative change to reverse
      });
      
      // Handle change reversal for all payment methods
      if (originalOrder.payment_method === 'split' && originalSubBills.length > 0) {
        // For split payments, reverse the change (typically cash)
        await SubBillModel.create({
          order_id: changeReversalOrder.id,
          payment_method: 'cash',
          amount: totalChange, // Positive cash amount (money back to cash drawer)
          status: 'paid'
        });
      } else if (originalOrder.payment_method === 'cash') {
        // For cash payments, reverse the change
        await SubBillModel.create({
          order_id: changeReversalOrder.id,
          payment_method: 'cash',
          amount: totalChange, // Positive cash amount (money back to cash drawer)
          status: 'paid'
        });
      } else if (originalOrder.payment_method === 'card') {
        // For card payments, reverse the change
        await SubBillModel.create({
          order_id: changeReversalOrder.id,
          payment_method: 'card',
          amount: totalChange, // Positive card amount (money back to card)
          status: 'paid'
        });
      }
    }
    
    // Log to legal journal as CORRECTION for main order
    try {
      await LegalJournalModel.addEntry(
        'CORRECTION',
        cancellationOrder.id,
        -totalOrderAmount,
        -totalOrderTax,
        originalOrder.payment_method,
        {
          type: 'ORDER_CANCELLATION',
          original_order_id: orderId,
          reason,
          original_amount: totalOrderAmount,
          original_tax: totalOrderTax,
          original_tips: totalTips,
          original_change: totalChange,
          cancellation_amount: -totalOrderAmount,
          cancellation_tax: -totalOrderTax,
          payment_method: originalOrder.payment_method,
          split_payment: originalOrder.payment_method === 'split',
          items_cancelled: originalItems.length
        },
        (req as any).user ? String((req as any).user.id) : undefined
      );
    } catch (journalError) {
      console.error('Legal journal error (order cancellation):', journalError);
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
        resource_id: String(cancellationOrder.id),
        action_details: { 
          original_order_id: orderId,
          cancellation_order_id: cancellationOrder.id,
          tip_reversal_order_id: tipReversalOrder?.id,
          change_reversal_order_id: changeReversalOrder?.id,
          reason,
          original_amount: totalOrderAmount,
          original_tax: totalOrderTax,
          original_tips: totalTips,
          original_change: totalChange,
          cancellation_amount: totalOrderAmount,
          payment_method: originalOrder.payment_method,
          items_cancelled: originalItems.length
        },
        ip_address: ip,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Audit log error (order cancellation):', error);
    }
    
    res.status(201).json({
      message: 'Commande annulée avec succès',
      cancellation_order: cancellationOrder,
      tip_reversal_order: tipReversalOrder,
      change_reversal_order: changeReversalOrder,
      cancellation_items: createdCancellationItems,
      original_order_id: orderId,
      original_amount: totalOrderAmount,
      original_tax: totalOrderTax,
      original_tips: totalTips,
      original_change: totalChange,
      cancellation_amount: totalOrderAmount,
      payment_method: originalOrder.payment_method
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la commande', details: error.message });
  }
});

export default router; 