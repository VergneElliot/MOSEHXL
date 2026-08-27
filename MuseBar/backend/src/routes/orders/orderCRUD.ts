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
import { AppError, asyncHandler, ValidationError } from '../../middleware/errorHandler';
import { createOrderWithCompliance } from '../../services/orders/orderCreationService';
import { attachOptionsToOrderItems } from '../../services/orders/orderItemOptionsService';

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
    const waiterRaw = req.query.waiter_user_id;
    const limit = typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : undefined;
    const offset = typeof offsetRaw === 'string' ? parseInt(offsetRaw, 10) : undefined;
    const waiterUserId =
      typeof waiterRaw === 'string' && waiterRaw.trim() !== ''
        ? parseInt(waiterRaw, 10)
        : undefined;

    const shouldPaginate =
      (limit != null && Number.isFinite(limit) && limit > 0) ||
      (offset != null && Number.isFinite(offset) && offset >= 0);

    const listOpts = {
      ...(shouldPaginate ? { limit, offset } : {}),
      ...(waiterUserId != null && Number.isFinite(waiterUserId) && waiterUserId > 0
        ? { waiterUserId }
        : {}),
    };

    const orders = await OrderModel.getAll(establishmentId, listOpts);
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await attachOptionsToOrderItems(
          await OrderItemModel.getByOrderId(order.id, establishmentId),
          establishmentId
        );
        const subBills = order.payment_method === 'split' ? await SubBillModel.getByOrderId(order.id, establishmentId) : [];
        return { ...order, items, sub_bills: subBills, tips: order.tips || 0, change: order.change || 0 };
      })
    );

    if (!shouldPaginate) {
      res.json(ordersWithDetails);
      return;
    }

    const total = await OrderModel.countAll(
      establishmentId,
      waiterUserId != null && Number.isFinite(waiterUserId) && waiterUserId > 0
        ? { waiterUserId }
        : undefined
    );

    res.json({ orders: ordersWithDetails, total });
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
 * GET /api/orders/waiters — distinct waiters who have paid orders (for History filter)
 */
router.get('/waiters', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const waiters = await OrderModel.listWaitersWithSales(establishmentId);
  res.json({ waiters });
}));

/**
 * GET /api/orders/waiter-day-report?date=YYYY-MM-DD
 * Non-fiscal CA by waiter for the business day containing `date` (cut→cut).
 */
router.get('/waiter-day-report', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const dateRaw = typeof req.query.date === 'string' ? req.query.date : '';
  if (!dateRaw) {
    throw new ValidationError('date is required (YYYY-MM-DD)');
  }
  const day = new Date(dateRaw);
  if (Number.isNaN(day.getTime())) {
    throw new ValidationError('Invalid date format');
  }

  const { ClosureSettingsModel } = await import('../../models/closureSettings');
  const { getBusinessDayPeriod } = await import('../../models/legalJournal/businessDayPeriod');
  const { DEFAULT_APP_TIMEZONE } = await import('../../config/timezone');
  const settings = await ClosureSettingsModel.getClosureSettings(establishmentId);
  const cut = settings.daily_closure_time || '02:00';
  const tz = settings.timezone || DEFAULT_APP_TIMEZONE;
  const { start, end } = getBusinessDayPeriod(day, cut, tz);
  const rows = await OrderModel.waiterDayReport(establishmentId, start.toDate(), end.toDate());
  const total_amount = rows.reduce((sum, r) => sum + r.total_amount, 0);
  const order_count = rows.reduce((sum, r) => sum + r.order_count, 0);
  res.json({
    date: start.format('YYYY-MM-DD'),
    period_start: start.toISOString(),
    period_end: end.toISOString(),
    closure_time: cut,
    timezone: tz,
    order_count,
    total_amount,
    waiters: rows,
    note: 'Rapport informatif — ce n’est pas un bulletin de clôture fiscal.',
  });
}));

/**
 * GET /api/orders/:id
 */
router.get('/:id', validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id ?? '', 10);
    const order = await OrderModel.getById(id, establishmentId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const items = await attachOptionsToOrderItems(
      await OrderItemModel.getByOrderId(id, establishmentId),
      establishmentId
    );
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
        throw new AppError(creationResult.error, creationResult.status ?? 500, 'ORDER_CREATE_COMPLIANCE_FAILED');
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
      if (error instanceof AppError) throw error;
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
    const id = parseInt(req.params.id ?? '', 10);
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
    const id = parseInt(req.params.id ?? '', 10);
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
