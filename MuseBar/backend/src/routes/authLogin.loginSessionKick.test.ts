import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  findByEmail: vi.fn(),
  verifyPassword: vi.fn(),
  getAuthLoginDetails: vi.fn(),
  clearLoginLockoutState: vi.fn(),
  incrementFailedLoginAttempts: vi.fn(),
  applyLoginLockout: vi.fn(),
  logAction: vi.fn(),
  revokeAllUserTokensIssuedBefore: vi.fn(),
  revokeToken: vi.fn(),
  createRefreshToken: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
    connect: vi.fn(),
  },
}));

vi.mock('../models/user', () => ({
  UserModel: {
    findByEmail: mocks.findByEmail,
    verifyPassword: mocks.verifyPassword,
    getAuthLoginDetails: mocks.getAuthLoginDetails,
    clearLoginLockoutState: mocks.clearLoginLockoutState,
    incrementFailedLoginAttempts: mocks.incrementFailedLoginAttempts,
    applyLoginLockout: mocks.applyLoginLockout,
  },
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.logAction,
  },
}));

vi.mock('../models/tokenBlocklist', () => ({
  TokenBlocklistModel: {
    revokeAllUserTokensIssuedBefore: mocks.revokeAllUserTokensIssuedBefore,
    revokeToken: mocks.revokeToken,
  },
}));

vi.mock('../models/refreshToken', () => ({
  RefreshTokenModel: {
    create: mocks.createRefreshToken,
    findActiveByRawToken: vi.fn(),
    rotate: vi.fn(),
    revokeByRawToken: vi.fn(),
  },
}));

import authLoginRouter from './authLogin';

const app = express();
app.use(express.json());
app.use('/auth', authLoginRouter);

describe('POST /auth/login optional kickPriorSessions', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.findByEmail.mockReset();
    mocks.verifyPassword.mockReset();
    mocks.getAuthLoginDetails.mockReset();
    mocks.clearLoginLockoutState.mockReset();
    mocks.incrementFailedLoginAttempts.mockReset();
    mocks.applyLoginLockout.mockReset();
    mocks.logAction.mockReset();
    mocks.revokeAllUserTokensIssuedBefore.mockReset();
    mocks.revokeToken.mockReset();
    mocks.createRefreshToken.mockReset();

    mocks.findByEmail.mockResolvedValue({
      id: 10,
      email: 'admin@est.example.com',
      password_hash: '$2b$12$hash',
      is_admin: false,
      role: 'establishment_admin',
      establishment_id: '11111111-1111-4111-8111-111111111111',
      first_name: 'Admin',
      last_name: 'User',
      email_verified: true,
      is_active: true,
      failed_login_attempts: 0,
      lockout_count: 0,
      locked_until: null,
      last_login: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.getAuthLoginDetails.mockResolvedValue({
      first_name: 'Admin',
      last_name: 'User',
      role: 'establishment_admin',
      establishment_id: '11111111-1111-4111-8111-111111111111',
      is_admin: false,
      email_verified: true,
    });
    mocks.logAction.mockResolvedValue({});
    mocks.clearLoginLockoutState.mockResolvedValue(undefined);
    mocks.incrementFailedLoginAttempts.mockResolvedValue(1);
    mocks.applyLoginLockout.mockResolvedValue(1);
    mocks.revokeAllUserTokensIssuedBefore.mockResolvedValue(undefined);
    mocks.revokeToken.mockResolvedValue(undefined);
    mocks.createRefreshToken.mockResolvedValue({ id: 'rt-1', familyId: 'fam-1' });
  });

  it('does not revoke prior sessions by default', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'admin@est.example.com',
      password: 'TopSecret123!',
      rememberMe: false,
    });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.refreshToken).toBeUndefined();
    const setCookieHeader = res.headers['set-cookie'] ?? [];
    expect(Array.isArray(setCookieHeader)).toBe(true);
    expect(String(setCookieHeader[0] ?? '')).toContain('musebar_refresh_token=');
    expect(mocks.revokeAllUserTokensIssuedBefore).not.toHaveBeenCalled();
    expect(mocks.createRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('revokes prior sessions when kickPriorSessions is true', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'admin@est.example.com',
      password: 'TopSecret123!',
      rememberMe: false,
      kickPriorSessions: true,
    });

    expect(res.status).toBe(200);
    expect(res.body.refreshToken).toBeUndefined();
    expect(mocks.revokeAllUserTokensIssuedBefore).toHaveBeenCalledWith(
      10,
      expect.any(Number),
      'LOGIN_KICK_PRIOR_SESSIONS'
    );
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'LOGIN',
        action_details: expect.objectContaining({
          kickPriorSessions: true,
        }),
      })
    );
  });
});
