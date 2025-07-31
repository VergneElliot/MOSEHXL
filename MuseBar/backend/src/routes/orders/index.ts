/**
 * Orders Router - Main Entry Point
 * Combines all order-related routes for clean separation of concerns
 */

import express from 'express';
import orderCRUDRouter from './orderCRUD';
import orderPaymentRouter from './orderPayment';
import orderLegalRouter from './orderLegal';
import orderAuditRouter from './orderAudit';

const router = express.Router();

// Mount sub-routers
router.use('/', orderCRUDRouter);
router.use('/payment', orderPaymentRouter);
router.use('/legal', orderLegalRouter);
router.use('/audit', orderAuditRouter);

export default router; 