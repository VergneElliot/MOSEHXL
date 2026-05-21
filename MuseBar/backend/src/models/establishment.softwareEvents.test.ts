import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  logSoftwareEventBestEffort: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../services/legal/softwareEventJournal', () => ({
  logSoftwareEventBestEffort: mocks.logSoftwareEventBestEffort,
}));

import { EstablishmentModel } from './establishment';

describe('EstablishmentModel software events', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.logSoftwareEventBestEffort.mockReset();
    mocks.logSoftwareEventBestEffort.mockResolvedValue(undefined);
  });

  it('logs subscription software event when subscription fields are updated', async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [{ id: 'est-9', subscription_plan: 'premium', subscription_status: 'suspended' }],
    });

    await EstablishmentModel.updateEstablishment('est-9', {
      subscription_plan: 'premium',
      subscription_status: 'suspended',
    });

    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith({
      establishmentId: 'est-9',
      eventType: 'ESTABLISHMENT_SUBSCRIPTION_UPDATED',
      eventData: {
        update_type: 'subscription_change',
        subscription_plan: 'premium',
        subscription_status: 'suspended',
      },
    });
  });

  it('does not log subscription software event when non-subscription fields are updated', async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [{ id: 'est-10', name: 'New Name' }],
    });

    await EstablishmentModel.updateEstablishment('est-10', {
      name: 'New Name',
    });

    expect(mocks.logSoftwareEventBestEffort).not.toHaveBeenCalled();
  });
});
