import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  logSoftwareEvent: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
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
  logError: mocks.loggerError,
}));

import {
  logSoftwareEventFailSafe,
  logSoftwareEventBestEffort,
  logSoftwareEventForAllEstablishmentsFailSafe,
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

  it('throws for critical all-establishments events when enumeration fails', async () => {
    mocks.poolQuery.mockRejectedValue(new Error('db down'));

    await expect(
      logSoftwareEventForAllEstablishmentsBestEffort('SERVER_SHUTDOWN', {
        reason: 'SIGTERM',
      })
    ).rejects.toThrow('db down');

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

  it('retries and throws in fail-safe mode when append keeps failing', async () => {
    mocks.logSoftwareEvent.mockRejectedValue(new Error('journal insert failed'));

    await expect(
      logSoftwareEventFailSafe({
        establishmentId: 'est-1',
        eventType: 'SERVER_STARTED',
        eventData: { node_env: 'production' },
      })
    ).rejects.toThrow('journal insert failed');

    expect(mocks.logSoftwareEvent).toHaveBeenCalledTimes(3);
  });

  it('aggregates failures in fail-safe all-establishments mode', async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [{ id: 'est-1' }, { id: 'est-2' }],
    });
    mocks.logSoftwareEvent
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await expect(
      logSoftwareEventForAllEstablishmentsFailSafe('SERVER_STARTED', {
        node_env: 'production',
      })
    ).rejects.toThrow('failed for 1/2 establishments');
  });
});
