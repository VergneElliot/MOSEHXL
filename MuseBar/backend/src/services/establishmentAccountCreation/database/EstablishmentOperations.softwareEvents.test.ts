import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';

const mocks = vi.hoisted(() => ({
  logSoftwareEventBestEffort: vi.fn(),
  auditTrailLogAction: vi.fn(),
}));

vi.mock('../../legal/softwareEventJournal', () => ({
  logSoftwareEventBestEffort: mocks.logSoftwareEventBestEffort,
}));

vi.mock('../../../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.auditTrailLogAction,
  },
}));

import { EstablishmentOperations } from './EstablishmentOperations';

describe('establishment account creation software events', () => {
  beforeEach(() => {
    mocks.logSoftwareEventBestEffort.mockReset();
    mocks.auditTrailLogAction.mockReset();
    mocks.logSoftwareEventBestEffort.mockResolvedValue(undefined);
    mocks.auditTrailLogAction.mockResolvedValue(undefined);
  });

  it('logs status software event after business info completion', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ id: 'est-1', name: 'Blue Cafe', status: 'active' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'bs-1', name: 'Blue Cafe' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const client = { query } as unknown as PoolClient;
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    } as unknown as Logger;

    const ops = new EstablishmentOperations(logger);
    await ops.updateEstablishmentWithBusinessInfo(
      client,
      {
        establishmentId: 'est-1',
        businessInfo: {
          companyName: 'Blue Cafe',
          taxId: 'TAX',
          siretNumber: 'SIRET',
          address: '1 Rue',
          postalCode: '75000',
          city: 'Paris',
          country: 'FR',
          businessType: 'restaurant',
        },
        status: 'active',
      },
      '42'
    );

    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith({
      establishmentId: 'est-1',
      eventType: 'ESTABLISHMENT_STATUS_UPDATED',
      eventData: {
        new_status: 'active',
        update_type: 'business_info_completion',
        source: 'establishment_account_creation',
      },
      userId: '42',
    });
  });

  it('logs status software event after explicit status update', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'est-2' }] });
    const client = { query } as unknown as PoolClient;
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    } as unknown as Logger;

    const ops = new EstablishmentOperations(logger);
    await ops.updateEstablishmentStatus(client, 'est-2', 'suspended', '88');

    expect(mocks.auditTrailLogAction).toHaveBeenCalled();
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalledWith({
      establishmentId: 'est-2',
      eventType: 'ESTABLISHMENT_STATUS_UPDATED',
      eventData: {
        new_status: 'suspended',
        update_type: 'status_change',
        source: 'establishment_account_creation',
      },
      userId: '88',
    });
  });
});
