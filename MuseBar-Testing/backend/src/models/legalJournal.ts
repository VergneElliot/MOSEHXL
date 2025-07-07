import { Pool } from 'pg';
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

    // Create data string for hashing
    const dataString = `${sequenceNumber}|${transactionType}|${orderId}|${amount}|${vatAmount}|${paymentMethod}|${new Date().toISOString()}|${this.registerKey}`;
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
      new Date(),
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

    const entries = await this.getEntriesForPeriod(startOfDay, endOfDay);
    const salesEntries = entries.filter(e => e.transaction_type === 'SALE');

    // Calculate totals and breakdowns
    const totalTransactions = salesEntries.length;
    const totalAmount = salesEntries.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
    const totalVat = salesEntries.reduce((sum, e) => sum + parseFloat(e.vat_amount.toString()), 0);

    // VAT breakdown (French rates: 10% and 20%)
    const vatBreakdown = {
      'vat_10': { amount: 0, vat: 0 },
      'vat_20': { amount: 0, vat: 0 }
    };

    // Payment methods breakdown
    const paymentBreakdown: { [key: string]: number } = {};

    salesEntries.forEach(entry => {
      // Payment method totals
      paymentBreakdown[entry.payment_method] = (paymentBreakdown[entry.payment_method] || 0) + parseFloat(entry.amount.toString());
      
      // VAT breakdown (simplified - would need item-level data for accuracy)
      const vatRate = parseFloat(entry.vat_amount.toString()) / parseFloat(entry.amount.toString());
      if (Math.abs(vatRate - 0.083) < 0.01) { // ~10% VAT (10/110)
        vatBreakdown.vat_10.amount += parseFloat(entry.amount.toString());
        vatBreakdown.vat_10.vat += parseFloat(entry.vat_amount.toString());
      } else if (Math.abs(vatRate - 0.167) < 0.01) { // ~20% VAT (20/120)
        vatBreakdown.vat_20.amount += parseFloat(entry.amount.toString());
        vatBreakdown.vat_20.vat += parseFloat(entry.vat_amount.toString());
      }
    });

    const firstSequence = entries.length > 0 ? Math.min(...entries.map(e => e.sequence_number)) : 0;
    const lastSequence = entries.length > 0 ? Math.max(...entries.map(e => e.sequence_number)) : 0;

    // Generate closure hash
    const closureData = `DAILY|${date.toISOString().split('T')[0]}|${totalTransactions}|${totalAmount}|${totalVat}|${firstSequence}|${lastSequence}`;
    const closureHash = crypto.createHash('sha256').update(closureData).digest('hex');

    const query = `
      INSERT INTO closure_bulletins (
        closure_type, period_start, period_end, total_transactions, total_amount, 
        total_vat, vat_breakdown, payment_methods_breakdown, first_sequence, 
        last_sequence, closure_hash, is_closed, closed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
    return result.rows;
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