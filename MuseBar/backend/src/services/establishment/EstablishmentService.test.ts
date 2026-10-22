import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  initialize: vi.fn(),
  createEstablishment: vi.fn(),
  deleteEstablishment: vi.fn(),
  logAction: vi.fn(),
  sendTemplateEmail: vi.fn(),
  getEmailInstance: vi.fn(),
  getEnv: vi.fn(() => ({})),
  resolveFrontend: vi.fn(() => 'https://app.test'),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('../../models/establishment', () => ({
  EstablishmentModel: {
    initialize: mocks.initialize,
    createEstablishment: mocks.createEstablishment,
    deleteEstablishment: mocks.deleteEstablishment,
  },
}));

vi.mock('../../models/auditTrail', () => ({
  AuditTrailModel: { logAction: mocks.logAction },
}));

vi.mock('../email', () => ({
  EmailService: { getInstance: mocks.getEmailInstance },
}));

vi.mock('../../config/environment', () => ({
  getEnvironmentConfig: mocks.getEnv,
}));

vi.mock('../../utils/frontendBaseUrl', () => ({
  resolveFrontendBaseUrl: mocks.resolveFrontend,
}));

import { EstablishmentService } from './EstablishmentService';

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('EstablishmentService', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) (fn as ReturnType<typeof vi.fn>).mockReset();
    });
    mocks.getEnv.mockReturnValue({});
    mocks.resolveFrontend.mockReturnValue('https://app.test');
    mocks.getEmailInstance.mockReturnValue({ sendTemplateEmail: mocks.sendTemplateEmail });
    mocks.sendTemplateEmail.mockResolvedValue(undefined);
    mocks.logAction.mockResolvedValue(undefined);
  });

  it('getAllEstablishments returns rows + total', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ id: '1' }, { id: '2' }] });
    const svc = new EstablishmentService(logger() as never);
    await expect(svc.getAllEstablishments()).resolves.toEqual({
      establishments: [{ id: '1' }, { id: '2' }],
      total: 2,
    });
  });

  it('getEstablishmentById returns establishment and invitations', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'est-1', name: 'Bar' }] })
      .mockResolvedValueOnce({ rows: [{ email: 'a@b.com' }] });
    const svc = new EstablishmentService(logger() as never);
    await expect(svc.getEstablishmentById('est-1')).resolves.toEqual({
      establishment: { id: 'est-1', name: 'Bar' },
      invitations: [{ email: 'a@b.com' }],
    });
  });

  it('getEstablishmentById throws when missing', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [] });
    const svc = new EstablishmentService(logger() as never);
    await expect(svc.getEstablishmentById('missing')).rejects.toThrow('Establishment not found');
  });

  it('deleteEstablishment delegates to model', async () => {
    mocks.deleteEstablishment.mockResolvedValue(undefined);
    const svc = new EstablishmentService(logger() as never);
    await svc.deleteEstablishment('est-1');
    expect(mocks.initialize).toHaveBeenCalled();
    expect(mocks.deleteEstablishment).toHaveBeenCalledWith('est-1');
  });

  it('createEstablishment validates, creates, invites, and emails', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [] }) // name uniqueness
      .mockResolvedValueOnce({ rows: [] }) // update tax fields
      .mockResolvedValueOnce({ rows: [] }); // invitation insert
    mocks.createEstablishment.mockResolvedValue({
      id: 'est-new',
      name: 'Nouveau',
      email: 'owner@example.com',
    });

    const svc = new EstablishmentService(logger() as never);
    const result = await svc.createEstablishment(
      {
        name: 'Nouveau',
        phone: '0102030405',
        address: '1 rue',
        owner_email: 'owner@example.com',
        tva_number: 'FR1',
        siret_number: '123',
      },
      '42'
    );

    expect(result.establishment.id).toBe('est-new');
    expect(mocks.createEstablishment).toHaveBeenCalled();
    expect(mocks.logAction).toHaveBeenCalled();
    expect(mocks.sendTemplateEmail).toHaveBeenCalledWith(
      'establishment_setup',
      'owner@example.com',
      expect.objectContaining({ establishmentName: 'Nouveau' })
    );
  });

  it('createEstablishment rejects missing fields and duplicate names', async () => {
    const svc = new EstablishmentService(logger() as never);
    await expect(
      svc.createEstablishment(
        { name: '', phone: '', address: '', owner_email: '' } as never,
        '1'
      )
    ).rejects.toThrow(/Missing required fields/);

    await expect(
      svc.createEstablishment(
        {
          name: 'X',
          phone: '1',
          address: '2',
          owner_email: 'bad',
        },
        '1'
      )
    ).rejects.toThrow(/Invalid email/);

    mocks.poolQuery.mockResolvedValue({ rows: [{ id: 'exists' }] });
    await expect(
      svc.createEstablishment(
        {
          name: 'Dup',
          phone: '1',
          address: '2',
          owner_email: 'a@b.com',
        },
        '1'
      )
    ).rejects.toThrow(/already exists/);
  });
});
