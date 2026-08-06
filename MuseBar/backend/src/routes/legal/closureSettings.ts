/**
 * Closure auto-scheduler settings (per establishment).
 * GET/PUT /api/legal/closure-settings
 * POST /api/legal/closure-settings/trigger-check
 */

import express from 'express';
import { requireAuth, getEstablishmentId, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import {
  ClosureSettingsModel,
  defaultClosureSettings,
  type ClosureAutoSettings,
} from '../../models/closureSettings';
import { ClosureScheduler } from '../../utils/closureScheduler';
import { AppError, asyncHandler, ValidationError } from '../../middleware/errorHandler';
import { Logger } from '../../utils/logger';
import { logSoftwareEventBestEffort } from '../../services/legal/softwareEventJournal';

const router = express.Router();
const requireSettings = requirePermission(P.access_settings);

function parseBodySettings(body: unknown): ClosureAutoSettings {
  const raw = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const nested =
    raw.settings && typeof raw.settings === 'object'
      ? (raw.settings as Record<string, unknown>)
      : raw;

  const merged: Partial<ClosureAutoSettings> = {
    ...defaultClosureSettings,
  };

  if (typeof nested.auto_closure_enabled === 'boolean') {
    merged.auto_closure_enabled = nested.auto_closure_enabled;
  } else if (typeof nested.auto_closure_enabled === 'string') {
    merged.auto_closure_enabled = nested.auto_closure_enabled === 'true';
  }

  if (typeof nested.daily_closure_time === 'string') {
    merged.daily_closure_time = nested.daily_closure_time;
  }

  if (typeof nested.timezone === 'string') {
    merged.timezone = nested.timezone;
  }

  if (typeof nested.grace_period_minutes === 'number') {
    merged.grace_period_minutes = nested.grace_period_minutes;
  } else if (typeof nested.grace_period_minutes === 'string') {
    merged.grace_period_minutes = parseInt(nested.grace_period_minutes, 10);
  } else if (typeof nested.closure_grace_period_minutes === 'string') {
    merged.grace_period_minutes = parseInt(nested.closure_grace_period_minutes, 10);
  } else if (typeof nested.closure_grace_period_minutes === 'number') {
    merged.grace_period_minutes = nested.closure_grace_period_minutes;
  }

  if (nested.accounting_emails !== undefined) {
    merged.accounting_emails = nested.accounting_emails as string[];
  }

  // Upsert path re-normalizes (incl. comma-separated strings → email list).
  return {
    auto_closure_enabled: merged.auto_closure_enabled ?? defaultClosureSettings.auto_closure_enabled,
    daily_closure_time: merged.daily_closure_time ?? defaultClosureSettings.daily_closure_time,
    timezone: merged.timezone ?? defaultClosureSettings.timezone,
    grace_period_minutes:
      merged.grace_period_minutes ?? defaultClosureSettings.grace_period_minutes,
    accounting_emails: (merged.accounting_emails ??
      defaultClosureSettings.accounting_emails) as string[],
  };
}

function assertValidClosureSettings(settings: ClosureAutoSettings): ClosureAutoSettings {
  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(settings.daily_closure_time)) {
    throw new ValidationError('Invalid daily_closure_time (use HH:MM)');
  }
  if (
    settings.grace_period_minutes < 0 ||
    settings.grace_period_minutes > 120 ||
    !Number.isFinite(settings.grace_period_minutes)
  ) {
    throw new ValidationError('grace_period_minutes must be between 0 and 120');
  }
  return settings;
}

function toLegacyRecord(settings: ClosureAutoSettings): Record<string, string> {
  return {
    auto_closure_enabled: String(settings.auto_closure_enabled),
    daily_closure_time: settings.daily_closure_time,
    timezone: settings.timezone,
    grace_period_minutes: String(settings.grace_period_minutes),
    closure_grace_period_minutes: String(settings.grace_period_minutes),
  };
}

// GET /api/legal/closure-settings
router.get(
  '/closure-settings',
  requireAuth,
  requireSettings,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    try {
      const settings = await ClosureSettingsModel.getClosureSettings(establishmentId);
      const scheduler = ClosureScheduler.getStatus();
      return res.json({
        settings,
        scheduler,
        // Flat legacy keys for older clients (useClosureAPI)
        ...toLegacyRecord(settings),
      });
    } catch (error) {
      Logger.getInstance().error('Error fetching closure settings', error as Error, 'LEGAL_ROUTE');
      throw new AppError('Failed to fetch closure settings', 500, 'CLOSURE_SETTINGS_FETCH_FAILED');
    }
  })
);

// PUT /api/legal/closure-settings
router.put(
  '/closure-settings',
  requireAuth,
  requireSettings,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    try {
      const parsed = parseBodySettings(req.body);
      assertValidClosureSettings(parsed);
      // Re-pass body accounting_emails so upsert can normalize comma-separated strings.
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
      const nested =
        body.settings && typeof body.settings === 'object'
          ? (body.settings as Record<string, unknown>)
          : body;
      const settings = await ClosureSettingsModel.upsertClosureSettings(establishmentId, {
        ...parsed,
        accounting_emails:
          nested.accounting_emails !== undefined
            ? nested.accounting_emails
            : parsed.accounting_emails,
      });
      const scheduler = ClosureScheduler.getStatus();

      await logSoftwareEventBestEffort({
        establishmentId,
        eventType: 'CLOSURE_SETTINGS_UPDATED',
        userId: req.user ? String(req.user.id) : undefined,
        eventData: { ...settings },
      });

      return res.json({
        settings,
        scheduler,
        ...toLegacyRecord(settings),
      });
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      Logger.getInstance().error('Error saving closure settings', error as Error, 'LEGAL_ROUTE');
      throw new AppError('Failed to save closure settings', 500, 'CLOSURE_SETTINGS_SAVE_FAILED');
    }
  })
);

// POST /api/legal/closure-settings/trigger-check
router.post(
  '/closure-settings/trigger-check',
  requireAuth,
  requireSettings,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    try {
      await ClosureScheduler.triggerManualCheckForEstablishment(establishmentId);
      return res.json({
        success: true,
        message: 'Manual closure check completed for this establishment',
        scheduler: ClosureScheduler.getStatus(),
      });
    } catch (error) {
      Logger.getInstance().error('Error triggering closure check', error as Error, 'LEGAL_ROUTE');
      throw new AppError('Failed to trigger closure check', 500, 'CLOSURE_SETTINGS_TRIGGER_FAILED');
    }
  })
);

export default router;
