import { describe, expect, it, vi } from 'vitest';
import { EstablishmentAuditService } from './EstablishmentAuditService';

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
}

describe('EstablishmentAuditService', () => {
  it('createAuditTrail inserts and returns row', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: 'a1', action: 'establishment_created', created_at: new Date() }],
      }),
    };
    const svc = new EstablishmentAuditService(logger() as never);
    const row = await svc.createAuditTrail(client as never, {
      establishment_id: 'est-1',
      user_id: '7',
      action: 'establishment_created',
      details: { name: 'Bar' },
      ip_address: '1.2.3.4',
    });
    expect(row.id).toBe('a1');
    expect(client.query).toHaveBeenCalled();
  });

  it('getEstablishmentAuditTrail / getAuditTrailByAction return pages', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        .mockResolvedValueOnce({ rows: [{ id: '1' }] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: '2' }] }),
    };
    const svc = new EstablishmentAuditService(logger() as never);
    await expect(
      svc.getEstablishmentAuditTrail(client as never, 'est-1', 10, 0)
    ).resolves.toEqual({ entries: [{ id: '1' }], total: 2 });
    await expect(svc.getAuditTrailByAction(client as never, 'login', 5, 0)).resolves.toEqual({
      entries: [{ id: '2' }],
      total: 1,
    });
  });

  it('logEstablishmentCreation delegates to createAuditTrail', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: 'a2', action: 'establishment_created', created_at: new Date() }],
      }),
    };
    const svc = new EstablishmentAuditService(logger() as never);
    const row = await svc.logEstablishmentCreation(
      client as never,
      'est-1',
      '9',
      { name: 'Nouveau', email: 'a@b.com' },
      '127.0.0.1',
      'vitest'
    );
    expect(row.id).toBe('a2');
  });

  it('propagates query failures', async () => {
    const client = { query: vi.fn().mockRejectedValue(new Error('db down')) };
    const svc = new EstablishmentAuditService(logger() as never);
    await expect(
      svc.createAuditTrail(client as never, {
        establishment_id: 'e',
        user_id: '1',
        action: 'x',
        details: {},
      })
    ).rejects.toThrow('db down');
  });
});
