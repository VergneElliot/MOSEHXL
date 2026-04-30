/**
 * Order CRUD Operations
 * All operations are scoped to the authenticated user's establishment.
 */

import express from 'express';
import { OrderModel, OrderItemModel, SubBillModel } from '../../models';
import { Logger } from '../../utils/logger';
import { pool } from '../../db/pool';
import { getEstablishmentId, requireAuth, requireEstablishmentAdmin } from '../auth';
import { validateBody, validateParams, commonValidations, paramValidations } from '../../middleware/validation';
import { assertPosOrderLinePermissions } from '../../middleware/orderPosLinePermissions';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { createOrderWithCompliance } from '../../services/orders/orderCreationService';

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
      const creationResult = await createOrderWithCompliance(
        req.body,
        {
          establishmentId,
          userId: req.user ? String(req.user.id) : undefined,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
        logger
      );

      if (!creationResult.ok) {
        return res.status(500).json({ error: creationResult.error });
      }

      res.status(201).json({
        ...creationResult.order,
        items: creationResult.items,
        sub_bills: creationResult.subBills,
      });
    } catch (error) {
      logger.error(
        'Failed to create order',
        error instanceof Error ? error : new Error(String(error)),
        'ORDERS'
      );
      throw new AppError('Failed to create order', 500, 'ORDER_CREATE_FAILED');
    }
  })
);

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
