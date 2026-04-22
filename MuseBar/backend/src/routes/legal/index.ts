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

const router = express.Router();

// Mount sub-routers
router.use('/journal', journalRouter);
router.use('/closure', closureRouter);
router.use('/archive', archiveRouter);
router.use('/compliance', complianceRouter);
router.use('/stats', statsRouter);
// Mount `business-day-stats` before `businessInfo` so `/legal/business-info` stays
// permission-gated while stats stay available to all establishment users (see History tab).
router.use('/', businessDayStatsRouter);
router.use('/', businessInfoRouter);

export default router; 