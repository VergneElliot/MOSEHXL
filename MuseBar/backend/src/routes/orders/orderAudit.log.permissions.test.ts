import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getUserPermissions: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock('../../app', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../../models/user', () => ({
  UserModel: {
    getUserPermissions: mocks.getUserPermissions,
  },
}));

vi.mock('../../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.logAction,
    getOrderAuditEntries: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  },
}));

import orderAuditRouter from './orderAudit';

const app = express();
app.use(express.json());
app.use('/audit', orderAuditRouter);

function staffToken() {
  return generateToken(
    {
      id: 42,
      email: 'staff@example.com',
      is_admin: false,
      role: 'staff',
      establishment_id: EST,
    },
    false
  );
}

describe('orderAudit log endpoint permission and identity binding', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.getUserPermissions.mockReset();
    mocks.logAction.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    mocks.logAction.mockResolvedValue({
      id: 1,
      user_id: '42',
      action_type: 'ORDER_CREATED',
      resource_type: 'ORDER',
      resource_id: '123',
    });
  });

  it('denies POST /audit/log when access_pos is missing', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);

    const res = await request(app)
      .post('/audit/log')
      .set('Authorization', `Bearer ${staffToken()}`)
      .send({
        actionType: 'ORDER_CREATED',
        resourceType: 'ORDER',
        resourceId: 123,
        actionDetails: { note: 'x' },
        userId: '999',
      });

    expect(res.status).toBe(403);
    expect(mocks.logAction).not.toHaveBeenCalled();
  });

  it('uses session user id and ignores body userId when access_pos is granted', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_pos']);

    const res = await request(app)
      .post('/audit/log')
      .set('Authorization', `Bearer ${staffToken()}`)
      .send({
        actionType: 'ORDER_CREATED',
        resourceType: 'ORDER',
        resourceId: 123,
        actionDetails: { note: 'x' },
        userId: '999',
      });

    expect(res.status).toBe(201);
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: '42',
        action_type: 'ORDER_CREATED',
        resource_type: 'ORDER',
        resource_id: '123',
      })
    );
  });
});
