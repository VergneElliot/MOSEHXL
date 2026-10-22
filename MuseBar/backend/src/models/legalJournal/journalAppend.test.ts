import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  poolConnect: vi.fn(),
  generateHash: vi.fn(() => 'hash-new'),
  getRegisterKey: vi.fn(() => 'CR-est-1'),
}));

vi.mock('../../db/pool', () => ({
  pool: {
    query: mocks.poolQuery,
    connect: mocks.poolConnect,
  },
}));

vi.mock('./journalSigning', () => ({
  JournalSigning: {
    generateHash: mocks.generateHash,
    getRegisterKey: mocks.getRegisterKey,
  },
}));

import {
  appendEntryTransactional,
  closeOpenClosureBulletin,
  deleteOpenClosureBulletin,
  getLastEntry,
  getNextSequenceNumber,
  insertClosureBulletin,
  insertEntry,
  setSupersededBy,
  voidClosureBulletin,
} from './journalAppend';

describe('journalAppend', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.poolConnect.mockReset();
    mocks.generateHash.mockClear();
    mocks.getRegisterKey.mockClear();
  });

  it('getNextSequenceNumber and getLastEntry', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ next_sequence: 5 }] })
      .mockResolvedValueOnce({ rows: [{ sequence_number: 4, current_hash: 'abc' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(getNextSequenceNumber('est-1')).resolves.toBe(5);
    await expect(getLastEntry('est-1')).resolves.toMatchObject({ sequence_number: 4 });
    await expect(getLastEntry('est-1')).resolves.toBeNull();
  });

  it('insertEntry writes JSON transaction data', async () => {
    const row = { sequence_number: 1, current_hash: 'h' };
    mocks.poolQuery.mockResolvedValue({ rows: [row] });
    const ts = new Date('2026-01-01T12:00:00Z');
    const inserted = await insertEntry(
      1,
      'est-1',
      'SALE',
      10,
      12.5,
      2.5,
      'card',
      { items: [] },
      'prev',
      'curr',
      ts,
      '7',
      'CR-1'
    );
    expect(inserted).toEqual(row);
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO legal_journal'),
      expect.arrayContaining([1, 'est-1', 'SALE', 10, 12.5, 2.5, 'card', JSON.stringify({ items: [] })])
    );
  });

  it('appendEntryTransactional commits a SALE on first attempt', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SET ISOLATION
      .mockResolvedValueOnce({ rows: [{ last_sequence: 2 }] })
      .mockResolvedValueOnce({ rows: [{ current_hash: 'prev-hash' }] })
      .mockResolvedValueOnce({ rows: [{ sequence_number: 3, current_hash: 'hash-new' }] })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const release = vi.fn();
    mocks.poolConnect.mockResolvedValue({ query, release });

    const entry = await appendEntryTransactional(
      'est-1',
      'SALE',
      99,
      10,
      2,
      'cash',
      { note: 'x' },
      'u1'
    );

    expect(entry.sequence_number).toBe(3);
    expect(mocks.generateHash).toHaveBeenCalled();
    expect(mocks.getRegisterKey).toHaveBeenCalledWith('est-1');
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalled();
  });

  it('appendEntryTransactional retries serialization failures then succeeds', async () => {
    const failQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(Object.assign(new Error('serialization'), { code: '40001' }));
    const okQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ last_sequence: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ sequence_number: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    const release = vi.fn();
    mocks.poolConnect
      .mockResolvedValueOnce({
        query: failQuery,
        release,
      })
      .mockResolvedValueOnce({
        query: okQuery,
        release,
      });

    // ROLLBACK after failure
    failQuery.mockResolvedValueOnce({ rows: [] });

    const entry = await appendEntryTransactional(
      'est-1',
      'REFUND',
      null,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      'card',
      {}
    );
    expect(entry.sequence_number).toBe(1);
    expect(mocks.poolConnect).toHaveBeenCalledTimes(2);
  });

  it('appendEntryTransactional throws non-retryable errors after rollback', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK
    const release = vi.fn();
    mocks.poolConnect.mockResolvedValue({ query, release });

    await expect(
      appendEntryTransactional('est-1', 'SALE', 1, 1, 0, 'card', {})
    ).rejects.toThrow('boom');
    expect(release).toHaveBeenCalled();
  });

  it('insertClosureBulletin and close/void/supersede/delete helpers', async () => {
    const bulletin = { id: 11, is_closed: true };
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [bulletin] })
      .mockResolvedValueOnce({ rows: [bulletin] })
      .mockResolvedValueOnce({ rows: [bulletin] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const start = new Date('2026-01-01');
    const end = new Date('2026-01-02');
    await expect(
      insertClosureBulletin(
        'DAILY',
        start,
        end,
        3,
        100,
        50,
        10,
        {},
        { card: 50 },
        0,
        0,
        3,
        50,
        10,
        true,
        {},
        1,
        3,
        'hash',
        'est-1',
        true
      )
    ).resolves.toEqual(bulletin);

    await expect(closeOpenClosureBulletin(11, 'est-1')).resolves.toEqual(bulletin);
    await expect(voidClosureBulletin(11, 'est-1', 'mistake', 'admin')).resolves.toEqual(bulletin);
    await setSupersededBy(11, 12, 'est-1');
    await expect(deleteOpenClosureBulletin(11, 'est-1')).resolves.toBe(true);
  });
});
