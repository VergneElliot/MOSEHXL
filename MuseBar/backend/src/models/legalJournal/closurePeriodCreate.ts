import { ClosureBulletin, ClosureType } from './types';
import { JournalQueries } from './journalQueries';
import { JournalSigning } from './journalSigning';
import { pool } from '../../db/pool';
import moment from 'moment-timezone';
import { getBusinessPeriodBounds } from './businessDayPeriod';
import { computePaymentBreakdownFromOrders } from './paymentBreakdown';
import {
  computeReconciliation,
  getExactVatBreakdownFromOrderItems,
} from './closureOperationsMath';
import { getClosurePeriodSettings } from './closurePeriodSettings';

/**
 * Create weekly closure bulletin for one establishment.
 */
export async function createWeeklyClosure(
  date: Date,
  establishmentId: string,
  force = false,
  fondDeCaisse?: number,
  closeImmediately = true
): Promise<ClosureBulletin> {
  const { cutTime, tz } = await getClosurePeriodSettings(establishmentId);
  const monday = moment.tz(date, tz).startOf('isoWeek');
  const { start, end } = getBusinessPeriodBounds(
    monday,
    monday.clone().add(7, 'days'),
    cutTime,
    tz
  );

  return await createPeriodClosure(
    'WEEKLY',
    start.toDate(),
    end.toDate(),
    date,
    establishmentId,
    force,
    fondDeCaisse,
    closeImmediately
  );
}

/**
 * Create monthly closure bulletin for one establishment.
 */
export async function createMonthlyClosure(
  date: Date,
  establishmentId: string,
  force = false,
  fondDeCaisse?: number,
  closeImmediately = true
): Promise<ClosureBulletin> {
  const { cutTime, tz } = await getClosurePeriodSettings(establishmentId);
  const monthStart = moment.tz(date, tz).startOf('month');
  const { start, end } = getBusinessPeriodBounds(
    monthStart,
    monthStart.clone().add(1, 'month'),
    cutTime,
    tz
  );

  return await createPeriodClosure(
    'MONTHLY',
    start.toDate(),
    end.toDate(),
    date,
    establishmentId,
    force,
    fondDeCaisse,
    closeImmediately
  );
}

/**
 * Create annual closure bulletin for one establishment.
 */
export async function createAnnualClosure(
  date: Date,
  establishmentId: string,
  force = false,
  fondDeCaisse?: number,
  closeImmediately = true
): Promise<ClosureBulletin> {
  // Rolling year ending at the selected date, which is treated as the first day
  // *outside* the period: selecting 01/08/2026 yields 01/08/2025 → 01/08/2026 at
  // the cut time, i.e. exactly one year with no split night and no extra day.
  // Annual bulletins are intentionally not tied to the calendar year: fiscal
  // years can end on any date and venues may go live mid-year.
  const { cutTime, tz } = await getClosurePeriodSettings(establishmentId);
  const endExclusive = moment.tz(date, tz).startOf('day');
  const { start, end } = getBusinessPeriodBounds(
    endExclusive.clone().subtract(1, 'year'),
    endExclusive,
    cutTime,
    tz
  );

  return await createPeriodClosure(
    'ANNUAL',
    start.toDate(),
    end.toDate(),
    date,
    establishmentId,
    force,
    fondDeCaisse,
    closeImmediately
  );
}

/**
 * Generic period closure creation for one establishment (multi-tenant).
 */
async function createPeriodClosure(
  closureType: ClosureType,
  startDate: Date,
  endDate: Date,
  referenceDate: Date,
  establishmentId: string,
  force = false,
  fondDeCaisse?: number,
  closeImmediately = true
): Promise<ClosureBulletin> {
  // Check if closure already exists for this establishment
  const exists = await JournalQueries.closureBulletinExists(closureType, startDate, endDate, establishmentId);
  if (exists && !force) {
    throw new Error(`${closureType.toLowerCase()} closure bulletin already exists for this period`);
  }

  // Get orders for the period for this establishment only
  const ordersQuery = `
      SELECT * FROM orders 
      WHERE created_at >= $1 AND created_at <= $2 
      AND status IN ('completed', 'paid')
      AND establishment_id = $3
      ORDER BY created_at ASC
    `;
  const ordersResult = await pool.query(ordersQuery, [startDate, endDate, establishmentId]);
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
  const vatBreakdown = await getExactVatBreakdownFromOrderItems(pool, orderIds);
  const computedTotalAmount = vatBreakdown.vat_10.ttc + vatBreakdown.vat_20.ttc;
  const computedTotalVat = vatBreakdown.vat_10.vat + vatBreakdown.vat_20.vat;
  const tipsTotal = Math.max(0, orders.reduce((sum: number, order: { tips?: string | number }) => sum + parseFloat(String(order.tips || '0')), 0));
  const changeTotal = Math.max(0, orders.reduce((sum: number, order: { change?: string | number }) => sum + parseFloat(String(order.change || '0')), 0));

  // Get journal sequence range
  const entries = await JournalQueries.getEntriesForPeriod(establishmentId, startDate, endDate);
  const firstSequence = entries.length > 0 ? Math.min(...entries.map(e => e.sequence_number)) : 0;
  const lastSequence = entries.length > 0 ? Math.max(...entries.map(e => e.sequence_number)) : 0;
  const journalSaleSummary = await JournalQueries.getSaleSummaryForPeriod(
    establishmentId,
    startDate,
    endDate
  );
  const reconciliation = computeReconciliation(
    { transactions: totalTransactions, amount: computedTotalAmount, vat: computedTotalVat },
    journalSaleSummary
  );

  // Generate closure hash
  const closureData = `${closureType}|${startDate.toISOString()}|${endDate.toISOString()}|${totalTransactions}|${computedTotalAmount}|${computedTotalVat}|${firstSequence}|${lastSequence}`;
  const closureHash = JournalSigning.generateClosureHash(closureData);

  const lastFondDeCaisse = await JournalQueries.getLastFondDeCaisse(establishmentId);
  const fondDeCaisseToStore = Number.isFinite(fondDeCaisse as number) ? (fondDeCaisse as number) : (lastFondDeCaisse ?? 0);

  return await JournalQueries.insertClosureBulletin(
    closureType,
    startDate,
    endDate,
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
