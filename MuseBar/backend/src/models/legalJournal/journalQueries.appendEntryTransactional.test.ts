import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
}));

vi.mock('../../app', () => ({
  pool: {
    connect: mocks.connect,
    query: vi.fn(),
  },
}));

import { JournalQueries } from './journalQueries';

const EST = '11111111-1111-4111-8111-111111111111';

function createClient(options: { failCode?: string }) {
  const query = vi.fn(async (sql: unknown) => {
    const statement = String(sql ?? '');

    if (statement === 'BEGIN') return { rows: [] };
    if (statement === 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE') return { rows: [] };
    if (statement === 'ROLLBACK') return { rows: [] };
    if (statement === 'COMMIT') return { rows: [] };
    if (statement.includes('SELECT COALESCE(MAX(sequence_number), 0)')) {
      return { rows: [{ last_sequence: 7 }] };
    }
    if (statement.includes('SELECT current_hash')) {
      return { rows: [{ current_hash: 'prev-hash' }] };
    }
    if (statement.includes('INSERT INTO legal_journal')) {
      if (options.failCode) {
        const err = Object.assign(new Error('insert failed'), { code: options.failCode });
        throw err;
      }
      return {
        rows: [
          {
            id: 123,
            establishment_id: EST,
            sequence_number: 8,
            transaction_type: 'SALE',
          },
        ],
      };
    }

    throw new Error(`Unexpected SQL in test: ${statement}`);
  });

  return {
    query,
    release: vi.fn(),
  };
}

describe('JournalQueries.appendEntryTransactional', () => {
  beforeEach(() => {
    mocks.connect.mockReset();
  });

  it('retries once and succeeds on serialization conflict', async () => {
    const firstClient = createClient({ failCode: '40001' });
    const secondClient = createClient({});
    mocks.connect.mockResolvedValueOnce(firstClient).mockResolvedValueOnce(secondClient);

    const result = await JournalQueries.appendEntryTransactional(
      EST,
      'SALE',
      10,
      20,
      3.33,
      'card',
      { order_id: 10 },
      '42',
      'REG-1'
    );

    expect(result.id).toBe(123);
    expect(mocks.connect).toHaveBeenCalledTimes(2);
    expect(firstClient.release).toHaveBeenCalledTimes(1);
    expect(secondClient.release).toHaveBeenCalledTimes(1);
    expect(firstClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(secondClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('stops after max retries when serialization keeps failing', async () => {
    mocks.connect
      .mockResolvedValueOnce(createClient({ failCode: '40001' }))
      .mockResolvedValueOnce(createClient({ failCode: '40001' }))
      .mockResolvedValueOnce(createClient({ failCode: '40001' }));

    await expect(
      JournalQueries.appendEntryTransactional(
        EST,
        'SALE',
        11,
        30,
        5,
        'cash',
        { order_id: 11 },
        '7',
        'REG-1'
      )
    ).rejects.toMatchObject({ code: '40001' });

    expect(mocks.connect).toHaveBeenCalledTimes(3);
  });
});
