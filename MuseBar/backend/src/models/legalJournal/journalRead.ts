import { pool } from '../../db/pool';
import { JournalEntry, ClosureBulletin, ClosureType } from './types';
import { Logger } from '../../utils/logger';

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

export async function getEntriesForPeriod(establishmentId: string, start: Date, end: Date): Promise<JournalEntry[]> {
  const query = `
    SELECT * FROM legal_journal
    WHERE establishment_id = $1
      AND timestamp >= $2 AND timestamp <= $3
    ORDER BY sequence_number ASC
  `;
  const result = await pool.query(query, [establishmentId, start, end]);
  return result.rows;
}

export async function getEntries(establishmentId: string, limit?: number, offset?: number): Promise<JournalEntry[]> {
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

export async function getEntriesWithCountForPeriod(params: {
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

export async function getEntriesByType(
  establishmentId: string,
  transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
  limit?: number
): Promise<JournalEntry[]> {
  let query =
    'SELECT * FROM legal_journal WHERE establishment_id = $1 AND transaction_type = $2 ORDER BY sequence_number DESC';
  const values: Array<string | number> = [establishmentId, transactionType];

  if (limit) {
    query += ' LIMIT $3';
    values.push(limit);
  }

  const result = await pool.query(query, values);
  return result.rows;
}

export async function getEntriesForOrder(establishmentId: string, orderId: number): Promise<JournalEntry[]> {
  const query = `
    SELECT * FROM legal_journal
    WHERE order_id = $1 AND establishment_id = $2
    ORDER BY sequence_number ASC
  `;
  const result = await pool.query(query, [orderId, establishmentId]);
  return result.rows;
}

export async function getClosureBulletins(
  establishmentId: string,
  type?: ClosureType
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

export async function getClosureBulletinsPaginated(
  establishmentId: string,
  type?: ClosureType,
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

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM closure_bulletins${whereClause}`,
    values
  );
  const total = countResult.rows[0]?.total ?? 0;

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

export async function getLastFondDeCaisse(establishmentId: string): Promise<number | null> {
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

export async function closureBulletinExists(
  type: ClosureType,
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
