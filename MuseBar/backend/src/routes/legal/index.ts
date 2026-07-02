/**
 * Legal Router - Main Entry Point
 * Combines all legal-related routes for clean separation of concerns
 */

import express from 'express';
import journalRouter from './journal';
import closureRouter from './closure';
import archiveRouter from './archive';
import complianceRouter from './compliance';
import businessInfoRouter from './businessInfo';
import businessDayStatsRouter from './businessDayStats';
import statsRouter from './stats';
import auditRouter from './audit';
import invoicesRouter from './invoices';

const router = express.Router();

// Mount sub-routers
router.use('/journal', journalRouter);
router.use('/closure', closureRouter);
router.use('/archive', archiveRouter);
router.use('/invoices', invoicesRouter);
router.use('/compliance', complianceRouter);
router.use('/stats', statsRouter);
router.use('/audit', auditRouter);
// Mount `business-day-stats` before `businessInfo` for stable path routing.
// business-day-stats is now permission-gated (`access_compliance`) like other legal data surfaces.
router.use('/', businessDayStatsRouter);
router.use('/', businessInfoRouter);

export default router; 