import LegalJournalModel from '../../models/legalJournal';
import { logError } from '../../utils/logger';
import { pool } from '../../db/pool';

export type SoftwareEventType =
  | 'PRINTING_CONFIGURATION_UPDATED'
  | 'KITCHEN_TICKET_ENQUEUE_FAILED'
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

const CRITICAL_SOFTWARE_EVENTS: ReadonlySet<SoftwareEventType> = new Set([
  'SERVER_STARTED',
  'SERVER_SHUTDOWN',
  'AUTO_CLOSURE_SCHEDULER_STARTED',
  'AUTO_CLOSURE_SCHEDULER_START_FAILED',
  'SYSTEM_TIME_CHANGE_DETECTED',
  'SYSTEM_TIMEZONE_OFFSET_CHANGED',
  'SOFTWARE_VERSION_REPORTED',
  'ESTABLISHMENT_USER_CREATED',
  'ESTABLISHMENT_USER_DELETED',
  'USER_PERMISSIONS_UPDATED',
  'USER_ROLE_UPDATED',
  'ESTABLISHMENT_CREATED',
  'ESTABLISHMENT_DELETED',
  'ESTABLISHMENT_STATUS_UPDATED',
  'ESTABLISHMENT_SUBSCRIPTION_UPDATED',
]);

const RETRY_DELAYS_MS = [0, 50, 150];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function appendWithRetry(input: SoftwareEventInput): Promise<void> {
  let lastError: unknown;
  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs > 0) await sleep(delayMs);
    try {
      await LegalJournalModel.logSoftwareEvent(
        input.establishmentId,
        input.eventType,
        input.eventData,
        input.userId
      );
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw (
    lastError instanceof Error
      ? lastError
      : new Error(
          `Unknown software event append failure (${input.eventType}) for establishment ${input.establishmentId}`
        )
  );
}

export function isCriticalSoftwareEvent(eventType: SoftwareEventType): boolean {
  return CRITICAL_SOFTWARE_EVENTS.has(eventType);
}

export async function logSoftwareEventFailSafe(input: SoftwareEventInput): Promise<void> {
  await appendWithRetry(input);
}

export async function logSoftwareEventBestEffort(input: SoftwareEventInput): Promise<void> {
  try {
    await appendWithRetry(input);
  } catch (error: unknown) {
    logError(
      `Software event journal append failed (${input.eventType}) for establishment ${input.establishmentId}`,
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_JOURNAL'
    );
    if (isCriticalSoftwareEvent(input.eventType)) {
      throw (error instanceof Error ? error : new Error(String(error)));
    }
  }
}

async function getAllEstablishmentIds(): Promise<string[]> {
  const result = await pool.query('SELECT id FROM establishments');
  return result.rows
    .map((row) => row as { id?: string })
    .map((row) => row.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export async function logSoftwareEventForAllEstablishmentsFailSafe(
  eventType: SoftwareEventType,
  eventData: Record<string, unknown>,
  userId?: string
): Promise<void> {
  const establishmentIds = await getAllEstablishmentIds();
  const failures: Array<{ establishmentId: string; error: string }> = [];
  for (const establishmentId of establishmentIds) {
    try {
      await logSoftwareEventFailSafe({
        establishmentId,
        eventType,
        eventData,
        userId,
      });
    } catch (error) {
      failures.push({
        establishmentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Software event ${eventType} failed for ${failures.length}/${establishmentIds.length} establishments: ${JSON.stringify(
        failures
      )}`
    );
  }
}

export async function logSoftwareEventForAllEstablishmentsBestEffort(
  eventType: SoftwareEventType,
  eventData: Record<string, unknown>,
  userId?: string
): Promise<void> {
  try {
    if (isCriticalSoftwareEvent(eventType)) {
      await logSoftwareEventForAllEstablishmentsFailSafe(eventType, eventData, userId);
      return;
    }

    const establishmentIds = await getAllEstablishmentIds();
    for (const establishmentId of establishmentIds) {
      await logSoftwareEventBestEffort({ establishmentId, eventType, eventData, userId });
    }
  } catch (error: unknown) {
    logError(
      `Failed to enumerate establishments for software event ${eventType}`,
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_JOURNAL'
    );
    if (isCriticalSoftwareEvent(eventType)) {
      throw (error instanceof Error ? error : new Error(String(error)));
    }
  }
}
