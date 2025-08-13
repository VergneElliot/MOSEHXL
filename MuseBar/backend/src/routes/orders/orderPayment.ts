/**
 * Order Payment Operations
 * Handles payment processing, returns, cancellations, and refunds
 */

import express from 'express';
import { OrderModel, OrderItemModel, SubBillModel } from '../../models';
import { LegalJournalModel } from '../../models/legalJournal';
import { AuditTrailModel } from '../../models/auditTrail';
import { requireAuth } from '../auth';
import { validateBody } from '../../middleware/validation';

const router = express.Router();

/**
 * POST quick item return (retour)
 * POST /api/orders/payment/retour
 */
router.post(
  '/retour',
  requireAuth,
  validateBody([
    { field: 'item', required: true },
    { field: 'reason', required: true },
  ]),
  async (req, res) => {
  try {
    const { item, reason, paymentMethod = 'cash' } = req.body as {
      item: {
        productId?: number;
        productName: string;
        quantity?: number;
        unitPrice: number;
        totalPrice: number;
        taxRate: number; // decimal 0-1
      };
      reason: string;
      paymentMethod?: 'cash' | 'card';
    };
    
    if (!['cash', 'card'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Payment method must be either "cash" or "card"' });
    }
    
    // Calculate negative amounts
    const totalPrice = Number(item.totalPrice);
    const taxRate = Number(item.taxRate);
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
      tax_rate: taxRate, // keep decimal for storage consistency
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
        req.user ? String(req.user.id) : undefined
      );
    } catch (journalError) {
      console.error('Legal journal error (retour):', journalError);
    }
    
    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = req.user ? String(req.user.id) : undefined;
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
}
);

/**
 * POST unified cancellation function - handles all cancellation scenarios
 * POST /api/orders/payment/cancel-unified
 */
router.post(
  '/cancel-unified',
  requireAuth,
  validateBody([
    { field: 'orderId', required: true },
    { field: 'reason', required: true },
  ]),
  async (req, res) => {
  try {
    const { orderId, reason, cancellationType = 'full', itemsToCancel, includeTipReversal = false } = req.body as {
      orderId: number;
      reason: string;
      cancellationType?: 'full' | 'partial' | 'items-only';
      itemsToCancel?: number[];
      includeTipReversal?: boolean;
    };
    
    if (!orderId || !reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Order ID and cancellation reason are required' });
    }
    
    // Validate cancellation type
    const validTypes = ['full', 'partial', 'items-only'];
    if (!validTypes.includes(cancellationType)) {
      return res.status(400).json({ error: 'Invalid cancellation type' });
    }
    
    // Get the original order
    const originalOrder = await OrderModel.getById(orderId);
    if (!originalOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (originalOrder.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed orders can be cancelled' });
    }
    
    // Check if this is a "Faire de la monnaie" operation
    const isChangeOperation = 
      originalOrder.total_amount === 0 &&
      originalOrder.total_tax === 0 &&
      originalOrder.notes &&
      originalOrder.notes.includes('Faire de la Monnaie');
    
    // Get original order items and sub-bills
    const originalItems = await OrderItemModel.getByOrderId(orderId);
    const originalSubBills = originalOrder.payment_method === 'split' 
      ? await SubBillModel.getByOrderId(orderId) 
      : [];
    
    // Calculate cancellation amounts
    let cancellationAmount = 0;
    let cancellationTax = 0;
    const cancelledItems: typeof originalItems = [];
    
    if (cancellationType === 'full') {
      cancellationAmount = originalOrder.total_amount;
      cancellationTax = originalOrder.total_tax;
      cancelledItems = originalItems;
    } else if (cancellationType === 'partial' || cancellationType === 'items-only') {
      if (!itemsToCancel || !Array.isArray(itemsToCancel) || itemsToCancel.length === 0) {
        return res.status(400).json({ error: 'Items to cancel are required for partial cancellation' });
      }
      
      // Calculate amounts for specific items
      for (const itemId of itemsToCancel) {
        const item = originalItems.find(i => i.id === itemId);
        if (item) {
          cancellationAmount += item.total_price;
          cancellationTax += item.tax_amount;
          cancelledItems.push(item);
        }
      }
    }
    
    // Include tip reversal if requested
    if (includeTipReversal && originalOrder.tips && originalOrder.tips > 0) {
      cancellationAmount += originalOrder.tips;
    }
    
    // Create cancellation order
    const cancellationOrder = await OrderModel.create({
      total_amount: -cancellationAmount,
      total_tax: -cancellationTax,
      payment_method: originalOrder.payment_method,
      status: 'completed',
      notes: `ANNULATION - ${cancellationType.toUpperCase()} - Raison: ${reason} - Order ID: ${orderId}`
    });
    
    // Create cancellation items
    const cancellationOrderItems = await Promise.all(
      cancelledItems.map(async (item) => {
        return await OrderItemModel.create({
          order_id: cancellationOrder.id,
          product_id: item.product_id,
          product_name: `[ANNULATION] ${item.product_name}`,
          quantity: -Math.abs(item.quantity),
          unit_price: item.unit_price,
          total_price: -item.total_price,
          tax_rate: item.tax_rate,
          tax_amount: -item.tax_amount,
          happy_hour_applied: item.happy_hour_applied,
          happy_hour_discount_amount: -item.happy_hour_discount_amount
        });
      })
    );
    
    // Log to legal journal
    try {
      await LegalJournalModel.addEntry(
        'REFUND',
        cancellationOrder.id,
        -cancellationAmount,
        -cancellationTax,
        originalOrder.payment_method,
        {
          type: 'ORDER_CANCELLATION',
          cancellation_type: cancellationType,
          reason,
          original_order_id: orderId,
          cancelled_items: cancelledItems.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            total_price: item.total_price
          })),
          total_cancelled: -cancellationAmount,
          tax_cancelled: -cancellationTax
        },
        req.user ? String(req.user.id) : undefined
      );
    } catch (journalError) {
      console.error('Legal journal error (cancellation):', journalError);
    }
    
    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = req.user ? String(req.user.id) : undefined;
    try {
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'CANCEL_ORDER',
        resource_type: 'ORDER',
        resource_id: String(cancellationOrder.id),
        action_details: { 
          original_order_id: orderId,
          cancellation_type: cancellationType,
          reason,
          cancelled_items: cancelledItems,
          cancellation_amount: -cancellationAmount
        },
        ip_address: ip,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Audit log error (cancellation):', error);
    }
    
    res.status(201).json({
      message: 'Annulation enregistrée avec succès',
      cancellation_order: cancellationOrder,
      cancellation_items: cancellationOrderItems,
      cancelled_amount: -cancellationAmount
    });
  } catch (error: any) {
    console.error('Error processing cancellation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation', details: error.message });
  }
}
);

export default router; 