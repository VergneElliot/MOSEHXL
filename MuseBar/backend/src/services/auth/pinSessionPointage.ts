/**
 * Unify PIN badge open/close with time_entries (pointage).
 */

import { pool } from '../../db/pool';
import { StaffPinSessionModel } from '../../models/staffPinSession';
import { TimeEntryModel } from '../../models/timeEntry';
import { Logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { abandonEmptyOpenTicketsForWaiter } from '../floor/openTicketEmptyCleanup';

export type PointageCloseReason =
  | 'ok'
  | 'off_network'
  | 'no_open_entry'
  | 'error'
  | 'blocked_tables';

export interface PointageCloseResult {
  recorded: boolean;
  reason: PointageCloseReason;
  time_entry_id?: number;
  clock_out_at?: string;
  client_ip: string | null;
  on_venue: boolean;
}

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
 * Owned tables with items (for portal / header chips).
 * Returns dining_table_id + label for tickets that still have draft/validated lines.
 */
export async function listOwnedActiveTables(
  establishmentId: string,
  userId: number
): Promise<Array<{ dining_table_id: number; label: string; open_ticket_id: number }>> {
  const result = await pool.query(
    `SELECT ot.id AS open_ticket_id,
            ot.dining_table_id,
            COALESCE(dt.label, 'table #' || ot.dining_table_id::text) AS label
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
  return result.rows.map(
    (row: { open_ticket_id: number; dining_table_id: number; label: string }) => ({
      open_ticket_id: Number(row.open_ticket_id),
      dining_table_id: Number(row.dining_table_id),
      label: String(row.label),
    })
  );
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
 * Returns an explicit outcome so the client never lies about hours.
 */
export async function clockOutOnPinClose(input: {
  establishmentId: string;
  userId: number;
  ip?: string | null;
  /** Default true. False = table check only (home / off-venue close). */
  recordPointage?: boolean;
}): Promise<PointageCloseResult> {
  const clientIp = input.ip ?? null;
  const onVenue = input.recordPointage !== false;

  await assertNoOwnedOpenTablesForPinClose(input.establishmentId, input.userId);

  if (!onVenue) {
    return {
      recorded: false,
      reason: 'off_network',
      client_ip: clientIp,
      on_venue: false,
    };
  }

  try {
    const entry = await TimeEntryModel.clockOut({
      establishmentId: input.establishmentId,
      userId: input.userId,
      ip: clientIp,
    });
    if (!entry) {
      return {
        recorded: false,
        reason: 'no_open_entry',
        client_ip: clientIp,
        on_venue: true,
      };
    }
    return {
      recorded: true,
      reason: 'ok',
      time_entry_id: entry.id,
      clock_out_at: entry.clock_out_at ?? undefined,
      client_ip: clientIp,
      on_venue: true,
    };
  } catch (error) {
    Logger.getInstance().error(
      'Failed to clock-out on PIN close',
      error as Error,
      'PIN_POINTAGE'
    );
    return {
      recorded: false,
      reason: 'error',
      client_ip: clientIp,
      on_venue: true,
    };
  }
}

/**
 * Clock out open shifts for badges that just expired (no client IP).
 * Labor honesty: do not leave forever-open time_entries after TTL.
 */
export async function clockOutUsersAfterBadgeExpiry(
  establishmentId: string,
  userIds: number[]
): Promise<void> {
  const unique = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0))];
  for (const userId of unique) {
    try {
      // Skip if they still have another active badge (race with reopen).
      const stillOpen = await StaffPinSessionModel.findActiveForUser(
        establishmentId,
        userId
      );
      if (stillOpen) continue;
      await TimeEntryModel.clockOut({
        establishmentId,
        userId,
        ip: null,
      });
    } catch (error) {
      Logger.getInstance().error(
        'Failed to clock-out after PIN badge expiry',
        error as Error,
        'PIN_POINTAGE'
      );
    }
  }
}
