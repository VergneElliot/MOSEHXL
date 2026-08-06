import { pool } from '../db/pool';
import { Logger } from '../utils/logger';
import { DEFAULT_APP_TIMEZONE } from '../config/timezone';

export interface ClosureAutoSettings {
  auto_closure_enabled: boolean;
  daily_closure_time: string;
  timezone: string;
  grace_period_minutes: number;
  /** Recipients for automatic bulletin email; empty = no auto-send. */
  accounting_emails: string[];
}

const SETTING_KEY_CLOSURE = 'closure';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const defaultClosureSettings: ClosureAutoSettings = {
  auto_closure_enabled: true,
  daily_closure_time: '02:00',
  timezone: DEFAULT_APP_TIMEZONE,
  grace_period_minutes: 30,
  accounting_emails: [],
};

function logParseFailure(message: string, error: unknown): void {
  try {
    Logger.getInstance().error(message, error as Error, 'CLOSURE_SETTINGS');
  } catch {
    process.stderr.write(
      `[CLOSURE_SETTINGS] ${message}: ${error instanceof Error ? error.message : String(error)}\n`
    );
  }
}

function normalizeEmailList(value: unknown): string[] {
  const rawList: string[] = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      rawList.push(...String(entry).split(/[,;\s]+/));
    }
  } else if (typeof value === 'string') {
    rawList.push(...value.split(/[,;\s]+/));
  }

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const part of rawList) {
    const email = part.trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email) || seen.has(email)) continue;
    seen.add(email);
    unique.push(email);
  }
  return unique;
}

function normalizeSettings(raw: Partial<ClosureAutoSettings> | Record<string, unknown>): ClosureAutoSettings {
  const time =
    typeof raw.daily_closure_time === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(raw.daily_closure_time)
      ? raw.daily_closure_time
      : defaultClosureSettings.daily_closure_time;

  const timezone =
    typeof raw.timezone === 'string' && raw.timezone.trim().length > 0
      ? raw.timezone.trim()
      : defaultClosureSettings.timezone;

  let grace = defaultClosureSettings.grace_period_minutes;
  if (typeof raw.grace_period_minutes === 'number' && Number.isFinite(raw.grace_period_minutes)) {
    grace = raw.grace_period_minutes;
  } else if (typeof raw.grace_period_minutes === 'string') {
    const parsed = parseInt(raw.grace_period_minutes, 10);
    if (Number.isFinite(parsed)) grace = parsed;
  }
  grace = Math.min(120, Math.max(0, grace));

  let autoEnabled = defaultClosureSettings.auto_closure_enabled;
  if (typeof raw.auto_closure_enabled === 'boolean') {
    autoEnabled = raw.auto_closure_enabled;
  } else if (typeof raw.auto_closure_enabled === 'string') {
    autoEnabled = raw.auto_closure_enabled === 'true';
  }

  return {
    auto_closure_enabled: autoEnabled,
    daily_closure_time: time,
    timezone,
    grace_period_minutes: grace,
    accounting_emails: normalizeEmailList(
      (raw as { accounting_emails?: unknown }).accounting_emails
    ),
  };
}

/**
 * Per-establishment auto-closure settings (establishment_settings),
 * with fallback to the legacy global/per-row closure_settings table.
 */
export class ClosureSettingsModel {
  static async getClosureSettings(establishmentId: string): Promise<ClosureAutoSettings> {
    const fromEstablishment = await this.readFromEstablishmentSettings(establishmentId);
    if (fromEstablishment) return fromEstablishment;

    const fromLegacy = await this.readFromLegacyClosureSettings(establishmentId);
    if (fromLegacy) return fromLegacy;

    return { ...defaultClosureSettings };
  }

  static async upsertClosureSettings(
    establishmentId: string,
    settings: Partial<ClosureAutoSettings> | Record<string, unknown>
  ): Promise<ClosureAutoSettings> {
    const normalized = normalizeSettings(settings);
    await pool.query(
      `INSERT INTO establishment_settings (establishment_id, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (establishment_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [establishmentId, SETTING_KEY_CLOSURE, JSON.stringify(normalized)]
    );
    return normalized;
  }

  private static async readFromEstablishmentSettings(
    establishmentId: string
  ): Promise<ClosureAutoSettings | null> {
    try {
      const result = await pool.query(
        `SELECT setting_value FROM establishment_settings
         WHERE establishment_id = $1 AND setting_key = $2`,
        [establishmentId, SETTING_KEY_CLOSURE]
      );
      if (result.rows.length === 0) return null;
      const raw = result.rows[0]?.setting_value;
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return normalizeSettings(parsed as Partial<ClosureAutoSettings>);
      } catch (error) {
        logParseFailure('Failed to parse closure settings JSON', error);
        return null;
      }
    } catch (error) {
      logParseFailure('Failed to read establishment_settings for closure', error);
      return null;
    }
  }

  private static async readFromLegacyClosureSettings(
    establishmentId: string
  ): Promise<ClosureAutoSettings | null> {
    try {
      let result;
      try {
        result = await pool.query(
          'SELECT setting_key, setting_value FROM closure_settings WHERE establishment_id = $1',
          [establishmentId]
        );
      } catch {
        result = await pool.query('SELECT setting_key, setting_value FROM closure_settings');
      }

      if (!result.rows.length) return null;

      const flat: Record<string, string> = {};
      for (const row of result.rows) {
        flat[row.setting_key] = row.setting_value;
      }

      return normalizeSettings({
        auto_closure_enabled: flat.auto_closure_enabled,
        daily_closure_time: flat.daily_closure_time,
        timezone: flat.timezone,
        grace_period_minutes: flat.closure_grace_period_minutes ?? flat.grace_period_minutes,
      });
    } catch (error) {
      logParseFailure('Failed to read legacy closure_settings', error);
      return null;
    }
  }
}
