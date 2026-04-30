import LegalJournalModel from '../../models/legalJournal';
import { Logger } from '../../utils/logger';

export type SoftwareEventType =
  | 'PRINTING_CONFIGURATION_UPDATED'
  | 'HAPPY_HOUR_SETTINGS_UPDATED';

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
