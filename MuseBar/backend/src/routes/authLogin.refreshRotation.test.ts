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
  getRefreshFamilyIssuedAt: vi.fn(),
  rotateRefreshToken: vi.fn(),
  revokeRefreshFamily: vi.fn(),
  revokeAllRefreshTokensForUser: vi.fn(),
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
    getFamilyIssuedAt: mocks.getRefreshFamilyIssuedAt,
    rotate: mocks.rotateRefreshToken,
    revokeFamily: mocks.revokeRefreshFamily,
    revokeAllForUser: mocks.revokeAllRefreshTokensForUser,
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
  const REFRESH_COOKIE = 'musebar_refresh_token=refresh-1';
  const CSRF_COOKIE = 'musebar_csrf_token=csrf-1';
  const CSRF_HEADER = { 'x-csrf-token': 'csrf-1' };

  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.poolConnect.mockReset();
    mocks.lockClientQuery.mockReset();
    mocks.lockClientRelease.mockReset();
    mocks.logAction.mockReset();
    mocks.getAuthRoleState.mockReset();
    mocks.findById.mockReset();
    mocks.findActiveRefreshToken.mockReset();
    mocks.getRefreshFamilyIssuedAt.mockReset();
    mocks.rotateRefreshToken.mockReset();
    mocks.revokeRefreshFamily.mockReset();
    mocks.revokeAllRefreshTokensForUser.mockReset();

    mocks.logAction.mockResolvedValue({});
    mocks.getAuthRoleState.mockResolvedValue({
      role: 'establishment_admin',
      establishment_id: '11111111-1111-4111-8111-111111111111',
      is_admin: false,
    });
    mocks.findById.mockResolvedValue({
      id: 10,
      email: 'admin@est.example.com',
      is_active: true,
      locked_until: null,
    });
    mocks.findActiveRefreshToken.mockResolvedValue({
      user_id: 10,
      family_id: '11111111-1111-4111-8111-111111111111',
      issued_at: new Date(),
    });
    mocks.getRefreshFamilyIssuedAt.mockResolvedValue(new Date());
    mocks.rotateRefreshToken.mockResolvedValue(undefined);
    mocks.revokeRefreshFamily.mockResolvedValue(undefined);
    mocks.revokeAllRefreshTokensForUser.mockResolvedValue(undefined);
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
      .set('Cookie', [REFRESH_COOKIE, CSRF_COOKIE])
      .set(CSRF_HEADER)
      .send({ rememberMe: false });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.refreshToken).toBeUndefined();
    const setCookieHeader = res.headers['set-cookie'] ?? [];
    expect(setCookieHeader.some((value: string) => value.includes('musebar_refresh_token='))).toBe(true);
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
    expect(String(res.body.error?.message)).toContain('Refresh token cookie is required');
  });

  it('returns 400 when refresh token is provided only in body', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ rememberMe: false, refreshToken: 'body-only-token' });

    expect(res.status).toBe(400);
    expect(String(res.body.error?.message)).toContain('Refresh token cookie is required');
    expect(mocks.findActiveRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects unknown refresh tokens', async () => {
    mocks.findActiveRefreshToken.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', ['musebar_refresh_token=missing-token', CSRF_COOKIE])
      .set(CSRF_HEADER)
      .send({ rememberMe: false });

    expect(res.status).toBe(401);
    expect(String(res.body.error?.message)).toContain('Invalid or expired refresh token');
  });

  it('returns 400 when CSRF token is missing', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [REFRESH_COOKIE])
      .send({ rememberMe: false });

    expect(res.status).toBe(400);
    expect(String(res.body.error?.message)).toContain('CSRF token is required');
  });

  it('returns 401 when CSRF token is invalid', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [REFRESH_COOKIE, CSRF_COOKIE])
      .set('x-csrf-token', 'wrong-csrf')
      .send({ rememberMe: false });

    expect(res.status).toBe(401);
    expect(String(res.body.error?.message)).toContain('Invalid CSRF token');
  });

  it('revokes token family when refresh rotation detects reuse', async () => {
    mocks.rotateRefreshToken.mockRejectedValueOnce(new Error('REFRESH_TOKEN_ALREADY_USED_OR_EXPIRED'));

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [REFRESH_COOKIE, CSRF_COOKIE])
      .set(CSRF_HEADER)
      .send({ rememberMe: false });

    expect(res.status).toBe(401);
    expect(String(res.body.error?.message)).toContain('Invalid or expired refresh token');
    expect(mocks.revokeRefreshFamily).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'REUSE_DETECTED'
    );
  });

  it('expires refresh session when absolute cap is reached', async () => {
    const longAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    mocks.getRefreshFamilyIssuedAt.mockResolvedValueOnce(longAgo);

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [REFRESH_COOKIE, CSRF_COOKIE])
      .set(CSRF_HEADER)
      .send({ rememberMe: true });

    expect(res.status).toBe(401);
    expect(String(res.body.error?.message)).toContain('Session expired. Please log in again.');
    expect(mocks.revokeRefreshFamily).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'ABSOLUTE_SESSION_CAP_REACHED'
    );
    expect(mocks.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('blocks refresh for inactive users and revokes refresh sessions', async () => {
    mocks.findById.mockResolvedValueOnce({
      id: 10,
      email: 'admin@est.example.com',
      is_active: false,
      locked_until: null,
    });

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [REFRESH_COOKIE, CSRF_COOKIE])
      .set(CSRF_HEADER)
      .send({ rememberMe: false });

    expect(res.status).toBe(403);
    expect(String(res.body.error?.message)).toContain('Account is inactive');
    expect(mocks.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(10, 'USER_INACTIVE_REFRESH_BLOCK');
    expect(mocks.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('blocks refresh for locked users and revokes refresh sessions', async () => {
    const lockedUntil = new Date(Date.now() + 60_000);
    mocks.findById.mockResolvedValueOnce({
      id: 10,
      email: 'admin@est.example.com',
      is_active: true,
      locked_until: lockedUntil,
    });

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [REFRESH_COOKIE, CSRF_COOKIE])
      .set(CSRF_HEADER)
      .send({ rememberMe: false });

    expect(res.status).toBe(403);
    expect(String(res.body.error?.message)).toContain('Account is locked');
    expect(mocks.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(10, 'ACCOUNT_LOCKED_REFRESH_BLOCK');
    expect(mocks.rotateRefreshToken).not.toHaveBeenCalled();
  });
});
