import { pool } from '../db/pool';
import {
  parseLaborSettingsFromJson,
  type LaborComplianceSettings,
} from '../services/labor/laborCompliance';
import {
  parsePayrollSettings,
  type PayrollSettings,
} from '../services/labor/payrollCalculations';

const SETTINGS_KEY = 'labor_compliance_settings';

export type EstablishmentLaborSettings = LaborComplianceSettings & PayrollSettings;

export function parseEstablishmentLaborSettings(raw: unknown): EstablishmentLaborSettings {
  const compliance = parseLaborSettingsFromJson(raw);
  const payroll = parsePayrollSettings(
    raw && typeof raw === 'object' ? (raw as Partial<PayrollSettings>) : null
  );
  return { ...compliance, ...payroll };
}

export class LaborSettingsModel {
  static async get(establishmentId: string): Promise<EstablishmentLaborSettings> {
    const result = await pool.query(
      `SELECT setting_value FROM establishment_settings
       WHERE establishment_id = $1 AND setting_key = $2`,
      [establishmentId, SETTINGS_KEY]
    );
    if (result.rows.length === 0) {
      return parseEstablishmentLaborSettings(null);
    }
    try {
      return parseEstablishmentLaborSettings(JSON.parse(result.rows[0].setting_value));
    } catch {
      return parseEstablishmentLaborSettings(null);
    }
  }

  static async upsert(
    establishmentId: string,
    settings: Partial<EstablishmentLaborSettings>
  ): Promise<EstablishmentLaborSettings> {
    const current = await this.get(establishmentId);
    const merged = { ...current, ...settings };
    await pool.query(
      `INSERT INTO establishment_settings (establishment_id, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (establishment_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [establishmentId, SETTINGS_KEY, JSON.stringify(merged)]
    );
    return merged;
  }
}
