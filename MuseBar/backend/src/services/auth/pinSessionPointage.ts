/**
 * Unify PIN badge open/close with time_entries (pointage).
 */

import { pool } from '../../db/pool';
import { TimeEntryModel } from '../../models/timeEntry';
import { Logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { abandonEmptyOpenTicketsForWaiter } from '../floor/openTicketEmptyCleanup';

/**
 * Open tickets with real order lines owned by this waiter (`last_served_by_user_id`).
 * Empty shells are ignored here — they are cancelled first on PIN close.
 */
export async function countOpenTicketsForWaiter(
  establishmentId: string,
  userId: number
): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM open_tickets ot
     WHERE ot.establishment_id = $1
       AND ot.status = 'open'
       AND ot.last_served_by_user_id = $2
       AND EXISTS (
         SELECT 1 FROM open_ticket_items oti
         WHERE oti.open_ticket_id = ot.id
           AND oti.establishment_id = ot.establishment_id
           AND oti.line_status IN ('draft', 'validated')
       )`,
    [establishmentId, userId]
  );
  return Number(result.rows[0]?.n ?? 0);
}

/** Table labels for owned tickets that still have draft/validated lines. */
export async function listOwnedActiveTableLabels(
  establishmentId: string,
  userId: number
): Promise<string[]> {
  const result = await pool.query(
    `SELECT COALESCE(dt.label, 'table #' || ot.dining_table_id::text) AS label
     FROM open_tickets ot
     LEFT JOIN dining_tables dt
       ON dt.id = ot.dining_table_id AND dt.establishment_id = ot.establishment_id
     WHERE ot.establishment_id = $1
       AND ot.status = 'open'
       AND ot.last_served_by_user_id = $2
       AND EXISTS (
         SELECT 1 FROM open_ticket_items oti
         WHERE oti.open_ticket_id = ot.id
           AND oti.establishment_id = ot.establishment_id
           AND oti.line_status IN ('draft', 'validated')
       )
     ORDER BY label ASC`,
    [establishmentId, userId]
  );
  return result.rows.map((row: { label: string }) => String(row.label));
}

/**
 * Reject PIN close when this waiter still owns open floor tickets with items.
 * Auto-cancels empty shells first (ghost tables invisible on the plan).
 */
export async function assertNoOwnedOpenTablesForPinClose(
  establishmentId: string,
  userId: number
): Promise<void> {
  await abandonEmptyOpenTicketsForWaiter(establishmentId, userId);
  const labels = await listOwnedActiveTableLabels(establishmentId, userId);
  if (labels.length === 0) return;

  const list = labels.join(', ');
  throw new AppError(
    `Impossible de fermer le badge : ${labels.length} table(s) encore assignée(s) à ce profil (${list}). Libérez ou transférez-les avant de pointer la sortie.`,
    409,
    'PIN_CLOSE_OPEN_TABLES',
    { open_ticket_count: labels.length, table_labels: labels }
  );
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
 * Clock-out when closing a PIN session on the venue network.
 * Always enforces no owned open tables; skips TimeEntry write when
 * `recordPointage` is false (remote close without counting hours).
 */
export async function clockOutOnPinClose(input: {
  establishmentId: string;
  userId: number;
  ip?: string | null;
  /** Default true. False = table check only (home / off-venue close). */
  recordPointage?: boolean;
}): Promise<void> {
  await assertNoOwnedOpenTablesForPinClose(input.establishmentId, input.userId);
  if (input.recordPointage === false) return;

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
