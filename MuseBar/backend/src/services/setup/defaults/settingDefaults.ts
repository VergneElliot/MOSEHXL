import { PoolClient } from 'pg';
import { SetupContext } from '../types';
import { Logger } from '../../../utils/logger';
import { getDefaultDataConfig } from './dataConfig';

const logger = Logger.getInstance();

export async function createDefaultSettings(
  client: PoolClient,
  establishmentId: string,
  context?: SetupContext
): Promise<void> {
  const config = getDefaultDataConfig();

  logger.info('Creating default settings', { establishmentId, settingsCount: Object.keys(config.settings).length }, 'SETUP_DEFAULTS');

  for (const [key, value] of Object.entries(config.settings)) {
    await client.query(
      `
      INSERT INTO establishment_settings (
        establishment_id, setting_key, setting_value, created_at, updated_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (establishment_id, setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        updated_at = CURRENT_TIMESTAMP
    `,
      [establishmentId, key, JSON.stringify(value)]
    );
  }

  logger.info('Default settings created successfully', { establishmentId, settingsCreated: Object.keys(config.settings).length }, 'SETUP_DEFAULTS');
}


