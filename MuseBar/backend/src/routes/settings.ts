/**
 * Establishment-scoped settings API.
 * Happy Hour and other settings are stored per establishment so they sync across devices
 * and are not shared between establishments.
 */

import express from 'express';
import { requireAuth, getEstablishmentId } from './auth';
import { HappyHourSettingsModel, defaultHappyHour } from '../models/happyHourSettings';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/settings/happy-hour
 * Returns Happy Hour settings for the authenticated user's establishment.
 */
router.get('/happy-hour', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  try {
    const value = await HappyHourSettingsModel.getHappyHourSettings(establishmentId);
    return res.json(value);
  } catch (error) {
    process.stderr.write(`Error fetching happy hour settings: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to fetch Happy Hour settings' });
  }
});

/**
 * PUT /api/settings/happy-hour
 * Saves Happy Hour settings for the authenticated user's establishment.
 */
router.put('/happy-hour', async (req, res) => {
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

    res.json(settings);
  } catch (error) {
    process.stderr.write(`Error saving happy hour settings: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to save Happy Hour settings' });
  }
});

export default router;
