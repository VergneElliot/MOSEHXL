/**
 * Legal Journal Database Queries
 * Database operations for legal journal entries
 */

import { pool } from '../../app';
import { JournalEntry, ClosureBulletin } from './types';

export class JournalQueries {
  /**
   * Get the next sequence number for a new journal entry
   * @returns The next sequence number
   */
  static async getNextSequenceNumber(): Promise<number> {
    const query = 'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_sequence FROM legal_journal';
    const result = await pool.query(query);
    return result.rows[0].next_sequence;
  }

  /**
   * Get the last journal entry for hash chaining
   * @returns The last journal entry or null if none exists
   */
  static async getLastEntry(): Promise<JournalEntry | null> {
    const query = `
      SELECT * FROM legal_journal 
      ORDER BY sequence_number DESC 
      LIMIT 1
    `;
    const result = await pool.query(query);
    return result.rows[0] || null;
  }

  /**
   * Get journal entries for a specific period
   * @param start - Start date
   * @param end - End date
   * @returns Array of journal entries
   */
  static async getEntriesForPeriod(start: Date, end: Date): Promise<JournalEntry[]> {
    const query = `
      SELECT * FROM legal_journal 
      WHERE timestamp >= $1 AND timestamp <= $2 
      ORDER BY sequence_number ASC
    `;
    const result = await pool.query(query, [start, end]);
    return result.rows;
  }

  /**
   * Get all journal entries with pagination
   * @param limit - Number of entries to return
   * @param offset - Number of entries to skip
   * @returns Array of journal entries
   */
  static async getEntries(limit?: number, offset?: number): Promise<JournalEntry[]> {
    let query = 'SELECT * FROM legal_journal ORDER BY sequence_number DESC';
    const values: any[] = [];
    
    if (limit) {
      query += ` LIMIT $${values.length + 1}`;
      values.push(limit);
    }
    
    if (offset) {
      query += ` OFFSET $${values.length + 1}`;
      values.push(offset);
    }
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Get journal entries by transaction type
   * @param transactionType - The type of transaction
   * @param limit - Optional limit
   * @returns Array of journal entries
   */
  static async getEntriesByType(
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE',
    limit?: number
  ): Promise<JournalEntry[]> {
    let query = 'SELECT * FROM legal_journal WHERE transaction_type = $1 ORDER BY sequence_number DESC';
    const values: any[] = [transactionType];
    
    if (limit) {
      query += ` LIMIT $2`;
      values.push(limit);
    }
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Get journal entries for a specific order
   * @param orderId - The order ID
   * @returns Array of journal entries
   */
  static async getEntriesForOrder(orderId: number): Promise<JournalEntry[]> {
    const query = `
      SELECT * FROM legal_journal 
      WHERE order_id = $1 
      ORDER BY sequence_number ASC
    `;
    const result = await pool.query(query, [orderId]);
    return result.rows;
  }

  /**
   * Insert a new journal entry
   * @param entry - Journal entry data
   * @returns The created journal entry
   */
  static async insertEntry(
    sequenceNumber: number,
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE',
    orderId: number | null,
    amount: number,
    vatAmount: number,
    paymentMethod: string,
    transactionData: Record<string, unknown>,
    previousHash: string,
    currentHash: string,
    timestamp: Date,
    userId?: string,
    registerId?: string
  ): Promise<JournalEntry> {
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
      registerId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get closure bulletins
   * @param type - Optional closure type filter
   * @returns Array of closure bulletins
   */
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

  /**
   * Insert a closure bulletin
   * @param closureData - Closure bulletin data
   * @returns The created closure bulletin
   */
  static async insertClosureBulletin(
    closureType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL',
    startDate: Date,
    endDate: Date,
    totalTransactions: number,
    totalAmount: number,
    totalVat: number,
    vatBreakdown: Record<string, { amount: number; vat: number }>,
    paymentBreakdown: Record<string, number>,
    tipsTotal: number,
    changeTotal: number,
    firstSequence: number,
    lastSequence: number,
    closureHash: string
  ): Promise<ClosureBulletin> {
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

  /**
   * Check if a closure bulletin already exists for a period
   * @param type - Closure type
   * @param startDate - Period start date
   * @param endDate - Period end date
   * @returns True if bulletin exists
   */
  static async closureBulletinExists(
    type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL',
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const query = `
      SELECT id FROM closure_bulletins 
      WHERE closure_type = $1 AND period_start = $2 AND period_end = $3
    `;
    const result = await pool.query(query, [type, startDate, endDate]);
    return result.rows.length > 0;
  }
}

