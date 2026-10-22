import { ClosureBulletin } from './types';
import { JournalQueries } from './journalQueries';
import { JournalSigning } from './journalSigning';
import { pool } from '../../db/pool';
import { DEFAULT_APP_TIMEZONE } from '../../config/timezone';
import moment from 'moment-timezone';
import {
  getBusinessDayDateKey,
  getCurrentBusinessDayPeriod,
  resolveDailyClosurePeriod,
  type DailyClosureMode,
} from './businessDayPeriod';
import { computePaymentBreakdownFromOrders } from './paymentBreakdown';
import { ClosureSettingsModel } from '../closureSettings';
import {
  computeReconciliation,
  getExactVatBreakdownFromOrderItems,
} from './closureOperationsMath';
import { getClosurePeriodSettings } from './closurePeriodSettings';

/**
 * Create daily closure bulletin for one establishment (multi-tenant: only that establishment's orders).
 * Period uses establishment closure settings (daily_closure_time + timezone):
 * - business_day (default): cut→next cut for `date`, clamped after last closed DAILY
 * - close_now: last closed DAILY end → now
 */
export async function createDailyClosure(
  date: Date,
  establishmentId: string,
  timezone?: string,
  force = false,
  fondDeCaisse?: number,
  closeImmediately = true,
  mode: DailyClosureMode = 'business_day'
): Promise<ClosureBulletin> {
  const settings = await ClosureSettingsModel.getClosureSettings(establishmentId);
  const tz = timezone || settings.timezone || DEFAULT_APP_TIMEZONE;
  const cutTime = settings.daily_closure_time || '02:00';
  const lastClosedPeriodEnd = await JournalQueries.getLastClosedDailyPeriodEnd(establishmentId);

  const { start, end } = resolveDailyClosurePeriod({
    mode,
    date,
    closureTime: cutTime,
    timezone: tz,
    lastClosedPeriodEnd,
    force,
  });

  // Check if closure already exists for this establishment
  const exists = await JournalQueries.closureBulletinExists('DAILY', start.toDate(), end.toDate(), establishmentId);
  if (exists && !force) {
    throw new Error('Daily closure bulletin already exists for this period');
  }

  // Get orders for the period for this establishment only (multi-tenant)
  const ordersQuery = `
      SELECT * FROM orders 
      WHERE created_at >= $1 AND created_at <= $2 
      AND status IN ('completed', 'paid')
      AND establishment_id = $3
      ORDER BY created_at ASC
    `;
  const ordersResult = await pool.query(ordersQuery, [start.toDate(), end.toDate(), establishmentId]);
  const orders = ordersResult.rows;
  const orderIds = orders.map((o: { id: number }) => o.id);

  const splitOrderIds = orders.filter((o: { payment_method: string }) => o.payment_method === 'split').map((o: { id: number }) => o.id);
  let subBills: Array<{ order_id: number; payment_method: string; amount: string | number }> = [];
  if (splitOrderIds.length > 0) {
    const subBillsResult = await pool.query(
      'SELECT order_id, payment_method, amount FROM sub_bills WHERE order_id = ANY($1)',
      [splitOrderIds]
    );
    subBills = subBillsResult.rows;
  }

  const { paymentBreakdown } = computePaymentBreakdownFromOrders(orders, subBills);
  const totalTransactions = orders.length;

  // An empty daily bulletin is almost always the wrong day rather than a real
  // day off, and once closed it blankets that period. Make the operator confirm.
  if (totalTransactions === 0 && !force) {
    throw new Error(
      `Aucune vente entre le ${start.format('DD/MM/YYYY HH:mm')} et le ` +
        `${end.format('DD/MM/YYYY HH:mm')}. Vérifiez la date : après l’heure de coupure ` +
        `(${cutTime}), la nuit qui vient de s’achever porte la date de la veille. ` +
        'Cochez « Forcer la création » s’il s’agit réellement d’une journée sans vente.'
    );
  }

  const vatBreakdown = await getExactVatBreakdownFromOrderItems(pool, orderIds);
  const computedTotalAmount = vatBreakdown.vat_10.ttc + vatBreakdown.vat_20.ttc;
  const computedTotalVat = vatBreakdown.vat_10.vat + vatBreakdown.vat_20.vat;

  const netTipsTotal = orders.reduce((sum: number, order: { tips?: string | number }) => sum + parseFloat(String(order.tips || '0')), 0);
  const netChangeTotal = orders.reduce((sum: number, order: { change?: string | number }) => sum + parseFloat(String(order.change || '0')), 0);
  const tipsTotal = Math.max(0, netTipsTotal);
  const changeTotal = Math.max(0, netChangeTotal);

  // Get legal journal entries for sequence calculation
  const entries = await JournalQueries.getEntriesForPeriod(establishmentId, start.toDate(), end.toDate());
  const firstSequence = entries.length > 0 ? Math.min(...entries.map((e) => e.sequence_number)) : 0;
  const lastSequence = entries.length > 0 ? Math.max(...entries.map((e) => e.sequence_number)) : 0;
  const journalSaleSummary = await JournalQueries.getSaleSummaryForPeriod(
    establishmentId,
    start.toDate(),
    end.toDate()
  );
  const reconciliation = computeReconciliation(
    { transactions: totalTransactions, amount: computedTotalAmount, vat: computedTotalVat },
    journalSaleSummary
  );

  // Generate closure hash
  const closureData = `DAILY|${date.toISOString().split('T')[0]}|${totalTransactions}|${computedTotalAmount}|${computedTotalVat}|${firstSequence}|${lastSequence}`;
  const closureHash = JournalSigning.generateClosureHash(closureData);

  if (!force) {
    const sameDay = await JournalQueries.findClosedDailyBulletinsForBusinessDay(
      establishmentId,
      start.toDate(),
      tz
    );
    for (const existing of sameDay) {
      if (existing.closure_hash === closureHash) {
        throw new Error('Daily closure bulletin already exists for this period');
      }
      if (existing.total_amount >= computedTotalAmount) {
        throw new Error(
          'Daily closure bulletin already exists with equal or higher amount for this day'
        );
      }
    }
  }

  const lastFondDeCaisse = await JournalQueries.getLastFondDeCaisse(establishmentId);
  const fondDeCaisseToStore = Number.isFinite(fondDeCaisse as number) ? (fondDeCaisse as number) : (lastFondDeCaisse ?? 0);

  // Insert closure bulletin (scoped to this establishment)
  return await JournalQueries.insertClosureBulletin(
    'DAILY',
    start.toDate(),
    end.toDate(),
    totalTransactions,
    fondDeCaisseToStore,
    computedTotalAmount,
    computedTotalVat,
    vatBreakdown,
    paymentBreakdown,
    tipsTotal,
    changeTotal,
    journalSaleSummary.count,
    journalSaleSummary.amount,
    journalSaleSummary.vat,
    reconciliation.ok,
    reconciliation.details,
    firstSequence,
    lastSequence,
    closureHash,
    establishmentId,
    closeImmediately
  );
}

/**
 * Suggest the YYYY-MM-DD to prefill for business_day mode:
 * the business day of the first uncovered paid sale after the last closed DAILY,
 * else the previous completed business day (not the in-progress one).
 */
export async function suggestBusinessDayDate(establishmentId: string): Promise<{
  date: string;
  closure_time: string;
  timezone: string;
  reason: 'unclosed_sales' | 'previous_business_day';
}> {
  const { cutTime, tz } = await getClosurePeriodSettings(establishmentId);
  const lastClosedPeriodEnd = await JournalQueries.getLastClosedDailyPeriodEnd(establishmentId);
  const now = new Date();
  const searchStart = lastClosedPeriodEnd
    ? new Date(lastClosedPeriodEnd.getTime() + 1)
    : moment.tz(now, tz).subtract(90, 'days').toDate();

  const firstSale = await pool.query(
    `
        SELECT MIN(created_at) AS first_at
        FROM orders
        WHERE establishment_id = $1
          AND status IN ('completed', 'paid')
          AND created_at >= $2
          AND created_at <= $3
      `,
    [establishmentId, searchStart, now]
  );
  const firstAt = firstSale.rows[0]?.first_at as Date | string | undefined;
  if (firstAt) {
    const instant = firstAt instanceof Date ? firstAt : new Date(firstAt);
    return {
      date: getBusinessDayDateKey(instant, cutTime, tz),
      closure_time: cutTime,
      timezone: tz,
      reason: 'unclosed_sales',
    };
  }

  const current = getCurrentBusinessDayPeriod(cutTime, tz);
  const previousStart = current.start.clone().subtract(1, 'day');
  return {
    date: previousStart.format('YYYY-MM-DD'),
    closure_time: cutTime,
    timezone: tz,
    reason: 'previous_business_day',
  };
}

/**
 * Resolve what a daily closure would cover, without writing anything.
 * Lets the POS show the exact period and totals before the operator commits,
 * which is what makes a wrong-day closure impossible to miss.
 */
export async function previewDailyClosure(
  date: Date,
  establishmentId: string,
  mode: DailyClosureMode = 'business_day',
  force = false
): Promise<{
  period_start: string;
  period_end: string;
  total_transactions: number;
  total_amount: number;
  closure_time: string;
  timezone: string;
}> {
  const settings = await ClosureSettingsModel.getClosureSettings(establishmentId);
  const tz = settings.timezone || DEFAULT_APP_TIMEZONE;
  const cutTime = settings.daily_closure_time || '02:00';
  const lastClosedPeriodEnd = await JournalQueries.getLastClosedDailyPeriodEnd(establishmentId);

  const { start, end } = resolveDailyClosurePeriod({
    mode,
    date,
    closureTime: cutTime,
    timezone: tz,
    lastClosedPeriodEnd,
    force,
  });

  const result = await pool.query(
    `
        SELECT COUNT(*)::int AS n, COALESCE(SUM(total_amount), 0) AS total
        FROM orders
        WHERE created_at >= $1 AND created_at <= $2
          AND status IN ('completed', 'paid')
          AND establishment_id = $3
      `,
    [start.toDate(), end.toDate(), establishmentId]
  );
  const row = result.rows[0] as { n?: number; total?: string | number } | undefined;

  return {
    period_start: start.toISOString(),
    period_end: end.toISOString(),
    total_transactions: Number(row?.n ?? 0),
    total_amount: parseFloat(String(row?.total ?? 0)) || 0,
    closure_time: cutTime,
    timezone: tz,
  };
}
