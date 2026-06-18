import { pool } from '../../db/pool';
import { JournalEntry, ClosureBulletin } from './types';
import { JournalSigning } from './journalSigning';

const ZERO_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';
const APPEND_MAX_RETRIES = 3;

function isRetryableTransactionError(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return code === '40001' || code === '40P01';
}

function formatDecimalForHash(value: number): string {
  if (!Number.isFinite(value)) {
    return '0.0000';
  }
  return value.toFixed(4);
}

export async function getNextSequenceNumber(establishmentId: string): Promise<number> {
  const query =
    'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_sequence FROM legal_journal WHERE establishment_id = $1';
  const result = await pool.query(query, [establishmentId]);
  return result.rows[0].next_sequence;
}

export async function getLastEntry(establishmentId: string): Promise<JournalEntry | null> {
  const query = `
    SELECT * FROM legal_journal
    WHERE establishment_id = $1
    ORDER BY sequence_number DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [establishmentId]);
  return result.rows[0] || null;
}

export async function insertEntry(
  sequenceNumber: number,
  establishmentId: string,
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

export async function appendEntryTransactional(
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

  for (let attempt = 1; attempt <= APPEND_MAX_RETRIES; attempt++) {
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
        (lastEntryResult.rows[0]?.current_hash as string | undefined) ?? ZERO_HASH;

      const timestamp = new Date();
      const orderIdForHash = orderId === null ? 'null' : (orderId || '');
      const effectiveRegisterId = registerId ?? JournalSigning.getRegisterKey(establishmentId);
      const amountForHash = formatDecimalForHash(amount);
      const vatAmountForHash = formatDecimalForHash(vatAmount);
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
      if (isRetryableTransactionError(error) && attempt < APPEND_MAX_RETRIES) {
        continue;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Journal append failed');
}

export async function insertClosureBulletin(
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
  journalSalesCount: number,
  journalSalesAmount: number,
  journalSalesVat: number,
  reconciliationOk: boolean,
  reconciliationDetails: Record<string, unknown>,
  firstSequence: number,
  lastSequence: number,
  closureHash: string,
  establishmentId: string,
  isClosed = true
): Promise<ClosureBulletin> {
  const query = `
    INSERT INTO closure_bulletins (
      closure_type, period_start, period_end, total_transactions, fond_de_caisse, total_amount,
      total_vat, vat_breakdown, payment_methods_breakdown, tips_total, change_total,
      journal_sales_count, journal_sales_amount, journal_sales_vat, reconciliation_ok, reconciliation_details,
      first_sequence, last_sequence, closure_hash, is_closed, closed_at, establishment_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22
    )
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
    journalSalesCount,
    journalSalesAmount,
    journalSalesVat,
    reconciliationOk,
    JSON.stringify(reconciliationDetails),
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

export async function closeOpenClosureBulletin(
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

export async function deleteOpenClosureBulletin(
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
