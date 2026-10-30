import { pool } from '../db/pool';
import { Logger } from '../utils/logger';
import { normalizeAllowedIps } from './timeClockIpAllowlist';

const ALLOWED_IPS_KEY = 'time_clock_allowed_ips';

export interface TimeClockNetworkSettings {
  allowed_ips: string[];
}

function logParseFailure(message: string, error: unknown): void {
  try {
    Logger.getInstance().error(message, error as Error, 'TIME_CLOCK');
  } catch {
    process.stderr.write(
      `[TIME_CLOCK] ${message}: ${error instanceof Error ? error.message : String(error)}\n`
    );
  }
}

export class TimeClockNetworkSettingsModel {
  static async get(establishmentId: string): Promise<TimeClockNetworkSettings> {
    const result = await pool.query(
      `SELECT setting_value FROM establishment_settings
       WHERE establishment_id = $1 AND setting_key = $2`,
      [establishmentId, ALLOWED_IPS_KEY]
    );
    if (result.rows.length === 0) {
      return { allowed_ips: [] };
    }
    try {
      const parsed = JSON.parse(result.rows[0].setting_value) as Record<string, unknown>;
      return { allowed_ips: normalizeAllowedIps(parsed.allowed_ips ?? parsed) };
    } catch (error) {
      logParseFailure('Failed to parse time_clock_allowed_ips JSON', error);
      return { allowed_ips: [] };
    }
  }

  static async upsert(
    establishmentId: string,
    settings: TimeClockNetworkSettings
  ): Promise<TimeClockNetworkSettings> {
    const normalized: TimeClockNetworkSettings = {
      allowed_ips: normalizeAllowedIps(settings.allowed_ips),
    };
    await pool.query(
      `INSERT INTO establishment_settings (establishment_id, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (establishment_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [establishmentId, ALLOWED_IPS_KEY, JSON.stringify(normalized)]
    );
    return normalized;
  }
}
