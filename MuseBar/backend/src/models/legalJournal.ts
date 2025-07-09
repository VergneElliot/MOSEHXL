import crypto from 'crypto';
import { pool } from '../app';

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
  static async createDailyClosure(date: Date): Promise<ClosureBulletin> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all orders for the period to calculate proper breakdowns
    const ordersResult = await pool.query(
      `SELECT * FROM orders WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at`,
      [startOfDay, endOfDay]
    );
    const orders = ordersResult.rows;

    // Separate regular sales from change operations
    const salesOrders = orders.filter(order => order.items && order.items.length > 0);
    const changeOrders = orders.filter(order => 
      order.items && order.items.length === 0 && 
      order.total_amount === 0 && 
      order.total_tax === 0 && 
      order.change > 0 &&
      order.notes && order.notes.includes('Changement de caisse')
    );

    // Calculate sales totals (excluding change operations)
    const totalTransactions = salesOrders.length;
    const totalAmount = salesOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
    const totalVat = salesOrders.reduce((sum, order) => sum + parseFloat(order.total_tax || '0'), 0);

    // VAT breakdown (French rates: 10% and 20%)
    const vatBreakdown = {
      'vat_10': { amount: 0, vat: 0 },
      'vat_20': { amount: 0, vat: 0 }
    };

    // Payment methods breakdown - start with sales
    const paymentBreakdown: { [key: string]: number } = {
      'cash': 0,
      'card': 0
    };

    // Process sales orders
    for (const order of salesOrders) {
      const amount = parseFloat(order.total_amount || '0');
      const vatAmount = parseFloat(order.total_tax || '0');
      const tips = parseFloat(order.tips || '0');
      const change = parseFloat(order.change || '0');

      if (order.payment_method === 'split') {
        // For split payments, query the sub_bills table for accurate breakdown
        const subBillsResult = await pool.query(
          `SELECT payment_method, amount FROM sub_bills WHERE order_id = $1`,
          [order.id]
        );
        subBillsResult.rows.forEach((subBill: any) => {
          const subAmount = parseFloat(subBill.amount || '0');
          paymentBreakdown[subBill.payment_method] += subAmount;
        });
      } else {
        paymentBreakdown[order.payment_method] += amount;
      }

      // Handle tips: subtract from cash, add to card
      if (tips > 0) {
        paymentBreakdown.cash -= tips;
        paymentBreakdown.card += tips;
      }

      // Handle change: affects the payment method breakdown
      if (change > 0) {
        if (order.payment_method === 'cash') {
          paymentBreakdown.cash -= change;
        } else if (order.payment_method === 'card') {
          paymentBreakdown.card -= change;
        }
      }

      // VAT breakdown (simplified - would need item-level data for accuracy)
      if (amount > 0) {
        const vatRate = vatAmount / amount;
        if (Math.abs(vatRate - 0.083) < 0.01) { // ~10% VAT (10/110)
          vatBreakdown.vat_10.amount += amount;
          vatBreakdown.vat_10.vat += vatAmount;
        } else if (Math.abs(vatRate - 0.167) < 0.01) { // ~20% VAT (20/120)
          vatBreakdown.vat_20.amount += amount;
          vatBreakdown.vat_20.vat += vatAmount;
        }
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
    const entries = await this.getEntriesForPeriod(startOfDay, endOfDay);
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
      startOfDay,
      endOfDay,
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