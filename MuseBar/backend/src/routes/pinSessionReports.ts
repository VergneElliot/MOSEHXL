/**
 * Operational PIN session accounting reports (non-fiscal).
 * Mounted under /api/auth/pin/sessions
 */

import express from 'express';
import { getEstablishmentId, requireAuth, requirePermission } from './auth';
import { P } from '../permissions/registry';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { readOptionalPinActor } from '../middleware/pinActor';
import { StaffPinSessionModel } from '../models/staffPinSession';
import { PinSessionReportModel } from '../models/pinSessionReport';
import { aggregatePinSessionReport } from '../services/pinSessions/pinSessionReportAggregate';

const router = express.Router();
const UUID_RE = /^[0-9a-fA-F-]{36}$/;

router.use(requireAuth);

/** Sessions overlapping a calendar/business day — for History picker. */
router.get(
  '/by-day',
  requirePermission(P.access_pos),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const dateRaw = typeof req.query.date === 'string' ? req.query.date : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      throw new ValidationError('date is required (YYYY-MM-DD)');
    }
    const { ClosureSettingsModel } = await import('../models/closureSettings');
    const { getBusinessDayPeriod } = await import('../models/legalJournal/businessDayPeriod');
    const { DEFAULT_APP_TIMEZONE } = await import('../config/timezone');
    const settings = await ClosureSettingsModel.getClosureSettings(establishmentId);
    const cut = settings.daily_closure_time || '02:00';
    const tz = settings.timezone || DEFAULT_APP_TIMEZONE;
    const day = new Date(dateRaw);
    const { start, end } = getBusinessDayPeriod(day, cut, tz);
    const sessions = await StaffPinSessionModel.listOverlappingPeriod(
      establishmentId,
      start.toDate(),
      end.toDate()
    );
    res.json({
      success: true,
      date: start.format('YYYY-MM-DD'),
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      sessions,
      note: 'Rapport de session informatif — pas un bulletin fiscal.',
    });
  })
);

router.get(
  '/reports/:reportId',
  requirePermission(P.access_pos),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const reportId = String(req.params.reportId ?? '');
    if (!UUID_RE.test(reportId)) throw new ValidationError('reportId must be a uuid');
    const report = await PinSessionReportModel.findById(establishmentId, reportId);
    if (!report) throw new NotFoundError('Report not found');
    res.json({ success: true, data: report });
  })
);

router.get(
  '/:sessionId/report-preview',
  requirePermission(P.access_pos),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const sessionId = String(req.params.sessionId ?? '');
    if (!UUID_RE.test(sessionId)) throw new ValidationError('sessionId must be a uuid');
    const snapshot = await aggregatePinSessionReport(establishmentId, sessionId);
    if (!snapshot) throw new NotFoundError('PIN session not found');
    res.json({ success: true, data: snapshot });
  })
);

router.get(
  '/:sessionId/reports',
  requirePermission(P.access_pos),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const sessionId = String(req.params.sessionId ?? '');
    if (!UUID_RE.test(sessionId)) throw new ValidationError('sessionId must be a uuid');
    const reports = await PinSessionReportModel.listForSession(establishmentId, sessionId);
    res.json({ success: true, data: reports });
  })
);

router.post(
  '/:sessionId/reports',
  requirePermission(P.access_pos),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const sessionId = String(req.params.sessionId ?? '');
    if (!UUID_RE.test(sessionId)) throw new ValidationError('sessionId must be a uuid');
    const snapshot = await aggregatePinSessionReport(establishmentId, sessionId);
    if (!snapshot) throw new NotFoundError('PIN session not found');
    const actor = readOptionalPinActor(req);
    const report = await PinSessionReportModel.insert({
      establishmentId,
      pinSessionId: sessionId,
      accountUserId: req.user?.id ?? null,
      pinUserId: actor?.id ?? null,
      snapshot,
    });
    res.status(201).json({ success: true, data: report });
  })
);

export default router;
