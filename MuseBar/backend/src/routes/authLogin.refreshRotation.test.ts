import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { verifyToken } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  poolConnect: vi.fn(),
  lockClientQuery: vi.fn(),
  lockClientRelease: vi.fn(),
  logAction: vi.fn().mockResolvedValue({}),
  getAuthRoleState: vi.fn(),
  findById: vi.fn(),
  findActiveRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
    connect: mocks.poolConnect,
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
    findById: mocks.findById,
  },
}));

vi.mock('../models/refreshToken', () => ({
  RefreshTokenModel: {
    findActiveByRawToken: mocks.findActiveRefreshToken,
    rotate: mocks.rotateRefreshToken,
    create: vi.fn(),
    revokeByRawToken: vi.fn(),
  },
}));

import authLoginRouter from './authLogin';

const app = express();
app.use(express.json());
app.use('/auth', authLoginRouter);
app.use(errorHandler);

describe('POST /auth/refresh token rotation', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.poolConnect.mockReset();
    mocks.lockClientQuery.mockReset();
    mocks.lockClientRelease.mockReset();
    mocks.logAction.mockReset();
    mocks.getAuthRoleState.mockReset();
    mocks.findById.mockReset();
    mocks.findActiveRefreshToken.mockReset();
    mocks.rotateRefreshToken.mockReset();

    mocks.logAction.mockResolvedValue({});
    mocks.getAuthRoleState.mockResolvedValue({
      role: 'establishment_admin',
      establishment_id: '11111111-1111-4111-8111-111111111111',
      is_admin: false,
    });
    mocks.findById.mockResolvedValue({
      id: 10,
      email: 'admin@est.example.com',
    });
    mocks.findActiveRefreshToken.mockResolvedValue({
      user_id: 10,
      family_id: '11111111-1111-4111-8111-111111111111',
    });
    mocks.rotateRefreshToken.mockResolvedValue(undefined);
    mocks.poolConnect.mockResolvedValue({
      query: mocks.lockClientQuery,
      release: mocks.lockClientRelease,
    });
    mocks.lockClientQuery.mockResolvedValue({ rows: [] });
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

  it('reissues access+refresh tokens and rotates refresh session', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', ['musebar_refresh_token=refresh-1'])
      .send({ rememberMe: false });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.refreshToken).toBeUndefined();
    const setCookieHeader = res.headers['set-cookie'] ?? [];
    expect(String(setCookieHeader[0] ?? '')).toContain('musebar_refresh_token=');
    const decoded = verifyToken(res.body.token);
    expect(decoded.role).toBe('establishment_admin');
    expect(decoded.establishment_id).toBe('11111111-1111-4111-8111-111111111111');
    expect(decoded.is_admin).toBeUndefined();

    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'TOKEN_REFRESH',
        user_id: '10',
      })
    );

    expect(mocks.rotateRefreshToken).toHaveBeenCalledWith(
      'refresh-1',
      expect.any(String),
      expect.objectContaining({
        userId: 10,
        familyId: '11111111-1111-4111-8111-111111111111',
      })
    );
    expect(mocks.lockClientQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mocks.lockClientQuery).toHaveBeenNthCalledWith(
      2,
      'SELECT pg_advisory_xact_lock($1::bigint)',
      [10]
    );
    expect(mocks.lockClientQuery).toHaveBeenLastCalledWith('COMMIT');
    expect(mocks.lockClientRelease).toHaveBeenCalled();
  });

  it('returns 400 when refresh token is missing', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ rememberMe: false });

    expect(res.status).toBe(400);
    expect(String(res.body.error?.message)).toContain('refreshToken is required');
  });

  it('rejects unknown refresh tokens', async () => {
    mocks.findActiveRefreshToken.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', ['musebar_refresh_token=missing-token'])
      .send({ rememberMe: false });

    expect(res.status).toBe(401);
    expect(String(res.body.error?.message)).toContain('Invalid or expired refresh token');
  });
});
