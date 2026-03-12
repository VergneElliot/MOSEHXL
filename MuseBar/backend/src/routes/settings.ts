/**
 * Establishment-scoped settings API.
 * Happy Hour and other settings are stored per establishment so they sync across devices
 * and are not shared between establishments.
 */

import express from 'express';
import { pool } from '../app';
import { requireAuth, getEstablishmentId } from './auth';

const router = express.Router();
const SETTING_KEY_HAPPY_HOUR = 'happy_hour';

const defaultHappyHour = {
  isEnabled: true,
  startTime: '16:00',
  endTime: '19:00',
  isManuallyActivated: false,
  discountType: 'percentage',
  discountValue: 0.2,
};

router.use(requireAuth);

/**
 * GET /api/settings/happy-hour
 * Returns Happy Hour settings for the authenticated user's establishment.
 */
router.get('/happy-hour', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  try {
    const result = await pool.query(
      `SELECT setting_value FROM establishment_settings
       WHERE establishment_id = $1 AND setting_key = $2`,
      [establishmentId, SETTING_KEY_HAPPY_HOUR]
    );

    if (result.rows.length === 0) {
      return res.json(defaultHappyHour);
    }

    const row = result.rows[0];
    let value = defaultHappyHour;
    try {
      value = { ...defaultHappyHour, ...JSON.parse(row.setting_value) };
    } catch {
      // invalid JSON, use defaults
    }
    res.json(value);
  } catch (error) {
    console.error('Error fetching happy hour settings:', error);
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
    const settings = {
      isEnabled: body.isEnabled ?? defaultHappyHour.isEnabled,
      startTime: body.startTime ?? defaultHappyHour.startTime,
      endTime: body.endTime ?? defaultHappyHour.endTime,
      isManuallyActivated: body.isManuallyActivated ?? defaultHappyHour.isManuallyActivated,
      discountType: body.discountType ?? defaultHappyHour.discountType,
      discountValue: typeof body.discountValue === 'number' ? body.discountValue : Number(body.discountValue) || defaultHappyHour.discountValue,
    };

    await pool.query(
      `INSERT INTO establishment_settings (establishment_id, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (establishment_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [establishmentId, SETTING_KEY_HAPPY_HOUR, JSON.stringify(settings)]
    );

    res.json(settings);
  } catch (error) {
    console.error('Error saving happy hour settings:', error);
    res.status(500).json({ error: 'Failed to save Happy Hour settings' });
  }
});

export default router;
