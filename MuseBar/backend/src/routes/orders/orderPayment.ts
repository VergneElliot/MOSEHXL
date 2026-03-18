/**
 * Order Payment Operations router aggregator.
 * Combines retour, cancellation, and change sub-routers under /api/orders/payment.
 */

import express from 'express';
import retourRouter from './orderRetour';
import cancelRouter from './orderCancel';
import changeRouter from './orderChange';

const router = express.Router();

router.use(retourRouter);
router.use(cancelRouter);
router.use(changeRouter);

export default router;
