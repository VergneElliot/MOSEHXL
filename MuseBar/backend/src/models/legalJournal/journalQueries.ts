/**
 * Legal Journal Database Queries
 * Database operations for legal journal entries
 */

import { pool } from '../../app';
import { JournalEntry, ClosureBulletin } from './types';
import { Logger } from '../../utils/logger';
import { JournalSigning } from './journalSigning';

function logParseFailure(message: string, error: unknown): void {
  try {
    Logger.getInstance().error(message, error as Error, 'LEGAL_JOURNAL');
  } catch {
    process.stderr.write(`[LEGAL_JOURNAL] ${message}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logParseFailure('Failed to parse legal journal JSON field', error);
      return fallback;
    }
  }
  return value as T;
}

export class JournalQueries {
  private static readonly ZERO_HASH =
    '0000000000000000000000000000000000000000000000000000000000000000';
  private static readonly APPEND_MAX_RETRIES = 3;

  private static isRetryableTransactionError(error: unknown): boolean {
    const code = (error as { code?: unknown })?.code;
    return code === '40001' || code === '40P01';
  }

  private static formatDecimalForHash(value: number): string {
    if (!Number.isFinite(value)) {
      return '0.0000';
    }
    return value.toFixed(4);
  }

  /**
   * Get the next sequence number for a new journal entry
   * @returns The next sequence number
   */
  static async getNextSequenceNumber(establishmentId: string): Promise<number> {
    const query =
      'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_sequence FROM legal_journal WHERE establishment_id = $1';
    const result = await pool.query(query, [establishmentId]);
    return result.rows[0].next_sequence;
  }

  /**
   * Get the last journal entry for hash chaining (within one establishment).
   * @returns The last journal entry or null if none exists
   */
  static async getLastEntry(establishmentId: string): Promise<JournalEntry | null> {
    const query = `
      SELECT * FROM legal_journal
      WHERE establishment_id = $1
      ORDER BY sequence_number DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [establishmentId]);
    return result.rows[0] || null;
  }

  /**
   * Get journal entries for a specific period and establishment
   * @param start - Start date
   * @param end - End date
   * @returns Array of journal entries
   */
  static async getEntriesForPeriod(establishmentId: string, start: Date, end: Date): Promise<JournalEntry[]> {
    const query = `
      SELECT * FROM legal_journal
      WHERE establishment_id = $1
        AND timestamp >= $2 AND timestamp <= $3
      ORDER BY sequence_number ASC
    `;
    const result = await pool.query(query, [establishmentId, start, end]);
    return result.rows;
  }

  /**
   * Get all journal entries with pagination (one establishment)
   * @param limit - Number of entries to return
   * @param offset - Number of entries to skip
   * @returns Array of journal entries
   */
  static async getEntries(establishmentId: string, limit?: number, offset?: number): Promise<JournalEntry[]> {
    let query = 'SELECT * FROM legal_journal WHERE establishment_id = $1 ORDER BY sequence_number DESC';
    const values: Array<string | number> = [establishmentId];
    
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
    establishment_id: string;
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
    const { establishment_id, start_date, end_date, limit, offset } = params;

    let query = 'SELECT * FROM legal_journal WHERE establishment_id = $1 ORDER BY sequence_number DESC';
    const values: Array<string | number> = [establishment_id];

    if (start_date && end_date) {
      query = `
        SELECT * FROM legal_journal
        WHERE establishment_id = $1
          AND timestamp >= $2 AND timestamp <= $3
        ORDER BY sequence_number DESC
      `;
      values.length = 0;
      values.push(establishment_id, start_date, end_date);
    }

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    const countQuery =
      start_date && end_date
        ? 'SELECT COUNT(*) FROM legal_journal WHERE establishment_id = $1 AND timestamp >= $2 AND timestamp <= $3'
        : 'SELECT COUNT(*) FROM legal_journal WHERE establishment_id = $1';

    const countValues =
      start_date && end_date ? [establishment_id, start_date, end_date] : [establishment_id];
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
  static async getJournalStatsSummary(establishmentId: string): Promise<Record<string, unknown>> {
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
      WHERE establishment_id = $1
    `;

    const statsResult = await pool.query(statsQuery, [establishmentId]);
    return statsResult.rows[0] ?? {};
  }

  /**
   * Development-only destructive reset.
   * Mirrors the SQL previously implemented directly in routes/legal/journal.ts.
   */
  static async resetJournalDevOnly(establishmentId: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw Object.assign(new Error('Journal reset not allowed in production'), { statusCode: 403 });
    }

    // Bypass the immutability trigger only for this single transaction so we
    // can still delete by tenant scope. SET LOCAL session_replication_role is
    // transaction-scoped and auto-restored on COMMIT/ROLLBACK. The production
    // guard above keeps this path unreachable outside dev/test environments.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL session_replication_role = 'replica'");
      await client.query('DELETE FROM legal_journal WHERE establishment_id = $1', [
        establishmentId,
      ]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get journal entries by transaction type
   * @param transactionType - The type of transaction
   * @param limit - Optional limit
   * @returns Array of journal entries
   */
  static async getEntriesByType(
    establishmentId: string,
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
    limit?: number
  ): Promise<JournalEntry[]> {
    let query =
      'SELECT * FROM legal_journal WHERE establishment_id = $1 AND transaction_type = $2 ORDER BY sequence_number DESC';
    const values: Array<string | number> = [establishmentId, transactionType];
    
    if (limit) {
      query += ` LIMIT $3`;
      values.push(limit);
    }
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Get journal entries for a specific order (scoped to establishment)
   * @param orderId - The order ID
   * @returns Array of journal entries
   */
  static async getEntriesForOrder(establishmentId: string, orderId: number): Promise<JournalEntry[]> {
    const query = `
      SELECT * FROM legal_journal
      WHERE order_id = $1 AND establishment_id = $2
      ORDER BY sequence_number ASC
    `;
    const result = await pool.query(query, [orderId, establishmentId]);
    return result.rows;
  }

  /**
   * Insert a new journal entry
   * @param entry - Journal entry data
   * @returns The created journal entry
   */
  static async insertEntry(
    establishmentId: string,
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
        sequence_number, establishment_id, transaction_type, order_id, amount, vat_amount,
        payment_method, transaction_data, previous_hash, current_hash,
        timestamp, user_id, register_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      sequenceNumber,
      establishmentId,
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
   * Append one journal entry inside a SERIALIZABLE transaction with retry.
   * This protects sequence/hash chain construction under concurrent writers.
   */
  static async appendEntryTransactional(
    establishmentId: string,
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
    orderId: number | null,
    amount: number,
    vatAmount: number,
    paymentMethod: string,
    transactionData: Record<string, unknown>,
    userId?: string,
    registerId?: string
  ): Promise<JournalEntry> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= JournalQueries.APPEND_MAX_RETRIES; attempt++) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

        const sequenceResult = await client.query(
          'SELECT COALESCE(MAX(sequence_number), 0) AS last_sequence FROM legal_journal WHERE establishment_id = $1',
          [establishmentId]
        );
        const lastSequence = Number(sequenceResult.rows[0]?.last_sequence ?? 0);
        const sequenceNumber = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

        const lastEntryResult = await client.query(
          `
            SELECT current_hash
            FROM legal_journal
            WHERE establishment_id = $1
            ORDER BY sequence_number DESC
            LIMIT 1
          `,
          [establishmentId]
        );
        const previousHash =
          (lastEntryResult.rows[0]?.current_hash as string | undefined) ?? JournalQueries.ZERO_HASH;

        const timestamp = new Date();
        const orderIdForHash = orderId === null ? 'null' : (orderId || '');
        const effectiveRegisterId = registerId ?? JournalSigning.getRegisterKey(establishmentId);
        const amountForHash = JournalQueries.formatDecimalForHash(amount);
        const vatAmountForHash = JournalQueries.formatDecimalForHash(vatAmount);
        const dataString = `${sequenceNumber}|${transactionType}|${orderIdForHash}|${amountForHash}|${vatAmountForHash}|${paymentMethod}|${timestamp.toISOString()}|${effectiveRegisterId}`;
        const currentHash = JournalSigning.generateHash(dataString, previousHash);

        const insertResult = await client.query(
          `
            INSERT INTO legal_journal (
              sequence_number, establishment_id, transaction_type, order_id, amount, vat_amount,
              payment_method, transaction_data, previous_hash, current_hash,
              timestamp, user_id, register_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
          `,
          [
            sequenceNumber,
            establishmentId,
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
            effectiveRegisterId,
          ]
        );

        await client.query('COMMIT');
        return insertResult.rows[0];
      } catch (error: unknown) {
        lastError = error;
        try {
          await client.query('ROLLBACK');
        } catch {
          // Ignore rollback failure and continue failure path.
        }
        if (
          JournalQueries.isRetryableTransactionError(error) &&
          attempt < JournalQueries.APPEND_MAX_RETRIES
        ) {
          continue;
        }
        throw error;
      } finally {
        client.release();
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Journal append failed');
  }

  /**
   * Get closure bulletins for one establishment (optionally filtered by type).
   */
  static async getClosureBulletins(
    establishmentId: string,
    type?: 'DAILY' | 'MONTHLY' | 'ANNUAL'
  ): Promise<ClosureBulletin[]> {
    let query = 'SELECT * FROM closure_bulletins';
    const values: Array<string | number> = [];
    const conditions: string[] = [];

    if (type) {
      conditions.push(`closure_type = $${values.length + 1}`);
      values.push(type);
    }
    conditions.push(`(establishment_id IS NOT DISTINCT FROM $${values.length + 1})`);
    values.push(establishmentId);
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY period_start DESC, created_at DESC, id DESC';

    const result = await pool.query(query, values);
    // Parse JSON fields and ensure tips_total/change_total are present
    return result.rows.map((row) => {
      const r = row as Record<string, unknown> & {
        vat_breakdown?: unknown;
        payment_methods_breakdown?: unknown;
        fond_de_caisse?: number;
        tips_total?: number;
        change_total?: number;
      };
      return {
        ...(r as Record<string, unknown>),
        vat_breakdown: parseJsonField(r.vat_breakdown, {}),
        payment_methods_breakdown: parseJsonField(r.payment_methods_breakdown, {}),
        fond_de_caisse: r.fond_de_caisse ?? 0,
        tips_total: r.tips_total || 0,
        change_total: r.change_total || 0
      } as ClosureBulletin;
    });
  }

  /**
   * Get closure bulletins with pagination.
   * Returns only the requested page plus the total matching count.
   */
  static async getClosureBulletinsPaginated(
    establishmentId: string,
    type?: 'DAILY' | 'MONTHLY' | 'ANNUAL',
    opts?: { limit?: number; offset?: number }
  ): Promise<{ bulletins: ClosureBulletin[]; total: number }> {
    const values: Array<string | number> = [];
    const conditions: string[] = [];

    if (type) {
      conditions.push(`closure_type = $${values.length + 1}`);
      values.push(type);
    }

    conditions.push(`(establishment_id IS NOT DISTINCT FROM $${values.length + 1})`);
    values.push(establishmentId);

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    // Total matching count (no LIMIT/OFFSET)
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM closure_bulletins${whereClause}`,
      values
    );
    const total = countResult.rows[0]?.total ?? 0;

    // Page query (applies LIMIT/OFFSET after conditions)
    const pageValues = [...values];
    let pageQuery = `SELECT * FROM closure_bulletins${whereClause} ORDER BY period_start DESC, created_at DESC, id DESC`;

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
    const bulletins = result.rows.map((row) => {
      const r = row as Record<string, unknown> & {
        vat_breakdown?: unknown;
        payment_methods_breakdown?: unknown;
        fond_de_caisse?: number;
        tips_total?: number;
        change_total?: number;
      };
      return {
        ...(r as Record<string, unknown>),
        vat_breakdown: parseJsonField(r.vat_breakdown, {}),
        payment_methods_breakdown: parseJsonField(r.payment_methods_breakdown, {}),
        fond_de_caisse: r.fond_de_caisse ?? 0,
        tips_total: r.tips_total || 0,
        change_total: r.change_total || 0,
      } as ClosureBulletin;
    });

    return { bulletins, total };
  }

  /**
   * Get the most recently used "fond de caisse" value for an establishment.
   * Informational only (must not affect accounting totals).
   */
  static async getLastFondDeCaisse(establishmentId: string): Promise<number | null> {
    const result = await pool.query(
      `
        SELECT fond_de_caisse
        FROM closure_bulletins
        WHERE (establishment_id IS NOT DISTINCT FROM $1)
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [establishmentId]
    );
    const row = result.rows[0] as { fond_de_caisse?: unknown } | undefined;
    if (!row) return null;
    const n = typeof row.fond_de_caisse === 'number' ? row.fond_de_caisse : parseFloat(String(row.fond_de_caisse ?? ''));
    return Number.isFinite(n) ? n : null;
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
    fondDeCaisse: number,
    totalAmount: number,
    totalVat: number,
    vatBreakdown: Record<string, { amount: number; vat: number }>,
    paymentBreakdown: Record<string, number>,
    tipsTotal: number,
    changeTotal: number,
    firstSequence: number,
    lastSequence: number,
    closureHash: string,
    establishmentId: string,
    isClosed = true
  ): Promise<ClosureBulletin> {
    const query = `
      INSERT INTO closure_bulletins (
        closure_type, period_start, period_end, total_transactions, fond_de_caisse, total_amount, 
        total_vat, vat_breakdown, payment_methods_breakdown, tips_total, change_total, first_sequence, 
        last_sequence, closure_hash, is_closed, closed_at, establishment_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      closureType,
      startDate,
      endDate,
      totalTransactions,
      fondDeCaisse,
      totalAmount,
      totalVat,
      JSON.stringify(vatBreakdown),
      JSON.stringify(paymentBreakdown),
      tipsTotal,
      changeTotal,
      firstSequence,
      lastSequence,
      closureHash,
      isClosed,
      isClosed ? new Date() : null,
      establishmentId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async closeOpenClosureBulletin(
    closureBulletinId: number,
    establishmentId: string
  ): Promise<ClosureBulletin | null> {
    const result = await pool.query(
      `
        UPDATE closure_bulletins
        SET is_closed = true, closed_at = NOW()
        WHERE id = $1
          AND establishment_id = $2
          AND is_closed = false
        RETURNING *
      `,
      [closureBulletinId, establishmentId]
    );
    return result.rows[0] ?? null;
  }

  static async deleteOpenClosureBulletin(
    closureBulletinId: number,
    establishmentId: string
  ): Promise<boolean> {
    const result = await pool.query(
      `
        DELETE FROM closure_bulletins
        WHERE id = $1
          AND establishment_id = $2
          AND is_closed = false
      `,
      [closureBulletinId, establishmentId]
    );
    return (result.rowCount ?? 0) > 0;
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

