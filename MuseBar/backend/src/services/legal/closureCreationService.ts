import LegalJournalModel from '../../models/legalJournal';
import { StaffPinSessionModel } from '../../models/staffPinSession';
import { AppError } from '../../middleware/errorHandler';
import { Logger } from '../../utils/logger';

const logger = Logger.getInstance();

export type ClosureJournalPayload = {
  id?: number;
  closure_type?: string;
  total_amount?: number | string;
  total_vat?: number | string;
  period_start?: Date | string;
  period_end?: Date | string;
  closure_hash?: string;
  first_sequence?: number;
  last_sequence?: number;
  is_closed?: boolean;
};

export type ClosureType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';

async function appendClosureJournalEntry(
  establishmentId: string,
  closureType: ClosureType,
  closure: ClosureJournalPayload,
  forceCreate: boolean,
  userId?: string
) {
  const rawAmount =
    typeof closure.total_amount === 'number'
      ? closure.total_amount
      : parseFloat(String(closure.total_amount ?? 0));
  const rawVat =
    typeof closure.total_vat === 'number'
      ? closure.total_vat
      : parseFloat(String(closure.total_vat ?? 0));

  const totalAmount = Number.isFinite(rawAmount) ? rawAmount : 0;
  const totalVat = Number.isFinite(rawVat) ? rawVat : 0;

  return await LegalJournalModel.logClosure(
    establishmentId,
    closureType,
    totalAmount,
    totalVat,
    {
      closure_bulletin_id: closure.id ?? null,
      closure_type: closureType,
      period_start: closure.period_start ?? null,
      period_end: closure.period_end ?? null,
      closure_hash: closure.closure_hash ?? null,
      first_sequence: closure.first_sequence ?? null,
      last_sequence: closure.last_sequence ?? null,
      force: forceCreate,
    },
    userId
  );
}

/** The service day is over: no badge stays open across a daily closure. Never fails the closure. */
async function closeBadgesAfterDailyClosure(establishmentId: string): Promise<void> {
  try {
    const closed = await StaffPinSessionModel.closeAllForEstablishment(
      establishmentId,
      'daily_closure'
    );
    if (closed > 0) {
      logger.info(`Closed ${closed} PIN session(s) after daily closure`, { establishmentId });
    }
  } catch (error) {
    logger.error(
      'Failed to close PIN sessions after daily closure',
      error instanceof Error ? error : new Error(String(error)),
      'PIN_SESSION'
    );
  }
}

/**
 * Creates a closure bulletin whose journal entry is fail-closed: if the CLOSURE entry cannot be
 * appended, the open bulletin is rolled back and the request fails, so a bulletin can never
 * exist without its journal counterpart.
 */
export async function createClosureWithFailClosedJournal(
  establishmentId: string,
  closureType: ClosureType,
  forceCreate: boolean,
  userId: string | undefined,
  createOpenClosure: () => Promise<ClosureJournalPayload>,
  emailRecipients?: string[]
): Promise<ClosureJournalPayload> {
  const closure = await createOpenClosure();
  const closureId = Number(closure.id);
  if (!Number.isFinite(closureId)) {
    throw new AppError(
      'Failed to create closure bulletin',
      500,
      'LEGAL_CLOSURE_BULLETIN_CREATE_FAILED'
    );
  }

  try {
    await appendClosureJournalEntry(establishmentId, closureType, closure, forceCreate, userId);
  } catch (error) {
    logger.error(
      `Legal journal closure append failed (${closureType}) for bulletin ${String(closure.id ?? 'unknown')}`,
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_JOURNAL'
    );

    const rolledBack = await LegalJournalModel.deleteOpenClosureBulletin(
      closureId,
      establishmentId
    );
    if (!rolledBack) {
      logger.error(
        `Failed to rollback open closure bulletin ${closureId} after journal append failure`,
        new Error('Open closure bulletin rollback affected 0 rows'),
        'LEGAL_CLOSURE'
      );
    }

    throw new AppError(
      'Failed to persist legal journal entry for closure bulletin',
      500,
      'LEGAL_CLOSURE_JOURNAL_APPEND_FAILED'
    );
  }

  const finalized = await LegalJournalModel.closeOpenClosureBulletin(closureId, establishmentId);
  if (!finalized) {
    throw new AppError('Failed to finalize closure bulletin', 500, 'LEGAL_CLOSURE_FINALIZE_FAILED');
  }

  if (closureType === 'DAILY') {
    await closeBadgesAfterDailyClosure(establishmentId);
  }

  // Best-effort accounting email — must not fail fiscal create.
  void import('../documents/closureAutoEmail').then(({ maybeAutoEmailClosureBulletin }) =>
    maybeAutoEmailClosureBulletin({
      establishmentId,
      bulletinId: closureId,
      operatorId: userId,
      extraRecipients: emailRecipients,
    })
  );

  return finalized as unknown as ClosureJournalPayload;
}
