import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
}));

vi.mock('../../app', () => ({
  pool: {
    query: mocks.poolQuery,
  },
}));

import { JournalQueries } from './journalQueries';

describe('JournalQueries.resetJournalDevOnly', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mocks.poolQuery.mockReset();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('rejects reset in production', async () => {
    process.env.NODE_ENV = 'production';

    await expect(JournalQueries.resetJournalDevOnly()).rejects.toMatchObject({
      message: 'Journal reset not allowed in production',
      statusCode: 403,
    });

    expect(mocks.poolQuery).not.toHaveBeenCalled();
  });

  it('uses TRUNCATE RESTART IDENTITY outside production', async () => {
    process.env.NODE_ENV = 'development';
    mocks.poolQuery.mockResolvedValueOnce({ rows: [] });

    await JournalQueries.resetJournalDevOnly();

    expect(mocks.poolQuery).toHaveBeenCalledTimes(1);
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      'TRUNCATE TABLE legal_journal RESTART IDENTITY'
    );
  });
});
