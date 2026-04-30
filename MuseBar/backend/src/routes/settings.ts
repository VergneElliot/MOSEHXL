/**
 * Establishment-scoped settings API.
 * Happy Hour and other settings are stored per establishment so they sync across devices
 * and are not shared between establishments.
 */

import express from 'express';
import { requireAuth, getEstablishmentId, requireAnyPermission, requirePermission } from './auth';
import { P } from '../permissions/registry';
import { HappyHourSettingsModel, defaultHappyHour } from '../models/happyHourSettings';
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

export default router;
