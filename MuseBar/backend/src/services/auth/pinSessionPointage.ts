/**
 * Unify PIN badge open/close with time_entries (pointage).
 */

import { pool } from '../../db/pool';
import { TimeEntryModel } from '../../models/timeEntry';
import { Logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

export async function countOpenTicketsForWaiter(
  establishmentId: string,
  userId: number
): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM open_tickets
     WHERE establishment_id = $1
       AND status = 'open'
       AND (
         opened_by_user_id = $2
         OR last_served_by_user_id = $2
       )`,
    [establishmentId, userId]
  );
  return Number(result.rows[0]?.n ?? 0);
}

/** Clock-in when opening a PIN session; ignore if already on the clock. */
export async function clockInOnPinOpen(input: {
  establishmentId: string;
  userId: number;
  ip?: string | null;
}): Promise<void> {
  try {
    const open = await TimeEntryModel.getOpenEntry(input.establishmentId, input.userId);
    if (open) return;
    const anyOpen = await TimeEntryModel.getOpenEntryAnyEstablishment(input.userId);
    if (anyOpen) return;
    await TimeEntryModel.clockIn({
      establishmentId: input.establishmentId,
      userId: input.userId,
      ip: input.ip ?? null,
      source: 'self',
      note: 'pin_session_open',
    });
  } catch (error) {
    Logger.getInstance().error(
      'Failed to clock-in on PIN open',
      error as Error,
      'PIN_POINTAGE'
    );
  }
}

/**
 * Clock-out when closing a PIN session.
 * Blocks if the actor still has open floor tickets.
 */
export async function clockOutOnPinClose(input: {
  establishmentId: string;
  userId: number;
  ip?: string | null;
}): Promise<void> {
  const openCount = await countOpenTicketsForWaiter(input.establishmentId, input.userId);
  if (openCount > 0) {
    throw new AppError(
      `Impossible de fermer le badge : ${openCount} table(s) encore ouverte(s). Libérez ou transférez-les avant de pointer la sortie.`,
      409,
      'PIN_CLOSE_OPEN_TABLES',
      { open_ticket_count: openCount }
    );
  }

  try {
    await TimeEntryModel.clockOut({
      establishmentId: input.establishmentId,
      userId: input.userId,
      ip: input.ip ?? null,
    });
  } catch (error) {
    Logger.getInstance().error(
      'Failed to clock-out on PIN close',
      error as Error,
      'PIN_POINTAGE'
    );
  }
}
