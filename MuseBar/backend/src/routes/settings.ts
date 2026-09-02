/**
 * Establishment-scoped settings API.
 * Happy Hour and other settings are stored per establishment so they sync across devices
 * and are not shared between establishments.
 */

import express from 'express';
import {
  requireAuth,
  getEstablishmentId,
  requireAnyPermission,
  requirePermission,
  requireEstablishmentAdminOrPermission,
} from './auth';
import { P } from '../permissions/registry';
import { HappyHourSettingsModel, defaultHappyHour } from '../models/happyHourSettings';
import {
  OpeningHoursSettingsModel,
  normalizeOpeningHours,
} from '../models/openingHoursSettings';
import { EstablishmentOperatingHoursModel } from '../models/establishmentOperatingHours';
import { logSoftwareEventBestEffort } from '../services/legal/softwareEventJournal';
import { logError } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/settings/happy-hour
 * POS needs to read the schedule for automatic Happy Hour; Paramètres needs it for editing.
 */
router.get(
  '/happy-hour',
  requireAnyPermission([P.access_pos, P.access_settings]),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    try {
      const value = await HappyHourSettingsModel.getHappyHourSettings(establishmentId);
      return res.json(value);
    } catch (error) {
      logError(
        'Error fetching happy hour settings',
        error instanceof Error ? error : new Error(String(error))
      );
      throw new AppError(
        'Failed to fetch Happy Hour settings',
        500,
        'SETTINGS_HAPPY_HOUR_FETCH_FAILED'
      );
    }
  })
);

/**
 * PUT /api/settings/happy-hour
 * Saves Happy Hour settings for the authenticated user's establishment.
 */
router.put('/happy-hour', requirePermission(P.access_settings), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  try {
    const body = req.body || {};
    // Migrate legacy isManuallyActivated to manualOverride if sent by old clients
    const legacyOverride = body.isManuallyActivated === true ? 'on' : undefined;
    const settings = {
      isEnabled: body.isEnabled ?? defaultHappyHour.isEnabled,
      startTime: body.startTime ?? defaultHappyHour.startTime,
      endTime: body.endTime ?? defaultHappyHour.endTime,
      manualOverride: (['auto', 'on', 'off'].includes(body.manualOverride)
        ? body.manualOverride
        : legacyOverride ?? defaultHappyHour.manualOverride),
      discountType: body.discountType ?? defaultHappyHour.discountType,
      discountValue: typeof body.discountValue === 'number' ? body.discountValue : Number(body.discountValue) || defaultHappyHour.discountValue,
    };

    await HappyHourSettingsModel.upsertHappyHourSettings(establishmentId, settings);
    await logSoftwareEventBestEffort({
      establishmentId,
      eventType: 'HAPPY_HOUR_SETTINGS_UPDATED',
      userId: req.user ? String(req.user.id) : undefined,
      eventData: {
        isEnabled: settings.isEnabled,
        startTime: settings.startTime,
        endTime: settings.endTime,
        manualOverride: settings.manualOverride,
        discountType: settings.discountType,
        discountValue: settings.discountValue,
      },
    });

    res.json(settings);
  } catch (error) {
    logError(
      'Error saving happy hour settings',
      error instanceof Error ? error : new Error(String(error))
    );
    throw new AppError(
      'Failed to save Happy Hour settings',
      500,
      'SETTINGS_HAPPY_HOUR_SAVE_FAILED'
    );
  }
}));

/**
 * GET /api/settings/opening-hours
 */
router.get(
  '/opening-hours',
  requireEstablishmentAdminOrPermission(P.access_settings),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const settings = await OpeningHoursSettingsModel.get(establishmentId);
    const configured = await OpeningHoursSettingsModel.isConfigured(establishmentId);
    return res.json({ settings, configured });
  })
);

/**
 * PUT /api/settings/opening-hours
 */
router.put(
  '/opening-hours',
  requireEstablishmentAdminOrPermission(P.access_settings),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const body = req.body || {};
    const raw =
      body.settings && typeof body.settings === 'object' ? body.settings : body;
    const settings = await OpeningHoursSettingsModel.upsert(
      establishmentId,
      normalizeOpeningHours(raw)
    );
    await logSoftwareEventBestEffort({
      establishmentId,
      eventType: 'OPENING_HOURS_UPDATED',
      userId: req.user ? String(req.user.id) : undefined,
      eventData: { timezone: settings.timezone },
    });
    return res.json({ settings, configured: true });
  })
);

/**
 * GET /api/settings/operating-hours
 * Real opening schedule — used for CP décompte (not reservation windows).
 */
router.get(
  '/operating-hours',
  requireEstablishmentAdminOrPermission(P.access_settings),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const configured = await EstablishmentOperatingHoursModel.isConfigured(establishmentId);
    const settings = await EstablishmentOperatingHoursModel.get(establishmentId);
    return res.json({
      settings,
      configured,
      fallback_from_reservations: !configured,
    });
  })
);

/**
 * PUT /api/settings/operating-hours
 */
router.put(
  '/operating-hours',
  requireEstablishmentAdminOrPermission(P.access_settings),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const body = req.body || {};
    const raw =
      body.settings && typeof body.settings === 'object' ? body.settings : body;
    const settings = await EstablishmentOperatingHoursModel.upsert(
      establishmentId,
      normalizeOpeningHours(raw)
    );
    await logSoftwareEventBestEffort({
      establishmentId,
      eventType: 'OPERATING_HOURS_UPDATED',
      userId: req.user ? String(req.user.id) : undefined,
      eventData: { timezone: settings.timezone },
    });
    return res.json({ settings, configured: true, fallback_from_reservations: false });
  })
);

export default router;
