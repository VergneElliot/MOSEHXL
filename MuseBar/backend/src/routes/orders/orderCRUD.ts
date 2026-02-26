/**
 * Order CRUD Operations
 * All operations are scoped to the authenticated user's establishment.
 */

import express from 'express';
import { OrderModel, OrderItemModel, SubBillModel } from '../../models';
import { LegalJournalModel } from '../../models/legalJournal';
import { AuditTrailModel } from '../../models/auditTrail';
import { requireAuth } from '../auth';
import { validateBody, validateParams, commonValidations, paramValidations } from '../../middleware/validation';

const router = express.Router();

// All order routes require authentication.
router.use(requireAuth);

/** Extracts establishment_id from the authenticated request or rejects with 403. */
function getEstablishmentId(req: express.Request, res: express.Response): string | null {
  const id = req.user?.establishment_id;
  if (!id) {
    res.status(403).json({ error: 'No establishment associated with this account' });
    return null;
  }
  return id;
}

/**
 * GET /api/orders — order history for this establishment
 */
router.get('/', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const orders = await OrderModel.getAll(establishmentId);
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItemModel.getByOrderId(order.id);
        const subBills = order.payment_method === 'split' ? await SubBillModel.getByOrderId(order.id) : [];
        return { ...order, items, sub_bills: subBills, tips: order.tips || 0, change: order.change || 0 };
      })
    );
    res.json(ordersWithDetails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * GET /api/orders/:id
 */
router.get('/:id', validateParams([paramValidations.id]), async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id);
    const order = await OrderModel.getById(id, establishmentId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const items = await OrderItemModel.getByOrderId(id);
    const subBills = order.payment_method === 'split' ? await SubBillModel.getByOrderId(id) : [];
    res.json({ ...order, items, sub_bills: subBills, tips: order.tips || 0, change: order.change || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * POST /api/orders — create a new order (cashier action)
 */
router.post('/', validateBody(commonValidations.orderCreate), async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { total_amount, total_tax, payment_method, status, notes, items, sub_bills, tips, change } = req.body;

    const order = await OrderModel.create(
      { total_amount, total_tax, payment_method, status, notes: notes || '', tips: tips || 0, change: change || 0, establishment_id: establishmentId },
      establishmentId
    );

    const createdItems = await Promise.all(
      items.map(async (item: any) =>
        OrderItemModel.create({
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
          description: item.description || '',
        })
      )
    );

    let createdSubBills: any[] = [];
    if (payment_method === 'split' && Array.isArray(sub_bills)) {
      createdSubBills = await Promise.all(
        sub_bills.map(async (sb: any) =>
          SubBillModel.create({ order_id: order.id, payment_method: sb.payment_method, amount: sb.amount, status: 'pending' })
        )
      );
    }

    // Write to legal journal — every completed sale must be recorded.
    // This is required by French fiscal law (Article 286-I-3 bis du CGI / NF525).
    // We do this AFTER the order is committed to the DB. If the journal write
    // fails we log the error but DO NOT block the response — the sale happened
    // and must not be rolled back just because of a logging issue. The integrity
    // check endpoint can later flag the missing entry.
    if (status === 'completed') {
      LegalJournalModel.logTransaction(
        {
          id: order.id,
          total_amount: order.total_amount,
          total_tax: order.total_tax,
          payment_method: order.payment_method,
          items: createdItems,
          created_at: order.created_at,
        },
        req.user ? String(req.user.id) : undefined
      ).catch((journalError: unknown) => {
        console.error('[LEGAL JOURNAL] Failed to write journal entry for order', order.id, journalError);
      });

      // Write to audit trail — records who created what, when, and from where.
      AuditTrailModel.logAction({
        user_id: req.user ? String(req.user.id) : undefined,
        action_type: 'ORDER_CREATED',
        resource_type: 'ORDER',
        resource_id: String(order.id),
        action_details: {
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          item_count: createdItems.length,
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      }).catch((auditError: unknown) => {
        console.error('[AUDIT TRAIL] Failed to write audit entry for order', order.id, auditError);
      });
    }

    res.status(201).json({ ...order, items: createdItems, sub_bills: createdSubBills });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * PUT /api/orders/:id
 */
router.put('/:id', validateParams([paramValidations.id]), async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id);
    const order = await OrderModel.getById(id, establishmentId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const updatedOrder = await OrderModel.update(id, req.body, establishmentId);
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

/**
 * DELETE /api/orders/:id
 */
router.delete('/:id', validateParams([paramValidations.id]), async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id);
    const order = await OrderModel.getById(id, establishmentId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const deleted = await OrderModel.delete(id, establishmentId);
    if (deleted) {
      res.json({ message: 'Order deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete order' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router;
