import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { SetupDatabase } from '../setupDatabase';
import { SetupAuditManager } from './SetupAuditManager';
import { SetupProgressTracker } from './SetupProgressTracker';

const logger = Logger.getInstance();

export async function cleanupFailedSetup(
  pool: { connect: () => Promise<PoolClient> },
  establishmentId: string,
  userId?: number
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await SetupDatabase.cleanupFailedSetup(client, establishmentId, userId);

    await SetupAuditManager.createCleanupAuditEntry(
      client,
      establishmentId,
      ['user_cleanup', 'establishment_cleanup', 'data_cleanup'],
      userId
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function retrySetupStep(
  pool: { connect: () => Promise<PoolClient> },
  establishmentId: string,
  stepId: string
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info(
      'Retrying setup step',
      undefined,
      'SETUP_WIZARD'
    );

    const client = await pool.connect();
    try {
      await SetupProgressTracker.resetProgress(client, establishmentId, stepId);
    } finally {
      client.release();
    }

    return {
      success: true,
      message: `Setup step ${stepId} retried successfully`
    };
  } catch (error) {
    logger.error(
      'Error retrying setup step',
      error as Error,
      'SETUP_WIZARD'
    );

    return {
      success: false,
      message: 'Failed to retry setup step'
    };
  }
}
