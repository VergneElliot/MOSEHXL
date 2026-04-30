import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  logSoftwareEvent: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('../../app', () => ({
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../../models/legalJournal', () => ({
  __esModule: true,
  default: {
    logSoftwareEvent: mocks.logSoftwareEvent,
  },
}));

vi.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({
      error: mocks.loggerError,
    }),
  },
}));

import {
  logSoftwareEventBestEffort,
  logSoftwareEventForAllEstablishmentsBestEffort,
} from './softwareEventJournal';

describe('softwareEventJournal runtime helpers', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.logSoftwareEvent.mockReset();
    mocks.loggerError.mockReset();
    mocks.logSoftwareEvent.mockResolvedValue({});
  });

  it('logs software event for all establishments returned by query', async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [{ id: 'est-1' }, { id: 'est-2' }],
    });

    await logSoftwareEventForAllEstablishmentsBestEffort('SERVER_STARTED', {
      node_env: 'production',
    });

    expect(mocks.poolQuery).toHaveBeenCalledWith('SELECT id FROM establishments');
    expect(mocks.logSoftwareEvent).toHaveBeenNthCalledWith(
      1,
      'est-1',
      'SERVER_STARTED',
      { node_env: 'production' },
      undefined
    );
    expect(mocks.logSoftwareEvent).toHaveBeenNthCalledWith(
      2,
      'est-2',
      'SERVER_STARTED',
      { node_env: 'production' },
      undefined
    );
  });

  it('does not throw when establishment enumeration query fails', async () => {
    mocks.poolQuery.mockRejectedValue(new Error('db down'));

    await expect(
      logSoftwareEventForAllEstablishmentsBestEffort('SERVER_SHUTDOWN', {
        reason: 'SIGTERM',
      })
    ).resolves.toBeUndefined();

    expect(mocks.loggerError).toHaveBeenCalled();
    expect(mocks.logSoftwareEvent).not.toHaveBeenCalled();
  });

  it('does not throw when single-establishment software event append fails', async () => {
    mocks.logSoftwareEvent.mockRejectedValue(new Error('journal insert failed'));

    await expect(
      logSoftwareEventBestEffort({
        establishmentId: 'est-1',
        eventType: 'HAPPY_HOUR_SETTINGS_UPDATED',
        eventData: { isEnabled: false },
        userId: '22',
      })
    ).resolves.toBeUndefined();

    expect(mocks.loggerError).toHaveBeenCalled();
  });
});
