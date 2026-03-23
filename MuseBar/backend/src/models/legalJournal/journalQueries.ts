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
   * Entries retrieval with a total count for pagination UI.
   * Mirrors the logic previously implemented directly in routes/legal/journal.ts.
   */
  static async getEntriesWithCountForPeriod(params: {
    start_date?: string;
    end_date?: string;
    limit: number;
    offset: number;
  }): Promise<{
    entries: JournalEntry[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { start_date, end_date, limit, offset } = params;

    let query = 'SELECT * FROM legal_journal ORDER BY sequence_number DESC';
    const values: Array<string | number> = [];

    if (start_date && end_date) {
      query = `
        SELECT * FROM legal_journal
        WHERE timestamp >= $1 AND timestamp <= $2
        ORDER BY sequence_number DESC
      `;
      values.push(start_date, end_date);
    }

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    const countQuery =
      start_date && end_date
        ? 'SELECT COUNT(*) FROM legal_journal WHERE timestamp >= $1 AND timestamp <= $2'
        : 'SELECT COUNT(*) FROM legal_journal';

    const countValues = start_date && end_date ? [start_date, end_date] : [];
    const countResult = await pool.query(countQuery, countValues);

    return {
      entries: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    };
  }

  /**
   * Summary stats for the legal journal.
   * Mirrors the SQL previously implemented directly in routes/legal/journal.ts.
   */
  static async getJournalStatsSummary(): Promise<Record<string, unknown>> {
    const statsQuery = `
      SELECT
        COUNT(*) as total_entries,
        MIN(sequence_number) as first_sequence,
        MAX(sequence_number) as last_sequence,
        MIN(timestamp) as first_entry_date,
        MAX(timestamp) as last_entry_date,
        SUM(CASE WHEN transaction_type = 'SALE' THEN 1 ELSE 0 END) as sales_count,
        SUM(CASE WHEN transaction_type = 'REFUND' THEN 1 ELSE 0 END) as refunds_count,
        SUM(CASE WHEN transaction_type = 'CORRECTION' THEN 1 ELSE 0 END) as corrections_count,
        SUM(CASE WHEN transaction_type = 'CLOSURE' THEN 1 ELSE 0 END) as closures_count,
        SUM(CASE WHEN transaction_type = 'CHANGE' THEN 1 ELSE 0 END) as change_count
      FROM legal_journal
    `;

    const statsResult = await pool.query(statsQuery);
    return statsResult.rows[0] ?? {};
  }

  /**
   * Development-only destructive reset.
   * Mirrors the SQL previously implemented directly in routes/legal/journal.ts.
   */
  static async resetJournalDevOnly(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      const err: any = new Error('Journal reset not allowed in production');
      err.statusCode = 403;
      throw err;
    }

    await pool.query('DELETE FROM legal_journal');
    await pool.query('ALTER SEQUENCE legal_journal_id_seq RESTART WITH 1');
  }

  /**
   * Get journal entries by transaction type
   * @param transactionType - The type of transaction
   * @param limit - Optional limit
   * @returns Array of journal entries
   */
  static async getEntriesByType(
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
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
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
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
   * Get closure bulletins (optionally filtered by type and/or establishment for multi-tenancy).
   */
  static async getClosureBulletins(
    type?: 'DAILY' | 'MONTHLY' | 'ANNUAL',
    establishmentId?: string
  ): Promise<ClosureBulletin[]> {
    let query = 'SELECT * FROM closure_bulletins';
    const values: any[] = [];
    const conditions: string[] = [];

    if (type) {
      conditions.push(`closure_type = $${values.length + 1}`);
      values.push(type);
    }
    if (establishmentId !== undefined && establishmentId !== null) {
      conditions.push(`(establishment_id IS NOT DISTINCT FROM $${values.length + 1})`);
      values.push(establishmentId);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
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
   * Get closure bulletins with pagination.
   * Returns only the requested page plus the total matching count.
   */
  static async getClosureBulletinsPaginated(
    type?: 'DAILY' | 'MONTHLY' | 'ANNUAL',
    establishmentId?: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<{ bulletins: ClosureBulletin[]; total: number }> {
    const values: any[] = [];
    const conditions: string[] = [];

    if (type) {
      conditions.push(`closure_type = $${values.length + 1}`);
      values.push(type);
    }

    if (establishmentId !== undefined && establishmentId !== null) {
      conditions.push(`(establishment_id IS NOT DISTINCT FROM $${values.length + 1})`);
      values.push(establishmentId);
    }

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    // Total matching count (no LIMIT/OFFSET)
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM closure_bulletins${whereClause}`,
      values
    );
    const total = countResult.rows[0]?.total ?? 0;

    // Page query (applies LIMIT/OFFSET after conditions)
    const pageValues = [...values];
    let pageQuery = `SELECT * FROM closure_bulletins${whereClause} ORDER BY period_start DESC`;

    if (opts?.limit != null && Number.isFinite(opts.limit) && opts.limit > 0) {
      pageValues.push(opts.limit);
      pageQuery += ` LIMIT $${pageValues.length}`;
    }

    if (opts?.offset != null && Number.isFinite(opts.offset) && opts.offset >= 0) {
      pageValues.push(opts.offset);
      pageQuery += ` OFFSET $${pageValues.length}`;
    }

    const result = await pool.query(pageQuery, pageValues);

    // Parse JSON fields and ensure tips_total/change_total are present
    const bulletins = result.rows.map((row: any) => ({
      ...row,
      vat_breakdown: typeof row.vat_breakdown === 'string' ? JSON.parse(row.vat_breakdown) : row.vat_breakdown,
      payment_methods_breakdown:
        typeof row.payment_methods_breakdown === 'string'
          ? JSON.parse(row.payment_methods_breakdown)
          : row.payment_methods_breakdown,
      tips_total: row.tips_total || 0,
      change_total: row.change_total || 0,
    }));

    return { bulletins, total };
  }

  /**
   * Insert a closure bulletin (scoped to one establishment for multi-tenancy).
   * @param establishmentId - UUID of the establishment this bulletin belongs to
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
    closureHash: string,
    establishmentId: string
  ): Promise<ClosureBulletin> {
    const query = `
      INSERT INTO closure_bulletins (
        closure_type, period_start, period_end, total_transactions, total_amount, 
        total_vat, vat_breakdown, payment_methods_breakdown, tips_total, change_total, first_sequence, 
        last_sequence, closure_hash, is_closed, closed_at, establishment_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
      new Date(),
      establishmentId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Check if a closure bulletin already exists for a period and establishment (multi-tenant).
   */
  static async closureBulletinExists(
    type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL',
    startDate: Date,
    endDate: Date,
    establishmentId: string
  ): Promise<boolean> {
    const query = `
      SELECT id FROM closure_bulletins 
      WHERE closure_type = $1 AND period_start = $2 AND period_end = $3
        AND (establishment_id IS NOT DISTINCT FROM $4)
    `;
    const result = await pool.query(query, [type, startDate, endDate, establishmentId]);
    return result.rows.length > 0;
  }
}

