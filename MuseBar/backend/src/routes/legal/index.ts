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

const router = express.Router();

// Mount sub-routers
router.use('/journal', journalRouter);
router.use('/closure', closureRouter);
router.use('/archive', archiveRouter);
router.use('/compliance', complianceRouter);
router.use('/', businessInfoRouter);
router.use('/', businessDayStatsRouter);

export default router; 