/**
 * Closure Operations
 * Daily, weekly, monthly, and annual closure bulletin generation
 */

import moment from 'moment-timezone';
import { ClosureBulletin, VATBreakdown, PaymentBreakdown, ClosureType } from './types';
import { JournalQueries } from './journalQueries';
import { JournalSigning } from './journalSigning';
import { pool } from '../../app';
import { DEFAULT_APP_TIMEZONE } from '../../config/timezone';

export class ClosureOperations {
  /**
   * Create daily closure bulletin for one establishment (multi-tenant: only that establishment's orders).
   * @param date - The date to create closure for
   * @param establishmentId - UUID of the establishment (required for data isolation)
   * @param timezone - IANA timezone (e.g. Europe/Paris). Defaults to DEFAULT_APP_TIMEZONE.
   * @returns The created closure bulletin
   */
  static async createDailyClosure(date: Date, establishmentId: string, timezone: string = DEFAULT_APP_TIMEZONE): Promise<ClosureBulletin> {
    // Business day period uses configurable timezone (Paris for France)
    const { start, end } = getBusinessDayPeriod(date, '02:00', timezone);

    // Check if closure already exists for this establishment
    const exists = await JournalQueries.closureBulletinExists('DAILY', start.toDate(), end.toDate(), establishmentId);
    if (exists) {
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

    // Totals from orders (exact — no rounding; used for storage and hash)
    const totalTransactions = orders.length;
    let totalAmount = 0;
    let totalVat = 0;
    const paymentBreakdown: PaymentBreakdown = {};

    for (const order of orders) {
      const orderAmount = parseFloat(String(order.total_amount ?? 0));
      const orderVat = parseFloat(String(order.total_tax ?? order.taxAmount ?? 0));
      totalAmount += orderAmount;
      totalVat += orderVat;
      const paymentMethod = order.payment_method || 'cash';
      paymentBreakdown[paymentMethod] = (paymentBreakdown[paymentMethod] || 0) + orderAmount;
    }

    // VAT breakdown from order_items (exact sums for accounting; round only when displaying/printing)
    const vatBreakdown = await getExactVatBreakdownFromOrderItems(pool, orderIds);

    // Calculate tips and change totals
    const netTipsTotal = orders.reduce((sum, order) => sum + parseFloat(order.tips || '0'), 0);
    const netChangeTotal = orders.reduce((sum, order) => sum + parseFloat(order.change || '0'), 0);
    
    // Apply constraint requirement: use absolute values or set to 0 if negative
    const tipsTotal = Math.max(0, netTipsTotal);
    const changeTotal = Math.max(0, netChangeTotal);

    // Get legal journal entries for sequence calculation
    const entries = await JournalQueries.getEntriesForPeriod(start.toDate(), end.toDate());
    const firstSequence = entries.length > 0 ? Math.min(...entries.map((e: any) => e.sequence_number)) : 0;
    const lastSequence = entries.length > 0 ? Math.max(...entries.map((e: any) => e.sequence_number)) : 0;

    // Generate closure hash
    const closureData = `DAILY|${date.toISOString().split('T')[0]}|${totalTransactions}|${totalAmount}|${totalVat}|${firstSequence}|${lastSequence}`;
    const closureHash = JournalSigning.generateClosureHash(closureData);

    // Insert closure bulletin (scoped to this establishment)
    return await JournalQueries.insertClosureBulletin(
      'DAILY',
      start.toDate(),
      end.toDate(),
      totalTransactions,
      totalAmount,
      totalVat,
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
  static async createWeeklyClosure(date: Date, establishmentId: string): Promise<ClosureBulletin> {
    // Get the start of the week (Monday) and end of the week (Sunday)
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
    startOfWeek.setDate(startOfWeek.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return await this.createPeriodClosure('WEEKLY', startOfWeek, endOfWeek, date, establishmentId);
  }

  /**
   * Create monthly closure bulletin for one establishment.
   */
  static async createMonthlyClosure(date: Date, establishmentId: string): Promise<ClosureBulletin> {
    // Get the start and end of the month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    return await this.createPeriodClosure('MONTHLY', startOfMonth, endOfMonth, date, establishmentId);
  }

  /**
   * Create annual closure bulletin for one establishment.
   */
  static async createAnnualClosure(date: Date, establishmentId: string): Promise<ClosureBulletin> {
    // Get the start and end of the year
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const endOfYear = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);

    return await this.createPeriodClosure('ANNUAL', startOfYear, endOfYear, date, establishmentId);
  }

  /**
   * Generic period closure creation for one establishment (multi-tenant).
   */
  private static async createPeriodClosure(
    closureType: ClosureType,
    startDate: Date,
    endDate: Date,
    referenceDate: Date,
    establishmentId: string
  ): Promise<ClosureBulletin> {
    // Check if closure already exists for this establishment
    const exists = await JournalQueries.closureBulletinExists(closureType, startDate, endDate, establishmentId);
    if (exists) {
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

    // Calculate aggregated totals
    const totalTransactions = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
    const totalVat = orders.reduce((sum, order) => sum + parseFloat(order.total_tax || order.taxAmount || '0'), 0);

    const orderIds = orders.map((o: { id: number }) => o.id);
    const paymentBreakdown: PaymentBreakdown = {};
    for (const order of orders) {
      const paymentMethod = order.payment_method || 'cash';
      const orderAmount = parseFloat(String(order.total_amount ?? 0));
      paymentBreakdown[paymentMethod] = (paymentBreakdown[paymentMethod] || 0) + orderAmount;
    }

    // Exact VAT breakdown from order_items (no rounding for storage)
    const vatBreakdown = await getExactVatBreakdownFromOrderItems(pool, orderIds);

    // Calculate tips and change
    const tipsTotal = Math.max(0, orders.reduce((sum, order) => sum + parseFloat(order.tips || '0'), 0));
    const changeTotal = Math.max(0, orders.reduce((sum, order) => sum + parseFloat(order.change || '0'), 0));

    // Get journal sequence range
    const entries = await JournalQueries.getEntriesForPeriod(startDate, endDate);
    const firstSequence = entries.length > 0 ? Math.min(...entries.map(e => e.sequence_number)) : 0;
    const lastSequence = entries.length > 0 ? Math.max(...entries.map(e => e.sequence_number)) : 0;

    // Generate closure hash
    const closureData = `${closureType}|${startDate.toISOString()}|${endDate.toISOString()}|${totalTransactions}|${totalAmount}|${totalVat}|${firstSequence}|${lastSequence}`;
    const closureHash = JournalSigning.generateClosureHash(closureData);

    return await JournalQueries.insertClosureBulletin(
      closureType,
      startDate,
      endDate,
      totalTransactions,
      totalAmount,
      totalVat,
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
   * Get closure bulletins (optionally filtered by type and/or establishment).
   */
  static async getClosureBulletins(
    type?: 'DAILY' | 'MONTHLY' | 'ANNUAL',
    establishmentId?: string
  ): Promise<ClosureBulletin[]> {
    return await JournalQueries.getClosureBulletins(type, establishmentId);
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
    vat_10: { amount: 0, vat: 0 },
    vat_20: { amount: 0, vat: 0 }
  };
  if (orderIds.length === 0) return vatBreakdown;

  const itemsResult = await pool.query(
    'SELECT total_price, tax_amount, tax_rate FROM order_items WHERE order_id = ANY($1)',
    [orderIds]
  );
  const items = itemsResult.rows as Array<{ total_price: string | number; tax_amount: string | number; tax_rate: string | number }>;

  for (const item of items) {
    const totalPrice = parseFloat(String(item.total_price ?? 0));
    const taxAmount = parseFloat(String(item.tax_amount ?? 0));
    const rate = parseFloat(String(item.tax_rate ?? 0.2));
    // 10%: rate 0.10 or 10; otherwise treat as 20%
    const is10 = rate <= 0.15 || (rate >= 9 && rate <= 11);
    const amountHt = totalPrice - taxAmount;

    if (is10) {
      vatBreakdown.vat_10.amount += amountHt;
      vatBreakdown.vat_10.vat += taxAmount;
    } else {
      vatBreakdown.vat_20.amount += amountHt;
      vatBreakdown.vat_20.vat += taxAmount;
    }
  }
  return vatBreakdown;
}

/**
 * Utility to calculate business day period
 */
function getBusinessDayPeriod(date: Date, closureTime: string, timezone: string) {
  // date: the business day to close (e.g., 2025-07-11)
  // closureTime: e.g., '02:00'
  // timezone: e.g., 'Europe/Paris'
  const [hours, minutes] = closureTime.split(':').map(Number);
  // The period starts at the closure time of the given day
  const start = moment.tz(date, timezone).set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  // The period ends at closure time the next day, minus 1ms
  const end = start.clone().add(1, 'day').subtract(1, 'ms');
  
  return { start, end };
}

