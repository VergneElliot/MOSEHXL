import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

import { StaffPinSessionModel } from './staffPinSession';

describe('StaffPinSessionModel', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
  });

  it('open coerces non-IP addresses to null', async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [{ id: 's1', establishment_id: 'est-1', user_id: 1 }],
    });
    await StaffPinSessionModel.open({
      establishmentId: 'est-1',
      userId: 1,
      openedByUserId: 2,
      expiresAt: new Date(),
      ipAddress: 'bad-ip',
      userAgent: 'vitest',
    });
    const values = mocks.poolQuery.mock.calls[0][1] as unknown[];
    expect(values[4]).toBeNull();
  });

  it('findActive / touch / close / listActive / closeStale', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ id: 's1' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 's1',
            user_id: 1,
            email: 'ada@example.com',
            full_name: 'Ada Lovelace',
            opened_by_user_id: 2,
            opened_by_email: 'boss@example.com',
            opened_at: new Date('2026-01-01'),
            last_seen_at: new Date('2026-01-02'),
            expires_at: new Date('2026-01-03'),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 2 });

    await expect(StaffPinSessionModel.findActive('s1', 'est-1')).resolves.toEqual({ id: 's1' });
    await StaffPinSessionModel.touch('s1', 'est-1');
    expect(mocks.poolQuery.mock.calls[1][0]).toContain('last_seen_at');

    await expect(StaffPinSessionModel.close('s1', 'est-1', 'logout')).resolves.toBe(true);
    await expect(StaffPinSessionModel.listActive('est-1')).resolves.toEqual([
      expect.objectContaining({ id: 's1', display_name: 'Ada Lovelace', email: 'ada@example.com' }),
    ]);
    await expect(StaffPinSessionModel.closeStale('est-1')).resolves.toBe(2);
  });

  it('findActiveForUser / touchAndExtend / closeAllForEstablishment', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ id: 's2' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 3 });

    await expect(StaffPinSessionModel.findActiveForUser('est-1', 9)).resolves.toEqual({ id: 's2' });
    await expect(
      StaffPinSessionModel.touchAndExtend('s2', 'est-1', new Date('2026-12-01T00:00:00Z'))
    ).resolves.toBe(true);
    await expect(StaffPinSessionModel.closeAllForEstablishment('est-1', 'wipe')).resolves.toBe(3);
  });
});
