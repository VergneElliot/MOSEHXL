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
}) {
  const sequence = input.sequence;
  const transactionType = input.transactionType ?? 'SALE';
  const orderId = input.orderId ?? 1;
  const amount = input.amount ?? '10.00';
  const vatAmount = input.vatAmount ?? '1.67';
  const paymentMethod = input.paymentMethod ?? 'card';
  const timestamp = input.timestamp ?? '2026-04-29T12:00:00.000Z';
  const orderIdForHash = orderId === null ? 'null' : String(orderId);
  const dataString = `${sequence}|${transactionType}|${orderIdForHash}|${amount}|${vatAmount}|${paymentMethod}|${timestamp}|${REGISTER}`;
  const currentHash = JournalSigning.generateHash(dataString, input.previousHash);

  return {
    sequence_number: sequence,
    transaction_type: transactionType,
    order_id: orderId,
    amount,
    vat_amount: vatAmount,
    payment_method: paymentMethod,
    timestamp,
    register_id: REGISTER,
    previous_hash: input.previousHash,
    current_hash: currentHash,
  };
}

describe('JournalSigning.verifyJournalIntegrity', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
  });

  it('returns valid for a coherent two-entry chain', async () => {
    const first = buildEntry({ sequence: 1, previousHash: ZERO_HASH });
    const second = buildEntry({ sequence: 2, previousHash: first.current_hash, timestamp: '2026-04-29T12:01:00.000Z' });

    mocks.poolQuery.mockResolvedValueOnce({ rows: [first, second] });

    const result = await JournalSigning.verifyJournalIntegrity(EST);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
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
    const second = buildEntry({ sequence: 2, previousHash: wrongPrev, timestamp: '2026-04-29T12:01:00.000Z' });

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
});
