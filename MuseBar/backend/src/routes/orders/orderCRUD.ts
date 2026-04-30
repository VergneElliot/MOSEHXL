/**
 * Order CRUD Operations
 * All operations are scoped to the authenticated user's establishment.
 */

import express from 'express';
import { OrderModel, OrderItemModel, SubBillModel } from '../../models';
import LegalJournalModel from '../../models/legalJournal';
import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';
import { pool } from '../../db/pool';
import { getEstablishmentId, requireAuth, requireEstablishmentAdmin } from '../auth';
import { validateBody, validateParams, commonValidations, paramValidations } from '../../middleware/validation';
import { assertPosOrderLinePermissions } from '../../middleware/orderPosLinePermissions';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

const router = express.Router();
const logger = Logger.getInstance();

router.use(requireAuth);

/**
 * GET /api/orders — order history for this establishment
 */
router.get('/', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const limitRaw = req.query.limit;
    const offsetRaw = req.query.offset;
    const limit = typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : undefined;
    const offset = typeof offsetRaw === 'string' ? parseInt(offsetRaw, 10) : undefined;

    const shouldPaginate =
      (limit != null && Number.isFinite(limit) && limit > 0) ||
      (offset != null && Number.isFinite(offset) && offset >= 0);

    const orders = await OrderModel.getAll(establishmentId, shouldPaginate ? { limit, offset } : undefined);
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItemModel.getByOrderId(order.id, establishmentId);
        const subBills = order.payment_method === 'split' ? await SubBillModel.getByOrderId(order.id, establishmentId) : [];
        return { ...order, items, sub_bills: subBills, tips: order.tips || 0, change: order.change || 0 };
      })
    );

    if (!shouldPaginate) {
      res.json(ordersWithDetails);
      return;
    }

    const totalResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM orders WHERE establishment_id = $1',
      [establishmentId]
    );

    res.json({ orders: ordersWithDetails, total: totalResult.rows[0]?.total ?? 0 });
  } catch (error) {
    logger.error(
      'Failed to fetch orders',
      error instanceof Error ? error : new Error(String(error)),
      'ORDERS'
    );
    throw new AppError('Failed to fetch orders', 500, 'ORDERS_FETCH_FAILED');
  }
}));

/**
 * GET /api/orders/:id
 */
router.get('/:id', validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id);
    const order = await OrderModel.getById(id, establishmentId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const items = await OrderItemModel.getByOrderId(id, establishmentId);
    const subBills = order.payment_method === 'split' ? await SubBillModel.getByOrderId(id, establishmentId) : [];
    res.json({ ...order, items, sub_bills: subBills, tips: order.tips || 0, change: order.change || 0 });
  } catch (error) {
    logger.error(
      'Failed to fetch order',
      error instanceof Error ? error : new Error(String(error)),
      'ORDERS'
    );
    throw new AppError('Failed to fetch order', 500, 'ORDER_FETCH_FAILED');
  }
}));

/**
 * POST /api/orders — create a new order (cashier action)
 * total_amount and total_tax are always computed from items (base TTC). Tips are stored
 * separately and are zero-sum for CA; they only affect card/cash breakdown via payment logic.
 */
router.post(
  '/',
  validateBody(commonValidations.orderCreate),
  assertPosOrderLinePermissions(),
  asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { payment_method, status, notes, items, sub_bills, tips, change } = req.body;

    // Base TTC from items only — never include tips in total_amount (zero-sum for CA).
    const itemsList = items as Array<{ total_price: number; tax_amount: number }>;
    const total_amount = itemsList.reduce((sum, i) => sum + Number(i.total_price), 0);
    const total_tax = itemsList.reduce((sum, i) => sum + Number(i.tax_amount), 0);

    const order = await OrderModel.create(
      { total_amount, total_tax, payment_method, status, notes: notes || '', tips: tips || 0, change: change || 0, establishment_id: establishmentId },
      establishmentId
    );

    const createdItems = await Promise.all(
      items.map(
        async (item: {
          product_id?: number;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          tax_rate: number;
          tax_amount: number;
          happy_hour_applied?: boolean;
          happy_hour_discount_amount?: number;
          is_manual_happy_hour?: boolean;
          description?: string;
        }) =>
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
            is_manual_happy_hour: item.is_manual_happy_hour === true,
            description: item.description || '',
          }, establishmentId)
      )
    );

    let createdSubBills: Array<{ id: number; order_id: number; payment_method: string; amount: number; status: string }> = [];
    if (payment_method === 'split' && Array.isArray(sub_bills)) {
      createdSubBills = await Promise.all(
        sub_bills.map(async (sb: { payment_method: string; amount: number }) => {
          const method: 'cash' | 'card' = sb.payment_method === 'card' ? 'card' : 'cash';
          return SubBillModel.create({ order_id: order.id, payment_method: method, amount: sb.amount, status: 'pending' }, establishmentId);
        })
      );
    }

    // Write to legal journal — every completed sale must be recorded.
    // This is required by French fiscal law (Article 286-I-3 bis du CGI / NF525).
    // Hardening policy: if the SALE journal write fails, we do not return success.
    // We attempt a compensating order delete to avoid leaving a completed sale
    // without legal journal trace.
    if (status === 'completed') {
      try {
        await LegalJournalModel.logTransaction(
          {
            id: order.id,
            establishment_id: establishmentId,
            total_amount: order.total_amount,
            total_tax: order.total_tax,
            payment_method: order.payment_method,
            items: createdItems,
            created_at: order.created_at,
          },
          req.user ? String(req.user.id) : undefined
        );
      } catch (journalError: unknown) {
        logger.error(
          `Failed to write legal journal entry for order ${order.id}`,
          journalError instanceof Error ? journalError : new Error(String(journalError)),
          'LEGAL_JOURNAL'
        );
        try {
          const deleted = await OrderModel.delete(order.id, establishmentId);
          if (!deleted) {
            logger.error(
              `Compensating delete failed after legal journal failure for order ${order.id}`,
              new Error('ORDER_COMPENSATING_DELETE_FAILED'),
              'LEGAL_JOURNAL'
            );
          }
        } catch (cleanupError: unknown) {
          logger.error(
            `Compensating delete threw after legal journal failure for order ${order.id}`,
            cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)),
            'LEGAL_JOURNAL'
          );
        }
        return res.status(500).json({
          error: 'Failed to persist legal journal entry; order creation aborted for compliance safety'
        });
      }

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
        logger.error(`Failed to write audit trail entry for order ${order.id}`, auditError instanceof Error ? auditError : new Error(String(auditError)), 'AUDIT_TRAIL');
      });
    }

    res.status(201).json({ ...order, items: createdItems, sub_bills: createdSubBills });
  } catch (error) {
    logger.error(
      'Failed to create order',
      error instanceof Error ? error : new Error(String(error)),
      'ORDERS'
    );
    throw new AppError('Failed to create order', 500, 'ORDER_CREATE_FAILED');
  }
}));

/**
 * PUT /api/orders/:id
 */
router.put('/:id', requireEstablishmentAdmin, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id);
    const order = await OrderModel.getById(id, establishmentId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const updatedOrder = await OrderModel.update(id, req.body, establishmentId);
    res.json(updatedOrder);
  } catch (error) {
    logger.error(
      `Failed to update order ${req.params.id}`,
      error instanceof Error ? error : new Error(String(error)),
      'ORDERS'
    );
    throw new AppError('Failed to update order', 500, 'ORDER_UPDATE_FAILED');
  }
}));

/**
 * DELETE /api/orders/:id
 * Not used by the current React app. Fiscal rule: a **completed** (validated) order must
 * not be hard-deleted — use annulation in Historique (`POST .../payment/cancel-unified`) instead.
 */
router.delete('/:id', requireEstablishmentAdmin, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id);
    const order = await OrderModel.getById(id, establishmentId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'completed') {
      return res.status(403).json({
        error:
          'Suppression interdite pour une commande validée. Utilisez l’annulation / retour depuis l’historique.',
      });
    }
    const deleted = await OrderModel.delete(id, establishmentId);
    if (deleted) {
      res.json({ message: 'Order deleted successfully' });
    } else {
      throw new AppError('Failed to delete order', 500, 'ORDER_DELETE_FAILED');
    }
  } catch (error) {
    logger.error(
      `Failed to delete order ${req.params.id}`,
      error instanceof Error ? error : new Error(String(error)),
      'ORDERS'
    );
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete order', 500, 'ORDER_DELETE_FAILED');
  }
}));

export default router;
