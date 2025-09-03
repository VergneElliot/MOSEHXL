import { PoolClient } from 'pg';
import { SetupProgress } from '../types';
import { Logger } from '../../../utils/logger';

const logger = Logger.getInstance();

export async function logSetupProgress(
  client: PoolClient,
  establishmentId: string,
  progress: SetupProgress
): Promise<void> {
  try {
    await client.query(
      `
      INSERT INTO setup_progress (
        establishment_id,
        invitation_validated,
        user_created,
        establishment_updated,
        default_data_created,
        schema_initialized,
        audit_logged,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (establishment_id) DO UPDATE SET
        invitation_validated = EXCLUDED.invitation_validated,
        user_created = EXCLUDED.user_created,
        establishment_updated = EXCLUDED.establishment_updated,
        default_data_created = EXCLUDED.default_data_created,
        schema_initialized = EXCLUDED.schema_initialized,
        audit_logged = EXCLUDED.audit_logged,
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        establishmentId,
        progress.invitation_validated,
        progress.user_created,
        progress.establishment_updated,
        progress.default_data_created,
        progress.schema_initialized,
        progress.audit_logged
      ]
    );
  } catch (error) {
    logger.warn('Failed to log setup progress: ' + (error as Error).message);
  }
}


