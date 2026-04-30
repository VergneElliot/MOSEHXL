import LegalJournalModel from '../../models/legalJournal';
import { Logger } from '../../utils/logger';
import { pool } from '../../app';

export type SoftwareEventType =
  | 'PRINTING_CONFIGURATION_UPDATED'
  | 'HAPPY_HOUR_SETTINGS_UPDATED'
  | 'SERVER_STARTED'
  | 'SERVER_SHUTDOWN'
  | 'AUTO_CLOSURE_SCHEDULER_STARTED'
  | 'AUTO_CLOSURE_SCHEDULER_START_FAILED'
  | 'ESTABLISHMENT_USER_CREATED'
  | 'ESTABLISHMENT_USER_DELETED'
  | 'USER_PERMISSIONS_UPDATED'
  | 'USER_ROLE_UPDATED'
  | 'ESTABLISHMENT_CREATED'
  | 'ESTABLISHMENT_DELETED'
  | 'ESTABLISHMENT_STATUS_UPDATED'
  | 'ESTABLISHMENT_SUBSCRIPTION_UPDATED'
  | 'SYSTEM_TIME_CHANGE_DETECTED'
  | 'SYSTEM_TIMEZONE_OFFSET_CHANGED'
  | 'SOFTWARE_VERSION_REPORTED';

type SoftwareEventInput = {
  establishmentId: string;
  eventType: SoftwareEventType;
  eventData: Record<string, unknown>;
  userId?: string;
};

const logger = Logger.getInstance();

export async function logSoftwareEventBestEffort(input: SoftwareEventInput): Promise<void> {
  try {
    await LegalJournalModel.logSoftwareEvent(
      input.establishmentId,
      input.eventType,
      input.eventData,
      input.userId
    );
  } catch (error: unknown) {
    logger.error(
      `Software event journal append failed (${input.eventType}) for establishment ${input.establishmentId}`,
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_JOURNAL'
    );
  }
}

async function getAllEstablishmentIds(): Promise<string[]> {
  const result = await pool.query('SELECT id FROM establishments');
  return result.rows
    .map((row) => row as { id?: string })
    .map((row) => row.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export async function logSoftwareEventForAllEstablishmentsBestEffort(
  eventType: SoftwareEventType,
  eventData: Record<string, unknown>,
  userId?: string
): Promise<void> {
  try {
    const establishmentIds = await getAllEstablishmentIds();
    for (const establishmentId of establishmentIds) {
      await logSoftwareEventBestEffort({
        establishmentId,
        eventType,
        eventData,
        userId,
      });
    }
  } catch (error: unknown) {
    logger.error(
      `Failed to enumerate establishments for software event ${eventType}`,
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_JOURNAL'
    );
  }
}
