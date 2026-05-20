import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolConnect: vi.fn(),
  clientQuery: vi.fn(),
  clientRelease: vi.fn(),
}));

vi.mock('../../app', () => ({
  pool: {
    connect: mocks.poolConnect,
  },
}));

import { JournalQueries } from './journalQueries';

describe('JournalQueries.resetJournalDevOnly', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const ESTABLISHMENT_ID = 'estab-123';

  beforeEach(() => {
    mocks.clientQuery.mockReset();
    mocks.clientRelease.mockReset();
    mocks.poolConnect.mockReset();
    mocks.poolConnect.mockResolvedValue({
      query: mocks.clientQuery,
      release: mocks.clientRelease,
    });
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('rejects reset in production', async () => {
    process.env.NODE_ENV = 'production';

    await expect(
      JournalQueries.resetJournalDevOnly(ESTABLISHMENT_ID)
    ).rejects.toMatchObject({
      message: 'Journal reset not allowed in production',
      statusCode: 403,
    });

    expect(mocks.poolConnect).not.toHaveBeenCalled();
  });

  it('bypasses immutability trigger via session_replication_role and deletes by tenant', async () => {
    process.env.NODE_ENV = 'development';
    mocks.clientQuery.mockResolvedValue({ rows: [] });

    await JournalQueries.resetJournalDevOnly(ESTABLISHMENT_ID);

    const calls = mocks.clientQuery.mock.calls.map((c) => c[0]);
    expect(calls).toEqual([
      'BEGIN',
      "SET LOCAL session_replication_role = 'replica'",
      'DELETE FROM legal_journal WHERE establishment_id = $1',
      'COMMIT',
    ]);
    expect(mocks.clientQuery).toHaveBeenNthCalledWith(
      3,
      'DELETE FROM legal_journal WHERE establishment_id = $1',
      [ESTABLISHMENT_ID]
    );
    expect(mocks.clientRelease).toHaveBeenCalledTimes(1);
  });

  it('rolls back and releases the client on failure', async () => {
    process.env.NODE_ENV = 'development';
    mocks.clientQuery.mockImplementation((sql: string) => {
      if (sql.startsWith('DELETE')) {
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(
      JournalQueries.resetJournalDevOnly(ESTABLISHMENT_ID)
    ).rejects.toThrow('boom');

    const calls = mocks.clientQuery.mock.calls.map((c) => c[0]);
    expect(calls).toContain('ROLLBACK');
    expect(mocks.clientRelease).toHaveBeenCalledTimes(1);
  });
});
