import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  verifyIntegrity: vi.fn(),
  getUserPermissions: vi.fn(),
  poolQuery: vi.fn(),
}));

vi.mock('../../app', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  },
}));

vi.mock('../../models/legalJournal', () => ({
  __esModule: true,
  default: {
    verifyJournalIntegrity: mocks.verifyIntegrity,
    getEntriesForOrder: vi.fn().mockResolvedValue([]),
    addEntry: vi.fn(),
  },
}));

vi.mock('../../models', () => ({
  OrderModel: {
    getById: vi.fn(),
  },
}));

vi.mock('../../models/user', () => ({
  UserModel: {
    getUserPermissions: mocks.getUserPermissions,
  },
}));

import orderLegalRouter from './orderLegal';

const app = express();
app.use(express.json());
app.use('/legal', orderLegalRouter);

function tokenFor(role: 'establishment_admin' | 'staff') {
  return generateToken(
    {
      id: role === 'staff' ? 13 : 7,
      email: `${role}@example.com`,
      is_admin: false,
      role,
      establishment_id: EST,
    },
    false
  );
}

describe('orderLegal permission gating', () => {
  beforeEach(() => {
    mocks.verifyIntegrity.mockReset();
    mocks.getUserPermissions.mockReset();
    mocks.poolQuery.mockReset();

    mocks.verifyIntegrity.mockResolvedValue({ isValid: true, errors: [] });
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });
  });

  it('returns 403 on compliance endpoint when access_compliance permission is missing', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);

    const res = await request(app)
      .get('/legal/compliance/12')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
    expect(mocks.verifyIntegrity).not.toHaveBeenCalled();
  });

  it('allows compliance endpoint when access_compliance permission is present', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);

    const res = await request(app)
      .get('/legal/compliance/12')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.verifyIntegrity).toHaveBeenCalledWith(EST);
  });
});
