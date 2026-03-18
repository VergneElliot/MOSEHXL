/**
 * Quick item return (retour) endpoint.
 * POST /api/orders/payment/retour
 */

import express from 'express';
import { OrderModel, OrderItemModel } from '../../models';
import { LegalJournalModel } from '../../models/legalJournal';
import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';
import { getEstablishmentId, requireAuth } from '../auth';
import { validateBody } from '../../middleware/validation';

const router = express.Router();
const logger = Logger.getInstance();

router.post(
  '/retour',
  requireAuth,
  validateBody([
    { field: 'item', required: true },
    { field: 'reason', required: true },
  ]),
  async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
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

      // Strong validation to prevent NaN amounts being stored in the database
      const rawTotalPrice = item?.totalPrice;
      const rawTaxRate = item?.taxRate;
      const rawUnitPrice = item?.unitPrice;

      const totalPrice = Number(rawTotalPrice);
      const taxRate = Number(rawTaxRate);
      const unitPrice = Number(rawUnitPrice);

      if (!Number.isFinite(totalPrice) || !Number.isFinite(taxRate) || !Number.isFinite(unitPrice)) {
        return res.status(400).json({
          error: 'Invalid price or tax rate for retour item',
        });
      }

      if (!['cash', 'card'].includes(paymentMethod)) {
        return res
          .status(400)
          .json({ error: 'Payment method must be either "cash" or "card"' });
      }

      // Calculate negative amounts
      const itemTaxAmount = (totalPrice * taxRate) / (1 + taxRate);
      const netAmount = totalPrice - itemTaxAmount;

      // Create negative order (retour) scoped to this establishment
      const order = await OrderModel.create(
        {
          total_amount: -totalPrice,
          total_tax: -itemTaxAmount,
          payment_method: paymentMethod,
          status: 'completed',
          notes: `RETOUR direct - Article: ${item.productName} - Raison: ${reason} - Paiement: ${paymentMethod}`,
          establishment_id: establishmentId,
        },
        establishmentId
      );

      // Create negative order item
      const retourItem = await OrderItemModel.create({
        order_id: order.id,
        product_id: item.productId,
        product_name: `[RETOUR] ${item.productName}`,
        quantity: -Math.abs(item.quantity || 1),
        unit_price: unitPrice,
        total_price: -totalPrice,
        tax_rate: taxRate, // keep decimal for storage consistency
        tax_amount: -itemTaxAmount,
        happy_hour_applied: false,
        happy_hour_discount_amount: 0,
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
            payment_method: paymentMethod,
          },
          req.user ? String(req.user.id) : undefined
        );
      } catch (journalError) {
        logger.error(
          `Legal journal error (retour) for order ${order.id}`,
          journalError instanceof Error ? journalError : new Error(String(journalError)),
          'LEGAL_JOURNAL'
        );
      }

      // Log audit trail
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];
      const retourUserId = req.user ? String(req.user.id) : undefined;
      try {
        await AuditTrailModel.logAction({
          user_id: retourUserId,
          action_type: 'RETOUR_ITEM',
          resource_type: 'ORDER',
          resource_id: String(order.id),
          action_details: { retour_item: retourItem, reason, payment_method: paymentMethod },
          ip_address: ip,
          user_agent: userAgent,
        });
      } catch (auditError) {
        logger.error(
          `Audit log error (retour) for order ${order.id}`,
          auditError instanceof Error ? auditError : new Error(String(auditError)),
          'AUDIT_TRAIL'
        );
      }

      res.status(201).json({
        message: 'Retour enregistré avec succès',
        retour_order: order,
        retour_item: retourItem,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        'Error processing retour',
        error instanceof Error ? error : new Error(message),
        'ORDER_PAYMENT'
      );
      res
        .status(500)
        .json({ error: "Erreur lors du retour de l'article", details: message });
    }
  }
);

export default router;

