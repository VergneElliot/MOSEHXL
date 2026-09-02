import { pool } from '../db/pool';
import { OpeningHoursSettingsModel } from './openingHoursSettings';
import {
  defaultOpeningHours,
  normalizeOpeningHours,
  type OpeningHoursSettings,
} from './openingHoursSettings';

const SETTING_KEY = 'establishment_operating_hours';

/**
 * Real establishment opening schedule (service days).
 * Used for CP décompte — independent of reservation booking windows.
 */
export class EstablishmentOperatingHoursModel {
  static async get(establishmentId: string): Promise<OpeningHoursSettings> {
    const result = await pool.query(
      `SELECT setting_value FROM establishment_settings
       WHERE establishment_id = $1 AND setting_key = $2`,
      [establishmentId, SETTING_KEY]
    );
    if (result.rows.length === 0) {
      return OpeningHoursSettingsModel.get(establishmentId);
    }
    try {
      const parsed = JSON.parse(result.rows[0].setting_value) as Record<string, unknown>;
      return normalizeOpeningHours(parsed);
    } catch {
      return OpeningHoursSettingsModel.get(establishmentId);
    }
  }

  static async upsert(
    establishmentId: string,
    settings: OpeningHoursSettings
  ): Promise<OpeningHoursSettings> {
    const normalized = normalizeOpeningHours(settings);
    await pool.query(
      `INSERT INTO establishment_settings (establishment_id, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (establishment_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [establishmentId, SETTING_KEY, JSON.stringify(normalized)]
    );
    return normalized;
  }

  static async isConfigured(establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM establishment_settings
       WHERE establishment_id = $1 AND setting_key = $2 LIMIT 1`,
      [establishmentId, SETTING_KEY]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Defaults when neither operating nor reservation hours exist yet. */
  static defaultSettings(): OpeningHoursSettings {
    return { ...defaultOpeningHours };
  }
}
