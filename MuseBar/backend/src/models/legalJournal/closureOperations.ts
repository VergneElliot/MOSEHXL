/**
 * Closure Operations
 * Daily, weekly, monthly, and annual closure bulletin generation
 */

import { ClosureBulletin, VATBreakdown, ClosureType } from './types';
import { JournalQueries } from './journalQueries';
import { JournalSigning } from './journalSigning';
import { pool } from '../../app';
import { DEFAULT_APP_TIMEZONE } from '../../config/timezone';
import { getBusinessDayPeriod } from './businessDayPeriod';
import { computePaymentBreakdownFromOrders } from './paymentBreakdown';

function roundTo4(amount: number): number {
  return Math.round(amount * 10000) / 10000;
}

function isVat10Rate(rate: number): boolean {
  // 10%: rate 0.10 or 10; otherwise treat as 20%
  return rate <= 0.15 || (rate >= 9 && rate <= 11);
}

function vatFromTtc(ttc: number, rate: 0.1 | 0.2): number {
  // Reverse extraction from TTC. For exactness and to avoid float drift:
  // 10% => VAT = TTC / 11 ; 20% => VAT = TTC / 6
  const denom = rate === 0.1 ? 11 : 6;
  return roundTo4(ttc / denom);
}

export class ClosureOperations {
  /**
   * Create daily closure bulletin for one establishment (multi-tenant: only that establishment's orders).
   * @param date - The date to create closure for
   * @param establishmentId - UUID of the establishment (required for data isolation)
   * @param timezone - IANA timezone (e.g. Europe/Paris). Defaults to DEFAULT_APP_TIMEZONE.
   * @returns The created closure bulletin
   */
  static async createDailyClosure(
    date: Date,
    establishmentId: string,
    timezone: string = DEFAULT_APP_TIMEZONE,
    force = false,
    fondDeCaisse?: number
  ): Promise<ClosureBulletin> {
    // Business day period uses configurable timezone (Paris for France)
    const { start, end } = getBusinessDayPeriod(date, '02:00', timezone);

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

    // Generate closure hash
    const closureData = `DAILY|${date.toISOString().split('T')[0]}|${totalTransactions}|${computedTotalAmount}|${computedTotalVat}|${firstSequence}|${lastSequence}`;
    const closureHash = JournalSigning.generateClosureHash(closureData);

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
      firstSequence,
      lastSequence,
      closureHash,
      establishmentId
    );
  }

  /**
   * Create weekly closure bulletin for one establishment.
   */
  static async createWeeklyClosure(
    date: Date,
    establishmentId: string,
    force = false,
    fondDeCaisse?: number
  ): Promise<ClosureBulletin> {
    // Get the start of the week (Monday) and end of the week (Sunday)
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
    startOfWeek.setDate(startOfWeek.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return await this.createPeriodClosure('WEEKLY', startOfWeek, endOfWeek, date, establishmentId, force, fondDeCaisse);
  }

  /**
   * Create monthly closure bulletin for one establishment.
   */
  static async createMonthlyClosure(
    date: Date,
    establishmentId: string,
    force = false,
    fondDeCaisse?: number
  ): Promise<ClosureBulletin> {
    // Get the start and end of the month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    return await this.createPeriodClosure('MONTHLY', startOfMonth, endOfMonth, date, establishmentId, force, fondDeCaisse);
  }

  /**
   * Create annual closure bulletin for one establishment.
   */
  static async createAnnualClosure(
    date: Date,
    establishmentId: string,
    force = false,
    fondDeCaisse?: number
  ): Promise<ClosureBulletin> {
    // Get the start and end of the year
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const endOfYear = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);

    return await this.createPeriodClosure('ANNUAL', startOfYear, endOfYear, date, establishmentId, force, fondDeCaisse);
  }

  /**
   * Generic period closure creation for one establishment (multi-tenant).
   */
  private static async createPeriodClosure(
    closureType: ClosureType,
    startDate: Date,
    endDate: Date,
    referenceDate: Date,
    establishmentId: string,
    force = false,
    fondDeCaisse?: number
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
      firstSequence,
      lastSequence,
      closureHash,
      establishmentId
    );
  }

  /**
   * Get closure bulletins for one establishment (optionally filtered by type).
   */
  static async getClosureBulletins(
    establishmentId: string,
    type?: 'DAILY' | 'MONTHLY' | 'ANNUAL'
  ): Promise<ClosureBulletin[]> {
    return await JournalQueries.getClosureBulletins(establishmentId, type);
  }

  static async getClosureBulletinsPaginated(
    establishmentId: string,
    type?: 'DAILY' | 'MONTHLY' | 'ANNUAL',
    opts?: { limit?: number; offset?: number }
  ): Promise<{ bulletins: ClosureBulletin[]; total: number }> {
    return await JournalQueries.getClosureBulletinsPaginated(establishmentId, type, opts);
  }
}

/**
 * Build exact VAT breakdown from order_items (no rounding).
 * Used for closure bulletins so stored totals match sum of order tax amounts.
 * tax_rate in DB may be 0.10/0.20 (decimal) or 10/20 (percentage); we bucket by 10% vs 20%.
 */
async function getExactVatBreakdownFromOrderItems(
  pool: { query: (q: string, values?: unknown[]) => Promise<{ rows: unknown[] }> },
  orderIds: number[]
): Promise<VATBreakdown> {
  const vatBreakdown: VATBreakdown = {
    vat_10: { amount: 0, vat: 0, ttc: 0 },
    vat_20: { amount: 0, vat: 0, ttc: 0 }
  };
  if (orderIds.length === 0) return vatBreakdown;

  const itemsResult = await pool.query(
    'SELECT total_price, tax_rate FROM order_items WHERE order_id = ANY($1)',
    [orderIds]
  );
  const items = itemsResult.rows as Array<{ total_price: string | number; tax_rate: string | number }>;

  let ttc10 = 0;
  let ttc20 = 0;
  for (const item of items) {
    const totalPrice = parseFloat(String(item.total_price ?? 0));
    const rate = parseFloat(String(item.tax_rate ?? 0.2));
    if (isVat10Rate(rate)) {
      ttc10 += totalPrice;
    } else {
      ttc20 += totalPrice;
    }
  }

  // Compute VAT/HT from the bucket totals (audit-friendly, avoids per-line rounding drift)
  const vat10 = vatFromTtc(ttc10, 0.1);
  const vat20 = vatFromTtc(ttc20, 0.2);
  const ht10 = roundTo4(ttc10 - vat10);
  const ht20 = roundTo4(ttc20 - vat20);

  vatBreakdown.vat_10.ttc = roundTo4(ttc10);
  vatBreakdown.vat_10.vat = vat10;
  vatBreakdown.vat_10.amount = ht10;

  vatBreakdown.vat_20.ttc = roundTo4(ttc20);
  vatBreakdown.vat_20.vat = vat20;
  vatBreakdown.vat_20.amount = ht20;

  return vatBreakdown;
}

