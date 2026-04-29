import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../middleware/auth';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  logAction: vi.fn().mockResolvedValue({}),
  getAuthRoleState: vi.fn(),
}));

vi.mock('../app', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.logAction,
  },
}));

vi.mock('../models/user', () => ({
  UserModel: {
    getAuthRoleState: mocks.getAuthRoleState,
  },
}));

import authLoginRouter from './authLogin';

const app = express();
app.use(express.json());
app.use('/auth', authLoginRouter);

function establishmentAdminToken() {
  return generateToken(
    {
      id: 10,
      email: 'admin@est.example.com',
      is_admin: false,
      role: 'establishment_admin',
      establishment_id: '11111111-1111-4111-8111-111111111111',
    },
    false
  );
}

describe('POST /auth/refresh token rotation', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.logAction.mockReset();
    mocks.getAuthRoleState.mockReset();

    mocks.logAction.mockResolvedValue({});
    mocks.getAuthRoleState.mockResolvedValue({
      role: 'establishment_admin',
      establishment_id: '11111111-1111-4111-8111-111111111111',
      is_admin: false,
    });
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });
  });

  it('reissues token and revokes the current bearer token', async () => {
    const currentToken = establishmentAdminToken();
    const res = await request(app)
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${currentToken}`)
      .send({ rememberMe: false });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token).not.toBe(currentToken);

    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'TOKEN_REFRESH',
        user_id: '10',
      })
    );

    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO token_blocklist'),
      expect.arrayContaining([10, 'TOKEN_REFRESH_ROTATED'])
    );
  });
});
