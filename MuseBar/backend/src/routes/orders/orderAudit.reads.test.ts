import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { errorHandler } from '../../middleware/errorHandler';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getUserPermissions: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
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

vi.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  },
}));

import orderAuditRouter from './orderAudit';

const app = express();
app.use(express.json());
app.use('/audit', orderAuditRouter);
app.use(errorHandler);

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

describe('orderAudit read endpoints', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.getUserPermissions.mockReset();
    mocks.poolQuery.mockImplementation(async (query: unknown, values?: unknown[]) => {
      const sql = String(query ?? '');

      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }

      if (sql.includes('FROM audit_trail')) {
        const resourceId = Array.isArray(values) ? String(values[1]) : '';
        if (resourceId === '123') {
          return {
            rows: [
              {
                id: 1,
                establishment_id: EST,
                user_id: '42',
                action_type: 'ORDER_CREATED',
                resource_type: 'ORDER',
                resource_id: '123',
                timestamp: '2026-04-29T12:00:00.000Z',
              },
              {
                id: 2,
                establishment_id: EST,
                user_id: '42',
                action_type: 'CANCEL_ORDER',
                resource_type: 'ORDER',
                resource_id: '123',
                timestamp: '2026-04-29T12:10:00.000Z',
              },
            ],
          };
        }
        return { rows: [] };
      }

      return { rows: [] };
    });
    mocks.getUserPermissions.mockResolvedValue(['access_pos']);
  });

  it('returns real audit entries for an order id', async () => {
    const res = await request(app)
      .get('/audit/123')
      .set('Authorization', `Bearer ${staffToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.order_id).toBe(123);
    expect(res.body.audit_entries).toHaveLength(2);
    expect(res.body.total_entries).toBe(2);
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM audit_trail'),
      [EST, '123']
    );
  });

  it('denies reading audit entries when user has neither access_pos nor access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);

    const res = await request(app)
      .get('/audit/123')
      .set('Authorization', `Bearer ${staffToken()}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Permission denied');
  });

  it('allows reading audit entries with access_compliance permission', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);

    const res = await request(app)
      .get('/audit/123')
      .set('Authorization', `Bearer ${staffToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.total_entries).toBe(2);
  });

  it('returns computed summary for an order id', async () => {
    const res = await request(app)
      .get('/audit/123/summary')
      .set('Authorization', `Bearer ${staffToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.total_actions).toBe(2);
    expect(res.body.summary.action_types.ORDER_CREATED).toBe(1);
    expect(res.body.summary.action_types.CANCEL_ORDER).toBe(1);
    expect(res.body.summary.user_activity['42']).toBe(2);
    expect(res.body.summary.first_action.id).toBe(1);
    expect(res.body.summary.last_action.id).toBe(2);
  });

  it('returns 400 for invalid order id', async () => {
    const res = await request(app)
      .get('/audit/not-a-number')
      .set('Authorization', `Bearer ${staffToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid order ID');
  });
});
