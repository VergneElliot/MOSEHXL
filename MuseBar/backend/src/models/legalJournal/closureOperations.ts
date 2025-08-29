/**
 * Closure Operations
 * Daily, weekly, monthly, and annual closure bulletin generation
 */

import moment from 'moment-timezone';
import { ClosureBulletin, VATBreakdown, PaymentBreakdown, ClosureType } from './types';
import { JournalQueries } from './journalQueries';
import { JournalSigning } from './journalSigning';
import { pool } from '../../app';

export class ClosureOperations {
  /**
   * Create daily closure bulletin
   * @param date - The date to create closure for
   * @returns The created closure bulletin
   */
  static async createDailyClosure(date: Date): Promise<ClosureBulletin> {
    // Set timezone for French business operations
    const timezone = 'Europe/Paris';
    
    // Get business day period (from 02:00 current day to 01:59:59 next day)
    const { start, end } = getBusinessDayPeriod(date, '02:00', timezone);

    // Check if closure already exists
    const exists = await JournalQueries.closureBulletinExists('DAILY', start.toDate(), end.toDate());
    if (exists) {
      throw new Error('Daily closure bulletin already exists for this period');
    }

    // Get orders for the period
    const ordersQuery = `
      SELECT * FROM orders 
      WHERE created_at >= $1 AND created_at <= $2 
      AND status IN ('completed', 'paid')
      ORDER BY created_at ASC
    `;
    const ordersResult = await pool.query(ordersQuery, [start.toDate(), end.toDate()]);
    const orders = ordersResult.rows;

    // Calculate totals
    const totalTransactions = orders.length;
    let totalAmount = 0;
    let totalVat = 0;
    
    // VAT breakdown initialization
    const vatBreakdown: VATBreakdown = {
      vat_10: { amount: 0, vat: 0 },
      vat_20: { amount: 0, vat: 0 }
    };

    // Payment methods breakdown
    const paymentBreakdown: PaymentBreakdown = {};

    // Process each order
    for (const order of orders) {
      const orderAmount = parseFloat(order.total_amount || '0');
      const orderVat = parseFloat(order.total_tax || order.taxAmount || '0');
      const paymentMethod = order.payment_method || 'cash';

      totalAmount += orderAmount;
      totalVat += orderVat;

      // Update payment methods breakdown
      paymentBreakdown[paymentMethod] = (paymentBreakdown[paymentMethod] || 0) + orderAmount;

      // Calculate VAT breakdown based on items
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const itemAmount = parseFloat(item.price || '0') * parseInt(item.quantity || '1');
          const vatRate = parseFloat(item.vat_rate || '20');
          const itemVat = itemAmount * (vatRate / 100);

          if (vatRate === 10) {
            vatBreakdown.vat_10.amount += itemAmount;
            vatBreakdown.vat_10.vat += itemVat;
          } else {
            vatBreakdown.vat_20.amount += itemAmount;
            vatBreakdown.vat_20.vat += itemVat;
          }
        }
      } else {
        // If no items breakdown, assume 20% VAT
        vatBreakdown.vat_20.amount += orderAmount;
        vatBreakdown.vat_20.vat += orderVat;
      }
    }

    // Round VAT calculations to avoid floating point issues
    vatBreakdown.vat_10.amount = Math.round(vatBreakdown.vat_10.amount * 100) / 100;
    vatBreakdown.vat_10.vat = Math.round(vatBreakdown.vat_10.vat * 100) / 100;
    vatBreakdown.vat_20.amount = Math.round(vatBreakdown.vat_20.amount * 100) / 100;
    vatBreakdown.vat_20.vat = Math.round(vatBreakdown.vat_20.vat * 100) / 100;

    // Ensure VAT breakdown totals match the calculated total VAT
    const calculatedTotalVat = vatBreakdown.vat_10.vat + vatBreakdown.vat_20.vat;
    const difference = totalVat - calculatedTotalVat;
    
    // Distribute the rounding difference proportionally
    if (Math.abs(difference) > 0.01) {
      if (vatBreakdown.vat_20.vat > 0) {
        vatBreakdown.vat_20.vat = Math.round((vatBreakdown.vat_20.vat + difference) * 100) / 100;
      } else if (vatBreakdown.vat_10.vat > 0) {
        vatBreakdown.vat_10.vat = Math.round((vatBreakdown.vat_10.vat + difference) * 100) / 100;
      }
    }

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

    // Insert closure bulletin
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
      closureHash
    );
  }

  /**
   * Create weekly closure bulletin
   */
  static async createWeeklyClosure(date: Date): Promise<ClosureBulletin> {
    // Get the start of the week (Monday) and end of the week (Sunday)
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
    startOfWeek.setDate(startOfWeek.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return await this.createPeriodClosure('WEEKLY', startOfWeek, endOfWeek, date);
  }

  /**
   * Create monthly closure bulletin
   */
  static async createMonthlyClosure(date: Date): Promise<ClosureBulletin> {
    // Get the start and end of the month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    return await this.createPeriodClosure('MONTHLY', startOfMonth, endOfMonth, date);
  }

  /**
   * Create annual closure bulletin
   */
  static async createAnnualClosure(date: Date): Promise<ClosureBulletin> {
    // Get the start and end of the year
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const endOfYear = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);

    return await this.createPeriodClosure('ANNUAL', startOfYear, endOfYear, date);
  }

  /**
   * Generic period closure creation
   */
  private static async createPeriodClosure(
    closureType: ClosureType,
    startDate: Date,
    endDate: Date,
    referenceDate: Date
  ): Promise<ClosureBulletin> {
    // Check if closure already exists
    const exists = await JournalQueries.closureBulletinExists(closureType, startDate, endDate);
    if (exists) {
      throw new Error(`${closureType.toLowerCase()} closure bulletin already exists for this period`);
    }

    // Get orders for the period
    const ordersQuery = `
      SELECT * FROM orders 
      WHERE created_at >= $1 AND created_at <= $2 
      AND status IN ('completed', 'paid')
      ORDER BY created_at ASC
    `;
    const ordersResult = await pool.query(ordersQuery, [startDate, endDate]);
    const orders = ordersResult.rows;

    // Calculate aggregated totals
    const totalTransactions = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
    const totalVat = orders.reduce((sum, order) => sum + parseFloat(order.total_tax || order.taxAmount || '0'), 0);

    // Aggregate VAT breakdown
    const vatBreakdown: VATBreakdown = { vat_10: { amount: 0, vat: 0 }, vat_20: { amount: 0, vat: 0 } };
    const paymentBreakdown: PaymentBreakdown = {};

    // Process orders for breakdowns
    for (const order of orders) {
      const paymentMethod = order.payment_method || 'cash';
      const orderAmount = parseFloat(order.total_amount || '0');
      
      paymentBreakdown[paymentMethod] = (paymentBreakdown[paymentMethod] || 0) + orderAmount;
      
      // Simplified VAT breakdown (assume 20% unless specified)
      vatBreakdown.vat_20.amount += orderAmount;
      vatBreakdown.vat_20.vat += parseFloat(order.total_tax || order.taxAmount || '0');
    }

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
      closureHash
    );
  }

  /**
   * Get closure bulletins
   */
  static async getClosureBulletins(type?: 'DAILY' | 'MONTHLY' | 'ANNUAL'): Promise<ClosureBulletin[]> {
    return await JournalQueries.getClosureBulletins(type);
  }
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

