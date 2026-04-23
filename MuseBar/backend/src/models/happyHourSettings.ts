import { pool } from '../app';
import { Logger } from '../utils/logger';

function logParseFailure(message: string, error: unknown): void {
  try {
    Logger.getInstance().error(message, error as Error, 'HAPPY_HOUR_SETTINGS');
  } catch {
    process.stderr.write(`[HAPPY_HOUR_SETTINGS] ${message}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

export type ManualOverride = 'auto' | 'on' | 'off';

export interface HappyHourSettings {
  isEnabled: boolean;
  startTime: string;
  endTime: string;
  manualOverride: ManualOverride;
  discountType: 'percentage' | string;
  discountValue: number;
}

const SETTING_KEY_HAPPY_HOUR = 'happy_hour';

export const defaultHappyHour: HappyHourSettings = {
  isEnabled: true,
  startTime: '16:00',
  endTime: '19:00',
  manualOverride: 'auto',
  discountType: 'percentage',
  discountValue: 0.2,
};

export class HappyHourSettingsModel {
  static async getHappyHourSettings(establishmentId: string): Promise<HappyHourSettings> {
    const result = await pool.query(
      `SELECT setting_value FROM establishment_settings
       WHERE establishment_id = $1 AND setting_key = $2`,
      [establishmentId, SETTING_KEY_HAPPY_HOUR]
    );

    if (result.rows.length === 0) {
      return defaultHappyHour;
    }

    const row = result.rows[0];
    let value: HappyHourSettings = defaultHappyHour;

    try {
      value = { ...defaultHappyHour, ...(JSON.parse(row.setting_value) as Partial<HappyHourSettings>) };
    } catch (error) {
      logParseFailure('Failed to parse happy hour settings JSON', error);
      // Invalid JSON -> fall back to defaults.
      value = defaultHappyHour;
    }

    return value;
  }

  static async upsertHappyHourSettings(
    establishmentId: string,
    settings: HappyHourSettings
  ): Promise<HappyHourSettings> {
    await pool.query(
      `INSERT INTO establishment_settings (establishment_id, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (establishment_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [establishmentId, SETTING_KEY_HAPPY_HOUR, JSON.stringify(settings)]
    );

    return settings;
  }
}

