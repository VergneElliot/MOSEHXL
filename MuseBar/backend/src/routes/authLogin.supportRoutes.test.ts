import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  logAction: vi.fn(),
  revokeToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  __esModule: true,
  pool: {
    query: vi.fn(),
  },
}));

vi.mock('../middleware/auth', () => ({
  generateToken: vi.fn(() => 'signed-token'),
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: unknown }).user = {
      id: 42,
      email: 'admin@example.com',
      role: 'system_admin',
      establishment_id: null,
    };
    next();
  },
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.logAction,
  },
}));

vi.mock('../models/tokenBlocklist', () => ({
  TokenBlocklistModel: {
    revokeToken: mocks.revokeToken,
  },
}));

vi.mock('../models/refreshToken', () => ({
  RefreshTokenModel: {
    listActiveSessionsByUser: vi.fn(),
    revokeByRawToken: mocks.revokeRefreshToken,
  },
}));

vi.mock('../models/user', () => ({
  UserModel: {
    getAuthRoleState: vi.fn(),
    getMfaTotpState: vi.fn(),
  },
}));

vi.mock('speakeasy', () => ({
  default: {
    totp: {
      verify: vi.fn(),
    },
  },
}));

import supportRoutes from './authLogin/supportRoutes';

const app = express();
app.use(express.json());
app.use('/', supportRoutes);
app.use(errorHandler);

describe('auth supportRoutes logout endpoint', () => {
  beforeEach(() => {
    mocks.logAction.mockReset();
    mocks.revokeToken.mockReset();
    mocks.revokeRefreshToken.mockReset();

    mocks.logAction.mockResolvedValue({});
    mocks.revokeToken.mockResolvedValue(undefined);
    mocks.revokeRefreshToken.mockResolvedValue(undefined);
  });

  it('revokes access and refresh tokens, clears cookies, and audits logout', async () => {
    const res = await request(app)
      .post('/logout')
      .set('Authorization', 'Bearer access-token')
      .set('Cookie', ['musebar_refresh_token=refresh-token'])
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Logged out' });
    expect(mocks.revokeToken).toHaveBeenCalledWith('access-token', {
      userId: 42,
      reason: 'LOGOUT',
    });
    expect(mocks.revokeRefreshToken).toHaveBeenCalledWith('refresh-token', 'LOGOUT');
    expect(mocks.logAction).toHaveBeenCalledWith(expect.objectContaining({
      user_id: '42',
      action_type: 'LOGOUT',
    }));

    const setCookieHeader = res.headers['set-cookie'] ?? [];
    expect(setCookieHeader.some((value: string) => value.startsWith('musebar_refresh_token=;'))).toBe(true);
    expect(setCookieHeader.some((value: string) => value.startsWith('musebar_csrf_token=;'))).toBe(true);
  });
});
