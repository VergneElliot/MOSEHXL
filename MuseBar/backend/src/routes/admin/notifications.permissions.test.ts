import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { errorHandler } from '../../middleware/errorHandler';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  listForUser: vi.fn(),
  unreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  getUserPermissions: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('../../models/notifications', () => ({
  NotificationModel: {
    listForUser: mocks.listForUser,
    unreadCount: mocks.unreadCount,
    markRead: mocks.markRead,
    markAllRead: mocks.markAllRead,
  },
}));

vi.mock('../../models/user', () => ({
  UserModel: {
    getUserPermissions: mocks.getUserPermissions,
  },
}));

import notificationsRouter from './notifications';

const app = express();
app.use(express.json());
app.use('/admin/notifications', notificationsRouter);
app.use(errorHandler);

function tokenFor(role: 'establishment_admin' | 'staff' = 'staff') {
  return generateToken(
    {
      id: 12,
      email: `${role}@example.com`,
      is_admin: false,
      role,
      establishment_id: EST,
    },
    false
  );
}

describe('admin notifications routes', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.listForUser.mockReset();
    mocks.unreadCount.mockReset();
    mocks.markRead.mockReset();
    mocks.markAllRead.mockReset();
    mocks.getUserPermissions.mockReset();
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) return { rows: [] };
      return { rows: [] };
    });
    mocks.getUserPermissions.mockResolvedValue(['access_inbox']);
    mocks.listForUser.mockResolvedValue([]);
    mocks.unreadCount.mockResolvedValue(0);
    mocks.markRead.mockResolvedValue(true);
    mocks.markAllRead.mockResolvedValue(0);
  });

  it('lists notifications for authenticated account JWT (no PIN required)', async () => {
    const res = await request(app)
      .get('/admin/notifications')
      .set('Authorization', `Bearer ${tokenFor()}`);
    expect(res.status).toBe(200);
    expect(mocks.listForUser).toHaveBeenCalled();
  });

  it('returns unread count', async () => {
    mocks.unreadCount.mockResolvedValue(4);
    const res = await request(app)
      .get('/admin/notifications/unread-count')
      .set('Authorization', `Bearer ${tokenFor()}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(4);
  });

  it('marks one notification read', async () => {
    const res = await request(app)
      .post('/admin/notifications/9/read')
      .set('Authorization', `Bearer ${tokenFor()}`);
    expect(res.status).toBe(200);
    expect(mocks.markRead).toHaveBeenCalledWith(EST, 12, 9);
  });
});
