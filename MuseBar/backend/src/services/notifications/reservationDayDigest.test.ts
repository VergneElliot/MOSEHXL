import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  emit: vi.fn(),
  runWithTenant: vi.fn(async (_ctx: unknown, fn: () => Promise<void>) => fn()),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.query },
}));

vi.mock('../../rls/tenantContext', () => ({
  runWithTenantContext: mocks.runWithTenant,
}));

vi.mock('../../models/notifications', () => ({
  NotificationModel: { emit: mocks.emit },
}));

vi.mock('../../utils/logger', () => ({
  Logger: { getInstance: () => ({ error: vi.fn() }) },
}));

import { emitReservationDayDigests } from './reservationDayDigest';

describe('emitReservationDayDigests', () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.emit.mockReset();
    mocks.emit.mockResolvedValue(1);
  });

  it('skips establishments with zero reservations today', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ id: 'est-1', name: 'Bar' }] })
      .mockResolvedValueOnce({ rows: [{ c: 0 }] });
    const n = await emitReservationDayDigests();
    expect(n).toBe(0);
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('emits digest when count > 0', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ id: 'est-1', name: 'Bar' }] })
      .mockResolvedValueOnce({ rows: [{ c: 3 }] });
    const n = await emitReservationDayDigests();
    expect(n).toBe(1);
    expect(mocks.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reservation_day',
        permissionKey: 'access_reservations',
        title: 'Réservations du jour (3)',
      })
    );
    const key = (mocks.emit.mock.calls[0]?.[0] as { dedupeKey: string }).dedupeKey;
    expect(key).toMatch(/^reservation_day:\d{4}-\d{2}-\d{2}$/);
  });
});
