import type { Pool, PoolClient } from 'pg';

import { getBusinessDayPeriod } from '../../models/legalJournal/businessDayPeriod';
import { ClosureScheduler } from '../../utils/closureScheduler';

export interface KitchenTicketDayNumberContext {
  establishmentId: string;
  orderId: number;
  referenceDate: Date;
}

function periodsMatch(left: Date | string | null | undefined, right: Date): boolean {
  if (left == null) return false;
  const leftDate = left instanceof Date ? left : new Date(left);
  return leftDate.getTime() === right.getTime();
}

async function resolveBusinessPeriodStart(
  establishmentId: string,
  referenceDate: Date
): Promise<Date> {
  const settings = await ClosureScheduler.getClosureSettings(establishmentId);
  const { start } = getBusinessDayPeriod(
    referenceDate,
    settings.daily_closure_time,
    settings.timezone
  );
  return start.toDate();
}

async function readExistingDayNumber(
  client: PoolClient,
  establishmentId: string,
  orderId: number,
  periodStart: Date
): Promise<number | null> {
  const result = await client.query<{
    kitchen_ticket_day_number: number | null;
    kitchen_ticket_day_period_start: Date | null;
  }>(
    `SELECT kitchen_ticket_day_number, kitchen_ticket_day_period_start
     FROM orders
     WHERE id = $1 AND establishment_id = $2
     FOR UPDATE`,
    [orderId, establishmentId]
  );
  const row = result.rows[0];
  if (row?.kitchen_ticket_day_number == null) return null;
  if (!periodsMatch(row.kitchen_ticket_day_period_start, periodStart)) return null;
  return row.kitchen_ticket_day_number;
}

/**
 * Assigns the next kitchen ticket number for the order's business day.
 * Only call when kitchen/bar tickets are dispatched for the order.
 * Reuses the existing number if the order was already numbered in the same period.
 */
export async function allocateKitchenTicketDayNumber(
  pool: Pool,
  input: KitchenTicketDayNumberContext
): Promise<number> {
  const periodStart = await resolveBusinessPeriodStart(input.establishmentId, input.referenceDate);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await readExistingDayNumber(
      client,
      input.establishmentId,
      input.orderId,
      periodStart
    );
    if (existing != null) {
      await client.query('COMMIT');
      return existing;
    }

    const sequenceResult = await client.query<{ last_number: number }>(
      `INSERT INTO kitchen_ticket_daily_sequences (establishment_id, business_period_start, last_number)
       VALUES ($1, $2, 1)
       ON CONFLICT (establishment_id, business_period_start)
       DO UPDATE SET
         last_number = kitchen_ticket_daily_sequences.last_number + 1,
         updated_at = CURRENT_TIMESTAMP
       RETURNING last_number`,
      [input.establishmentId, periodStart]
    );
    const dayNumber = sequenceResult.rows[0]?.last_number;
    if (dayNumber == null || !Number.isInteger(dayNumber) || dayNumber < 1) {
      throw new Error('Failed to allocate kitchen ticket day number');
    }

    await client.query(
      `UPDATE orders
       SET kitchen_ticket_day_number = $1,
           kitchen_ticket_day_period_start = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND establishment_id = $4`,
      [dayNumber, periodStart, input.orderId, input.establishmentId]
    );

    await client.query('COMMIT');
    return dayNumber;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getKitchenTicketDayNumberForOrder(
  pool: Pool,
  establishmentId: string,
  orderId: number
): Promise<number | null> {
  const result = await pool.query<{ kitchen_ticket_day_number: number | null }>(
    `SELECT kitchen_ticket_day_number
     FROM orders
     WHERE id = $1 AND establishment_id = $2`,
    [orderId, establishmentId]
  );
  const value = result.rows[0]?.kitchen_ticket_day_number;
  return value != null && Number.isInteger(value) && value > 0 ? value : null;
}
