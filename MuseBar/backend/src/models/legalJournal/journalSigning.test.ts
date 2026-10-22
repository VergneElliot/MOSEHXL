import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getRegisterId: vi.fn(() => 'REG-TEST'),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('../../utils/registerId', () => ({
  getRegisterIdForEstablishment: mocks.getRegisterId,
}));

import { JournalSigning } from './journalSigning';

describe('JournalSigning crypto helpers', () => {
  it('generateHash is deterministic SHA-256 over previous|data', () => {
    const a = JournalSigning.generateHash('payload', 'prev');
    const b = JournalSigning.generateHash('payload', 'prev');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(JournalSigning.generateHash('other', 'prev')).not.toBe(a);
  });

  it('generateClosureHash hashes bulletin payload', () => {
    const h = JournalSigning.generateClosureHash('closure-data');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('getRegisterKey delegates to register id helper', () => {
    expect(JournalSigning.getRegisterKey('est-1')).toBe('REG-TEST');
    expect(mocks.getRegisterId).toHaveBeenCalledWith('est-1');
  });
});

describe('JournalSigning.verifyJournalIntegrity', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
  });

  it('returns valid for empty journal', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [] });
    const result = await JournalSigning.verifyJournalIntegrity('est-1');
    expect(result).toEqual({ isValid: true, errors: [], documentedExceptions: [] });
  });

  it('accepts a correctly chained SALE entry', async () => {
    const ZERO =
      '0000000000000000000000000000000000000000000000000000000000000000';
    const ts = new Date('2026-01-15T12:00:00.000Z');
    const amount = '10.00';
    const vat = '2.00';
    const orderId = '42';
    const payment = 'card';
    const register = 'REG-TEST';
    const dataString = `1|SALE|${orderId}|${amount}|${vat}|${payment}|${ts.toISOString()}|${register}`;
    const current = JournalSigning.generateHash(dataString, ZERO);

    mocks.poolQuery.mockResolvedValue({
      rows: [
        {
          sequence_number: 1,
          transaction_type: 'SALE',
          order_id: 42,
          amount,
          vat_amount: vat,
          payment_method: payment,
          timestamp: ts,
          register_id: register,
          previous_hash: ZERO,
          current_hash: current,
          transaction_data: null,
        },
      ],
    });

    const result = await JournalSigning.verifyJournalIntegrity('est-1');
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('flags broken chain and documents migration markers', async () => {
    const ZERO =
      '0000000000000000000000000000000000000000000000000000000000000000';
    mocks.poolQuery.mockResolvedValue({
      rows: [
        {
          sequence_number: 1,
          transaction_type: 'CORRECTION',
          order_id: null,
          amount: '0',
          vat_amount: '0',
          payment_method: '',
          timestamp: new Date(),
          register_id: 'REG',
          previous_hash: ZERO,
          current_hash: 'MIGRATION_DOCUMENTED_CHAIN_VALID',
          transaction_data: { correction_type: 'DATABASE_MIGRATION' },
        },
        {
          sequence_number: 2,
          transaction_type: 'SALE',
          order_id: 1,
          amount: '5.00',
          vat_amount: '1.00',
          payment_method: 'cash',
          timestamp: new Date(),
          register_id: 'REG',
          previous_hash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
          current_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          transaction_data: null,
        },
      ],
    });

    const result = await JournalSigning.verifyJournalIntegrity('est-1');
    expect(result.documentedExceptions.length).toBeGreaterThan(0);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Hash'))).toBe(true);
  });
});
