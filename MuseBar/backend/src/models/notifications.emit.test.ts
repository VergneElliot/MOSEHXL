import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: { query: mocks.query },
}));

import { NotificationModel } from './notifications';

describe('NotificationModel.emit', () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it('returns existing notification when dedupe key already emitted', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ notification_id: 7 }] });
    const id = await NotificationModel.emit({
      establishmentId: 'est',
      type: 'inbox_message',
      title: 'x',
      dedupeKey: 'inbox:1',
    });
    expect(id).toBe(7);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it('inserts notification and records emission', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 11 }] })
      .mockResolvedValueOnce({ rows: [] });
    const id = await NotificationModel.emit({
      establishmentId: 'est',
      type: 'inbox_message',
      title: 'Nouveau',
      permissionKey: 'access_inbox',
      dedupeKey: 'inbox:2',
    });
    expect(id).toBe(11);
    expect(mocks.query).toHaveBeenCalledTimes(3);
  });
});

describe('NotificationModel.unreadCount audience filter', () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it('queries with permission array for staff', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ c: 2 }] });
    const c = await NotificationModel.unreadCount({
      establishmentId: 'est',
      userId: 5,
      permissions: ['access_inbox'],
      isEstablishmentAdmin: false,
    });
    expect(c).toBe(2);
    expect(mocks.query.mock.calls[0]?.[1]).toEqual(['est', 5, false, ['access_inbox']]);
  });
});
