import crypto from 'crypto';
import { pool } from '../app';
import moment from 'moment-timezone';

export interface JournalEntry {
  id: number;
  sequence_number: number;
  transaction_type: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE';
  order_id?: number;
  amount: number;
  vat_amount: number;
  payment_method: string;
  transaction_data: any; // Complete transaction details
  previous_hash: string;
  current_hash: string;
  timestamp: Date;
  user_id?: string;
  register_id: string;
  created_at: Date;
}

export interface ClosureBulletin {
  id: number;
  closure_type: 'DAILY' | 'MONTHLY' | 'ANNUAL';
  period_start: Date;
  period_end: Date;
  total_transactions: number;
  total_amount: number;
  total_vat: number;
  vat_breakdown: any; // VAT by rate (10%, 20%)
  payment_methods_breakdown: any; // Totals by payment method
  tips_total?: number; // Total pourboires
  change_total?: number; // Total monnaie rendue
  first_sequence: number;
  last_sequence: number;
  closure_hash: string;
  is_closed: boolean;
  closed_at?: Date;
  created_at: Date;
}

export class LegalJournalModel {
  private static registerKey = 'MUSEBAR-REG-001'; // Unique register identifier

  // Generate cryptographic hash for transaction integrity
  private static generateHash(data: string, previousHash: string): string {
    const content = `${previousHash}|${data}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Get the last journal entry to maintain hash chain
  static async getLastEntry(): Promise<JournalEntry | null> {
    const query = `
      SELECT * FROM legal_journal 
      ORDER BY sequence_number DESC 
      LIMIT 1
    `;
    const result = await pool.query(query);
    return result.rows[0] || null;
  }

  // Add entry to the append-only legal journal
  static async addEntry(
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE',
    orderId: number | null,
    amount: number,
    vatAmount: number,
    paymentMethod: string,
    transactionData: any,
    userId?: string
  ): Promise<JournalEntry> {
    // Get last entry for hash chain
    const lastEntry = await this.getLastEntry();
    const sequenceNumber = (lastEntry?.sequence_number || 0) + 1;
    const previousHash = lastEntry?.current_hash || '0000000000000000000000000000000000000000000000000000000000000000';

    // Use single timestamp for both hash calculation and database storage
    const timestamp = new Date();
    const timestampISO = timestamp.toISOString();

    // Create data string for hashing - ensure numbers match database format
    const formattedAmount = amount.toFixed(2);
    const formattedVatAmount = vatAmount.toFixed(2);
    const dataString = `${sequenceNumber}|${transactionType}|${orderId}|${formattedAmount}|${formattedVatAmount}|${paymentMethod}|${timestampISO}|${this.registerKey}`;
    const currentHash = this.generateHash(dataString, previousHash);

    const query = `
      INSERT INTO legal_journal (
        sequence_number, transaction_type, order_id, amount, vat_amount, 
        payment_method, transaction_data, previous_hash, current_hash,
        timestamp, user_id, register_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      sequenceNumber,
      transactionType,
      orderId,
      amount,
      vatAmount,
      paymentMethod,
      JSON.stringify(transactionData),
      previousHash,
      currentHash,
      timestamp,
      userId,
      this.registerKey
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Verify journal integrity by checking hash chain
  static async verifyJournalIntegrity(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    const query = `
      SELECT * FROM legal_journal 
      ORDER BY sequence_number ASC
    `;
    const result = await pool.query(query);
    const entries = result.rows;

    if (entries.length === 0) {
      return { isValid: true, errors: [] };
    }

    let expectedPreviousHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Check sequence number continuity
      if (entry.sequence_number !== i + 1) {
        errors.push(`Sequence break at entry ${entry.sequence_number}: expected ${i + 1}`);
      }

      // Check previous hash
      if (entry.previous_hash !== expectedPreviousHash) {
        errors.push(`Hash chain broken at sequence ${entry.sequence_number}: expected previous hash ${expectedPreviousHash}, got ${entry.previous_hash}`);
      }

      // Verify current hash
      const dataString = `${entry.sequence_number}|${entry.transaction_type}|${entry.order_id}|${entry.amount}|${entry.vat_amount}|${entry.payment_method}|${entry.timestamp.toISOString()}|${entry.register_id}`;
      const expectedCurrentHash = this.generateHash(dataString, entry.previous_hash);
      
      if (entry.current_hash !== expectedCurrentHash) {
        errors.push(`Hash verification failed at sequence ${entry.sequence_number}: data may have been tampered with`);
      }

      expectedPreviousHash = entry.current_hash;
    }

    return { isValid: errors.length === 0, errors };
  }

  // Get journal entries for a specific period
  static async getEntriesForPeriod(startDate: Date, endDate: Date): Promise<JournalEntry[]> {
    const query = `
      SELECT * FROM legal_journal 
      WHERE timestamp >= $1 AND timestamp <= $2
      ORDER BY sequence_number ASC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  // Create daily closure bulletin
  static async createDailyClosure(date: Date, force = false): Promise<ClosureBulletin> {
    // Fetch closure settings
    const settingsResult = await pool.query('SELECT setting_key, setting_value FROM closure_settings');
    const settings: { [key: string]: string } = {};
    settingsResult.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    const closureTime = settings.daily_closure_time || '02:00';
    const timezone = settings.timezone || 'Europe/Paris';

    // Calculate business day period
    const { start, end } = getBusinessDayPeriod(date, closureTime, timezone);

    // Check for existing closure for this period and type
    const existingQuery = `SELECT * FROM closure_bulletins WHERE closure_type = 'DAILY' AND period_start::timestamp <= $2::timestamp AND period_end::timestamp >= $1::timestamp`;
    const existing = await pool.query(existingQuery, [start, end]);
    if (existing.rows.length > 0) {
      // Duplicate closure check - existing closures found
    }
    if (existing.rows.length > 0 && !force) {
      const debugInfo = existing.rows.map(row => `${row.period_start} to ${row.period_end}`).join('; ');
      throw new Error(`Closure bulletin already exists for this business day. Existing: ${debugInfo}. Use force=true to override.`);
    }

    // Get all orders for the period to calculate proper breakdowns
    const ordersResult = await pool.query(
      `SELECT * FROM orders WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at`,
      [start, end]
    );
    const orders = ordersResult.rows;

    // Populate items for each order (similar to orders API)
    const { OrderItemModel } = require('../models');
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItemModel.getByOrderId(order.id);
        return {
          ...order,
          items: Array.isArray(items) ? items : [] // Always set items as an array
        };
      })
    );

    // Separate regular sales from change operations
    const salesOrders = ordersWithItems.filter(order => order.items && order.items.length > 0);
    const changeOrders = ordersWithItems.filter(order => 
      (!order.items || order.items.length === 0) &&
      parseFloat(order.total_amount || '0') === 0 &&
      parseFloat(order.total_tax || '0') === 0 &&
      parseFloat(order.change || '0') > 0 &&
      order.notes && (order.notes.includes('Changement de caisse') || order.notes.includes('Faire de la Monnaie'))
    );

    // Calculate sales totals (excluding change operations)
    const totalTransactions = salesOrders.length;
    const totalAmount = salesOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
    const totalVat = salesOrders.reduce((sum, order) => sum + parseFloat(order.total_tax || '0'), 0);

    // VAT breakdown - calculate from item-level data for accuracy
    const vatBreakdown = {
      'vat_10': { amount: 0, vat: 0 },
      'vat_20': { amount: 0, vat: 0 }
    };

    // Payment methods breakdown - start with sales
    const paymentBreakdown: { [key: string]: number } = {
      'cash': 0,
      'card': 0
    };

    // Process sales orders with item-level VAT calculation
    for (const order of salesOrders) {
      const amount = parseFloat(order.total_amount || '0');
      const tips = parseFloat(order.tips || '0');
      const change = parseFloat(order.change || '0');

      // Debug logging for tips
      if (tips > 0) {
        console.log(`Processing tips for order ${order.id}: ${tips}€`);
        console.log(`Before tips - Card: ${paymentBreakdown.card}, Cash: ${paymentBreakdown.cash}`);
      }

      // Calculate VAT breakdown from items
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const itemTotal = parseFloat(item.total_price || '0');
          const itemVat = parseFloat(item.tax_amount || '0');
          const itemTaxRate = parseFloat(item.tax_rate || '0');
          
          // Group by tax rate (10% or 20%)
          if (Math.abs(itemTaxRate - 10) < 0.1) {
            vatBreakdown.vat_10.amount += itemTotal - itemVat; // Base HT
            vatBreakdown.vat_10.vat += itemVat;
          } else if (Math.abs(itemTaxRate - 20) < 0.1) {
            vatBreakdown.vat_20.amount += itemTotal - itemVat; // Base HT
            vatBreakdown.vat_20.vat += itemVat;
          }
        }
      }

      // Handle payment methods
      if (order.payment_method === 'split') {
        // For split payments, query the sub_bills table for accurate breakdown
        const subBillsResult = await pool.query(
          `SELECT payment_method, amount FROM sub_bills WHERE order_id = $1`,
          [order.id]
        );
        
        if (subBillsResult.rows.length > 0) {
          // Use sub_bills data if available
          subBillsResult.rows.forEach((subBill: any) => {
            const subAmount = parseFloat(subBill.amount || '0');
            paymentBreakdown[subBill.payment_method] += subAmount;
          });
        } else {
          // Fallback: if no sub_bills found, treat as card payment (most common for split)
          paymentBreakdown.card += amount;
        }
        
        // Only add tip ONCE for split payments
        if (tips > 0) {
          paymentBreakdown.card += tips;
          paymentBreakdown.cash -= tips;
          console.log(`After tips (split) - Card: ${paymentBreakdown.card}, Cash: ${paymentBreakdown.cash}`);
        }
      } else {
        paymentBreakdown[order.payment_method] += amount;
        // Handle tips: add to card (customer pays tip), subtract from cash (you give cash to staff)
        if (tips > 0) {
          paymentBreakdown.card += tips;
          paymentBreakdown.cash -= tips;
          console.log(`After tips (${order.payment_method}) - Card: ${paymentBreakdown.card}, Cash: ${paymentBreakdown.cash}`);
        }
      }

      // Handle change: affects the payment method breakdown
      if (change > 0) {
        if (order.payment_method === 'cash') {
          paymentBreakdown.cash -= change;
        } else if (order.payment_method === 'card') {
          paymentBreakdown.card -= change;
        }
      }
    }

    // Process change operations (affect payment breakdown but not sales totals)
    changeOrders.forEach(order => {
      const changeAmount = parseFloat(order.change || '0');
      if (order.payment_method === 'cash') {
        // Card → Cash: customer pays on card, you give cash back
        paymentBreakdown.card += changeAmount;
        paymentBreakdown.cash -= changeAmount;
      } else if (order.payment_method === 'card') {
        // Cash → Card: customer pays cash, you credit card
        paymentBreakdown.cash += changeAmount;
        paymentBreakdown.card -= changeAmount;
      }
    });

    // Round VAT breakdown to ensure totals match exactly
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
    const tipsTotal = orders.reduce((sum, order) => sum + parseFloat(order.tips || '0'), 0);
    const changeTotal = orders.reduce((sum, order) => sum + parseFloat(order.change || '0'), 0);

    // Get legal journal entries for sequence calculation
    const entries = await this.getEntriesForPeriod(start, end);
    const firstSequence = entries.length > 0 ? Math.min(...entries.map((e: any) => e.sequence_number)) : 0;
    const lastSequence = entries.length > 0 ? Math.max(...entries.map((e: any) => e.sequence_number)) : 0;

    // Generate closure hash
    const closureData = `DAILY|${date.toISOString().split('T')[0]}|${totalTransactions}|${totalAmount}|${totalVat}|${firstSequence}|${lastSequence}`;
    const closureHash = crypto.createHash('sha256').update(closureData).digest('hex');

    const query = `
      INSERT INTO closure_bulletins (
        closure_type, period_start, period_end, total_transactions, total_amount, 
        total_vat, vat_breakdown, payment_methods_breakdown, tips_total, change_total, first_sequence, 
        last_sequence, closure_hash, is_closed, closed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      'DAILY',
      start,
      end,
      totalTransactions,
      totalAmount,
      totalVat,
      JSON.stringify(vatBreakdown),
      JSON.stringify(paymentBreakdown),
      tipsTotal,
      changeTotal,
      firstSequence,
      lastSequence,
      closureHash,
      true,
      new Date()
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Create weekly closure bulletin
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

  // Create monthly closure bulletin
  static async createMonthlyClosure(date: Date): Promise<ClosureBulletin> {
    // Get the start and end of the month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    return await this.createPeriodClosure('MONTHLY', startOfMonth, endOfMonth, date);
  }

  // Create annual closure bulletin
  static async createAnnualClosure(date: Date): Promise<ClosureBulletin> {
    // Get the start and end of the year
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const endOfYear = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);

    return await this.createPeriodClosure('ANNUAL', startOfYear, endOfYear, date);
  }

  // Generic method to create period closures (weekly, monthly, annual)
  private static async createPeriodClosure(
    closureType: 'WEEKLY' | 'MONTHLY' | 'ANNUAL',
    startDate: Date,
    endDate: Date,
    referenceDate: Date
  ): Promise<ClosureBulletin> {
    // Get all orders for the period
    const ordersResult = await pool.query(
      `SELECT * FROM orders WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at`,
      [startDate, endDate]
    );
    const orders = ordersResult.rows;

    // Populate items for each order (similar to orders API)
    const { OrderItemModel } = require('../models');
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItemModel.getByOrderId(order.id);
        return {
          ...order,
          items
        };
      })
    );

    // Separate regular sales from change operations
    const salesOrders = ordersWithItems.filter(order => order.items && order.items.length > 0);
    const changeOrders = ordersWithItems.filter(order => 
      order.items && order.items.length === 0 && 
      order.total_amount === 0 && 
      order.total_tax === 0 && 
      order.change > 0 &&
      order.notes && (order.notes.includes('Changement de caisse') || order.notes.includes('Faire de la Monnaie'))
    );

    // Calculate sales totals (excluding change operations)
    const totalTransactions = salesOrders.length + changeOrders.length;
    const totalAmount = salesOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
    const totalVat = salesOrders.reduce((sum, order) => sum + parseFloat(order.total_tax || '0'), 0);

    // VAT breakdown - calculate from item-level data for accuracy
    const vatBreakdown = {
      'vat_10': { amount: 0, vat: 0 },
      'vat_20': { amount: 0, vat: 0 }
    };

    // Payment methods breakdown
    const paymentBreakdown: { [key: string]: number } = {
      'cash': 0,
      'card': 0
    };

    // Process sales orders with item-level VAT calculation
    for (const order of salesOrders) {
      const amount = parseFloat(order.total_amount || '0');
      const tips = parseFloat(order.tips || '0');
      const change = parseFloat(order.change || '0');

      // Debug logging for tips
      if (tips > 0) {
        console.log(`Processing tips for order ${order.id}: ${tips}€`);
        console.log(`Before tips - Card: ${paymentBreakdown.card}, Cash: ${paymentBreakdown.cash}`);
      }

      // Calculate VAT breakdown from items
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const itemTotal = parseFloat(item.total_price || '0');
          const itemVat = parseFloat(item.tax_amount || '0');
          const itemTaxRate = parseFloat(item.tax_rate || '0');
          
          // Group by tax rate (10% or 20%)
          if (Math.abs(itemTaxRate - 10) < 0.1) {
            vatBreakdown.vat_10.amount += itemTotal - itemVat; // Base HT
            vatBreakdown.vat_10.vat += itemVat;
          } else if (Math.abs(itemTaxRate - 20) < 0.1) {
            vatBreakdown.vat_20.amount += itemTotal - itemVat; // Base HT
            vatBreakdown.vat_20.vat += itemVat;
          }
        }
      }

      // Handle payment methods
      if (order.payment_method === 'split') {
        // For split payments, query the sub_bills table for accurate breakdown
        const subBillsResult = await pool.query(
          `SELECT payment_method, amount FROM sub_bills WHERE order_id = $1`,
          [order.id]
        );
        
        if (subBillsResult.rows.length > 0) {
          // Use sub_bills data if available
          subBillsResult.rows.forEach((subBill: any) => {
            const subAmount = parseFloat(subBill.amount || '0');
            paymentBreakdown[subBill.payment_method] += subAmount;
          });
        } else {
          // Fallback: if no sub_bills found, treat as card payment (most common for split)
          paymentBreakdown.card += amount;
        }
        
        // Handle tips for split payments: add to card (customer pays tip), subtract from cash (you give cash to staff)
        if (tips > 0) {
          paymentBreakdown.card += tips;
          paymentBreakdown.cash -= tips;
          console.log(`After tips (split) - Card: ${paymentBreakdown.card}, Cash: ${paymentBreakdown.cash}`);
        }
      } else {
        paymentBreakdown[order.payment_method] += amount;
        // Handle tips: add to card (customer pays tip), subtract from cash (you give cash to staff)
        if (tips > 0) {
          paymentBreakdown.card += tips;
          paymentBreakdown.cash -= tips;
          console.log(`After tips (${order.payment_method}) - Card: ${paymentBreakdown.card}, Cash: ${paymentBreakdown.cash}`);
        }
      }

      // Handle change: affects the payment method breakdown
      if (change > 0) {
        if (order.payment_method === 'cash') {
          paymentBreakdown.cash -= change;
        } else if (order.payment_method === 'card') {
          paymentBreakdown.card -= change;
        }
      }
    }

    // Round VAT breakdown to ensure totals match exactly
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

    // Process change operations (affect payment breakdown but not sales totals)
    changeOrders.forEach(order => {
      const changeAmount = parseFloat(order.change || '0');
      if (order.payment_method === 'cash') {
        // Cash → Card: subtract from cash, add to card
        paymentBreakdown.cash -= changeAmount;
        paymentBreakdown.card += changeAmount;
      } else if (order.payment_method === 'card') {
        // Card → Cash: subtract from card, add to cash
        paymentBreakdown.card -= changeAmount;
        paymentBreakdown.cash += changeAmount;
      }
    });

    // Calculate tips and change totals
    const tipsTotal = orders.reduce((sum, order) => sum + parseFloat(order.tips || '0'), 0);
    const changeTotal = orders.reduce((sum, order) => sum + parseFloat(order.change || '0'), 0);

    // Get legal journal entries for sequence calculation
    const entries = await this.getEntriesForPeriod(startDate, endDate);
    const firstSequence = entries.length > 0 ? Math.min(...entries.map((e: any) => e.sequence_number)) : 0;
    const lastSequence = entries.length > 0 ? Math.max(...entries.map((e: any) => e.sequence_number)) : 0;

    // Generate closure hash
    const periodIdentifier = closureType === 'WEEKLY' 
      ? `${referenceDate.getFullYear()}-W${Math.ceil((referenceDate.getTime() - new Date(referenceDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`
      : closureType === 'MONTHLY'
      ? `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`
      : `${referenceDate.getFullYear()}`;

    const closureData = `${closureType}|${periodIdentifier}|${totalTransactions}|${totalAmount}|${totalVat}|${firstSequence}|${lastSequence}`;
    const closureHash = crypto.createHash('sha256').update(closureData).digest('hex');

    const query = `
      INSERT INTO closure_bulletins (
        closure_type, period_start, period_end, total_transactions, total_amount, 
        total_vat, vat_breakdown, payment_methods_breakdown, tips_total, change_total, first_sequence, 
        last_sequence, closure_hash, is_closed, closed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      closureType,
      startDate,
      endDate,
      totalTransactions,
      totalAmount,
      totalVat,
      JSON.stringify(vatBreakdown),
      JSON.stringify(paymentBreakdown),
      tipsTotal,
      changeTotal,
      firstSequence,
      lastSequence,
      closureHash,
      true,
      new Date()
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get closure bulletins
  static async getClosureBulletins(type?: 'DAILY' | 'MONTHLY' | 'ANNUAL'): Promise<ClosureBulletin[]> {
    let query = 'SELECT * FROM closure_bulletins';
    const values: any[] = [];
    
    if (type) {
      query += ' WHERE closure_type = $1';
      values.push(type);
    }
    
    query += ' ORDER BY period_start DESC';
    
    const result = await pool.query(query, values);
    // Parse JSON fields and ensure tips_total/change_total are present
    return result.rows.map((row: any) => ({
      ...row,
      vat_breakdown: typeof row.vat_breakdown === 'string' ? JSON.parse(row.vat_breakdown) : row.vat_breakdown,
      payment_methods_breakdown: typeof row.payment_methods_breakdown === 'string' ? JSON.parse(row.payment_methods_breakdown) : row.payment_methods_breakdown,
      tips_total: row.tips_total || 0,
      change_total: row.change_total || 0
    }));
  }

  // Log transaction in legal journal (called after order creation)
  static async logTransaction(order: any, userId?: string): Promise<JournalEntry> {
    const amount = parseFloat(order.total_amount || order.finalAmount);
    const vatAmount = parseFloat(order.total_tax || order.taxAmount);
    
    return await this.addEntry(
      'SALE',
      order.id,
      amount,
      vatAmount,
      order.payment_method || 'cash',
      {
        order_id: order.id,
        items: order.items || [],
        timestamp: order.created_at || new Date(),
        register_id: this.registerKey
      },
      userId
    );
  }
} 

// Utility to calculate business day period
function getBusinessDayPeriod(date: Date, closureTime: string, timezone: string) {
  // date: the business day to close (e.g., 2025-07-11)
  // closureTime: e.g., '02:00'
  // timezone: e.g., 'Europe/Paris'
  const [hours, minutes] = closureTime.split(':').map(Number);
  // The period starts at the closure time of the given day
  const start = moment.tz(date, timezone).set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  // The period ends at closure time the next day, minus 1ms
  const end = start.clone().add(1, 'day').subtract(1, 'ms');
  return { start: start.toDate(), end: end.toDate() };
} 