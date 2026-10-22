/**
 * Legal Closure Operations
 * Handles daily, weekly, monthly, and annual closure bulletins
 */

import express from 'express';
import { requireAuth, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import createDailyRouter from './closure/createDaily';
import createPeriodRouter from './closure/createPeriod';
import createGenericRouter from './closure/createGeneric';
import listRouter from './closure/list';
import voidRouter from './closure/void';

const router = express.Router();

// All closure routes require authentication and clôture access.
// Closure bulletins are legally binding fiscal documents (NF 525).
router.use(requireAuth, requirePermission(P.access_closure));
router.use(createDailyRouter);
router.use(createPeriodRouter);
router.use(createGenericRouter);
router.use(listRouter);
router.use(voidRouter);

export default router;
