import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';

const mocks = vi.hoisted(() => ({
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
  logSoftwareEventBestEffort: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({
      info: mocks.loggerInfo,
      error: mocks.loggerError,
    }),
  },
}));

vi.mock('../legal/softwareEventJournal', () => ({
  logSoftwareEventBestEffort: mocks.logSoftwareEventBestEffort,
}));

import { EstablishmentOperations } from './establishmentOperations';

describe('setup establishment operations software events', () => {
  beforeEach(() => {
    mocks.loggerInfo.mockReset();
    mocks.loggerError.mockReset();
    mocks.logSoftwareEventBestEffort.mockReset();
    mocks.logSoftwareEventBestEffort.mockResolvedValue(undefined);
  });

  it('logs status software event when establishment is activated', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;

    await EstablishmentOperations.activateEstablishment(client, 'est-setup-1');

    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith({
      establishmentId: 'est-setup-1',
      eventType: 'ESTABLISHMENT_STATUS_UPDATED',
      eventData: {
        new_status: 'active',
        update_type: 'setup_activation',
        source: 'setup_service',
      },
    });
  });
});
