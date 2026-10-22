import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logAction: vi.fn(),
  logSoftware: vi.fn(),
}));

vi.mock('../../../models/auditTrail', () => ({
  AuditTrailModel: { logAction: mocks.logAction },
}));

vi.mock('../../legal/softwareEventJournal', () => ({
  logSoftwareEventBestEffort: mocks.logSoftware,
}));

import { EstablishmentOperations } from './EstablishmentOperations';

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

describe('EstablishmentOperations', () => {
  beforeEach(() => {
    mocks.logAction.mockReset().mockResolvedValue({});
    mocks.logSoftware.mockReset().mockResolvedValue(undefined);
  });

  it('sanitizeBusinessInfo trims and normalizes business type aliases', () => {
    const ops = new EstablishmentOperations(logger() as never);
    expect(
      ops.sanitizeBusinessInfo({
        companyName: '  Café  ',
        taxId: ' x ',
        siretNumber: ' 1 ',
        address: ' 12 rue ',
        postalCode: ' 75001 ',
        city: ' Paris ',
        country: ' FR ',
        businessType: 'Café',
      })
    ).toMatchObject({
      companyName: 'Café',
      businessType: 'cafe',
      city: 'Paris',
    });
    expect(
      ops.sanitizeBusinessInfo({
        companyName: '',
        taxId: '',
        siretNumber: '',
        address: '',
        postalCode: '',
        city: '',
        country: '',
        businessType: 'Brasserie',
      }).businessType
    ).toBe('restaurant');
  });

  it('getEstablishmentStatus returns exists false/true', async () => {
    const ops = new EstablishmentOperations(logger() as never);
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    await expect(ops.getEstablishmentStatus(client as never, 'missing')).resolves.toEqual({
      exists: false,
    });

    client.query.mockResolvedValue({ rows: [{ id: 'e1', status: 'active', name: 'Bar' }] });
    await expect(ops.getEstablishmentStatus(client as never, 'e1')).resolves.toEqual({
      exists: true,
      status: 'active',
      name: 'Bar',
    });
  });

  it('updateEstablishmentStatus updates row or throws', async () => {
    const ops = new EstablishmentOperations(logger() as never);
    const client = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'e1' }] }) };
    await expect(
      ops.updateEstablishmentStatus(client as never, 'e1', 'active', '7')
    ).resolves.toBeUndefined();
    expect(mocks.logAction).toHaveBeenCalled();

    client.query.mockResolvedValue({ rows: [] });
    await expect(
      ops.updateEstablishmentStatus(client as never, 'missing', 'active', '7')
    ).rejects.toThrow(/not found/);
  });
});
