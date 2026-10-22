import { ClosureBulletin, ClosureType } from './types';
import { JournalQueries } from './journalQueries';

/**
 * Annul a closed bulletin issued in error and optionally record which
 * corrective bulletin replaces it. The original is retained in full.
 */
export async function voidClosureBulletin(
  closureBulletinId: number,
  establishmentId: string,
  reason: string,
  voidedBy: string
): Promise<ClosureBulletin | null> {
  return await JournalQueries.voidClosureBulletin(
    closureBulletinId,
    establishmentId,
    reason,
    voidedBy
  );
}

export async function setSupersededBy(
  voidedBulletinId: number,
  supersedingBulletinId: number,
  establishmentId: string
): Promise<void> {
  return await JournalQueries.setSupersededBy(
    voidedBulletinId,
    supersedingBulletinId,
    establishmentId
  );
}

export async function closeOpenClosureBulletin(
  closureBulletinId: number,
  establishmentId: string
): Promise<ClosureBulletin | null> {
  return await JournalQueries.closeOpenClosureBulletin(closureBulletinId, establishmentId);
}

export async function deleteOpenClosureBulletin(
  closureBulletinId: number,
  establishmentId: string
): Promise<boolean> {
  return await JournalQueries.deleteOpenClosureBulletin(closureBulletinId, establishmentId);
}

/**
 * Get closure bulletins for one establishment (optionally filtered by type).
 */
export async function getClosureBulletins(
  establishmentId: string,
  type?: ClosureType
): Promise<ClosureBulletin[]> {
  return await JournalQueries.getClosureBulletins(establishmentId, type);
}

export async function getClosureBulletinsPaginated(
  establishmentId: string,
  type?: ClosureType,
  opts?: { limit?: number; offset?: number }
): Promise<{ bulletins: ClosureBulletin[]; total: number }> {
  return await JournalQueries.getClosureBulletinsPaginated(establishmentId, type, opts);
}
