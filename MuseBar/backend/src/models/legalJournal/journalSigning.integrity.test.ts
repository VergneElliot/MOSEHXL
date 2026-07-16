import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: {
    query: mocks.poolQuery,
  },
}));

import { JournalSigning } from './journalSigning';

const EST = '11111111-1111-4111-8111-111111111111';
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const REGISTER = JournalSigning.getRegisterKey(EST);

function buildEntry(input: {
  sequence: number;
  previousHash: string;
  transactionType?: string;
  orderId?: number | null;
  amount?: string;
  vatAmount?: string;
  paymentMethod?: string;
  timestamp?: string;
  registerId?: string;
  currentHash?: string;
  transactionData?: Record<string, unknown>;
}) {
  const sequence = input.sequence;
  const transactionType = input.transactionType ?? 'SALE';
  const orderId = input.orderId ?? 1;
  const amount = input.amount ?? '10.00';
  const vatAmount = input.vatAmount ?? '1.67';
  const paymentMethod = input.paymentMethod ?? 'card';
  const timestamp = input.timestamp ?? '2026-04-29T12:00:00.000Z';
  const registerId = input.registerId ?? REGISTER;
  const orderIdForHash = orderId === null ? 'null' : String(orderId);
  const dataString = `${sequence}|${transactionType}|${orderIdForHash}|${amount}|${vatAmount}|${paymentMethod}|${timestamp}|${registerId}`;
  const currentHash =
    input.currentHash ?? JournalSigning.generateHash(dataString, input.previousHash);

  return {
    sequence_number: sequence,
    transaction_type: transactionType,
    order_id: orderId,
    amount,
    vat_amount: vatAmount,
    payment_method: paymentMethod,
    timestamp,
    register_id: registerId,
    previous_hash: input.previousHash,
    current_hash: currentHash,
    transaction_data: input.transactionData ?? null,
  };
}

/** Build an entry hashed with Paris-wall-clock-as-Z (era B). */
function buildParisEraEntry(input: {
  sequence: number;
  previousHash: string;
  amount?: string;
  vatAmount?: string;
  /** UTC instant stored in DB */
  utcTimestamp: string;
}) {
  const amount = input.amount ?? '11.00';
  const vatAmount = input.vatAmount ?? '1.83';
  const utc = new Date(input.utcTimestamp);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(utc);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = String(Number(get('hour')) % 24).padStart(2, '0');
  const ms = String(utc.getUTCMilliseconds()).padStart(3, '0');
  const parisAsZ =
    `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}.${ms}Z`;

  const dataString =
    `${input.sequence}|SALE|1|${amount}|${vatAmount}|card|${parisAsZ}|${REGISTER}`;
  const currentHash = JournalSigning.generateHash(dataString, input.previousHash);

  return {
    sequence_number: input.sequence,
    transaction_type: 'SALE',
    order_id: 1,
    amount,
    vat_amount: vatAmount,
    payment_method: 'card',
    timestamp: input.utcTimestamp,
    register_id: REGISTER,
    previous_hash: input.previousHash,
    current_hash: currentHash,
    transaction_data: null,
  };
}

describe('JournalSigning.verifyJournalIntegrity', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
  });

  it('returns valid for a coherent two-entry chain', async () => {
    const first = buildEntry({ sequence: 1, previousHash: ZERO_HASH });
    const second = buildEntry({
      sequence: 2,
      previousHash: first.current_hash,
      timestamp: '2026-04-29T12:01:00.000Z',
    });

    mocks.poolQuery.mockResolvedValueOnce({ rows: [first, second] });

    const result = await JournalSigning.verifyJournalIntegrity(EST);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.documentedExceptions).toEqual([]);
    expect(mocks.poolQuery).toHaveBeenCalledTimes(1);
    expect(mocks.poolQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE establishment_id = $1'),
      [EST]
    );
  });

  it('returns invalid when previous_hash continuity is broken', async () => {
    const first = buildEntry({ sequence: 1, previousHash: ZERO_HASH });
    const wrongPrev = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const second = buildEntry({
      sequence: 2,
      previousHash: wrongPrev,
      timestamp: '2026-04-29T12:01:00.000Z',
    });

    mocks.poolQuery.mockResolvedValueOnce({ rows: [first, second] });

    const result = await JournalSigning.verifyJournalIntegrity(EST);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Hash chain broken at sequence 2'))).toBe(true);
  });

  it('returns invalid for correction rows when chain continuity is broken', async () => {
    const first = buildEntry({ sequence: 127, previousHash: ZERO_HASH });
    const wrongPrev = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const correction = buildEntry({
      sequence: 128,
      previousHash: wrongPrev,
      transactionType: 'CORRECTION',
      orderId: null,
      amount: '0.00',
      vatAmount: '0.00',
      paymentMethod: 'correction',
      timestamp: '2026-04-29T12:02:00.000Z',
    });

    mocks.poolQuery.mockResolvedValueOnce({ rows: [first, correction] });

    const result = await JournalSigning.verifyJournalIntegrity(EST);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Hash chain broken at sequence 128'))).toBe(true);
  });

  it('accepts entries hashed with Paris-wall-clock era format', async () => {
    const first = buildParisEraEntry({
      sequence: 610,
      previousHash: ZERO_HASH,
      utcTimestamp: '2025-07-30T13:17:59.149Z',
    });
    const second = buildParisEraEntry({
      sequence: 611,
      previousHash: first.current_hash,
      utcTimestamp: '2025-07-30T13:44:37.307Z',
      amount: '9.50',
      vatAmount: '1.58',
    });

    mocks.poolQuery.mockResolvedValueOnce({ rows: [first, second] });

    const result = await JournalSigning.verifyJournalIntegrity(EST);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('treats documented migration markers as exceptions, not errors', async () => {
    const before = buildEntry({
      sequence: 607,
      previousHash: ZERO_HASH,
      amount: '8.00',
      vatAmount: '1.33',
      timestamp: '2025-07-29T21:10:23.992Z',
    });
    const migration = {
      sequence_number: 608,
      transaction_type: 'CORRECTION',
      order_id: null,
      amount: '0.0000',
      vat_amount: '0.0000',
      payment_method: 'SYSTEM',
      timestamp: '2025-07-30T10:00:20.629Z',
      register_id: 'SYSTEM-MIGRATION',
      previous_hash: before.current_hash,
      current_hash: 'MIGRATION_DOCUMENTED_CHAIN_VALID',
      transaction_data: {
        correction_type: 'DATABASE_MIGRATION',
        affected_sequences: '1-607',
      },
    };
    const checkpoint = {
      sequence_number: 609,
      transaction_type: 'ARCHIVE',
      order_id: null,
      amount: '0.0000',
      vat_amount: '0.0000',
      payment_method: 'SYSTEM',
      timestamp: '2025-07-30T10:12:25.811Z',
      register_id: 'SYSTEM-CHECKPOINT',
      previous_hash: ZERO_HASH,
      current_hash: 'CHECKPOINT_MIGRATION_BASELINE',
      transaction_data: {
        archive_type: 'MIGRATION_CHECKPOINT',
        historical_entries: '1-607',
      },
    };
    const after = buildParisEraEntry({
      sequence: 610,
      previousHash: 'CHECKPOINT_MIGRATION_BASELINE',
      utcTimestamp: '2025-07-30T13:17:59.149Z',
    });

    mocks.poolQuery.mockResolvedValueOnce({
      rows: [before, migration, checkpoint, after],
    });

    const result = await JournalSigning.verifyJournalIntegrity(EST);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.documentedExceptions?.map((e) => e.sequence_number).sort()).toEqual([
      608, 609,
    ]);
  });

  it('treats documented recovery sale as exception when hash does not match eras', async () => {
    const first = buildEntry({ sequence: 127, previousHash: ZERO_HASH });
    const recovery = {
      sequence_number: 128,
      transaction_type: 'SALE',
      order_id: 87,
      amount: '116.5000',
      vat_amount: '19.4200',
      payment_method: 'card',
      timestamp: '2025-07-17T16:37:18.849Z',
      register_id: 'MUSEBAR-CR-001',
      previous_hash: first.current_hash,
      // Deliberately wrong hash — only documentation saves it
      current_hash: 'dc2b3673de01f17333ee527bb9ce3927de96cb95b85ebbe2cb48181b728ba0ad',
      transaction_data: {
        recovery_order: true,
        manual_compensation: true,
        original_data_loss: 'Database issue on 2025-07-17',
      },
    };

    mocks.poolQuery.mockResolvedValueOnce({ rows: [first, recovery] });

    const result = await JournalSigning.verifyJournalIntegrity(EST);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.documentedExceptions).toEqual([
      expect.objectContaining({ sequence_number: 128 }),
    ]);
  });

  it('still flags unexplained hash mismatches as errors', async () => {
    const first = buildEntry({ sequence: 1, previousHash: ZERO_HASH });
    const tampered = {
      ...buildEntry({
        sequence: 2,
        previousHash: first.current_hash,
        timestamp: '2026-04-29T12:01:00.000Z',
      }),
      current_hash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    };

    mocks.poolQuery.mockResolvedValueOnce({ rows: [first, tampered] });

    const result = await JournalSigning.verifyJournalIntegrity(EST);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) =>
        e.includes('Hash verification failed at sequence 2')
      )
    ).toBe(true);
  });
});
