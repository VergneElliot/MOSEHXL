import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  findByEmail: vi.fn(),
  verifyPassword: vi.fn(),
  getAuthLoginDetails: vi.fn(),
  incrementFailedLoginAttempts: vi.fn(),
  applyLoginLockout: vi.fn(),
  clearLoginLockoutState: vi.fn(),
  logAction: vi.fn(),
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
    incrementFailedLoginAttempts: mocks.incrementFailedLoginAttempts,
    applyLoginLockout: mocks.applyLoginLockout,
    clearLoginLockoutState: mocks.clearLoginLockoutState,
  },
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.logAction,
  },
}));

vi.mock('../models/tokenBlocklist', () => ({
  TokenBlocklistModel: {
    revokeAllUserTokensIssuedBefore: vi.fn(),
    revokeToken: vi.fn(),
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

describe('POST /auth/login account lockout', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.findByEmail.mockReset();
    mocks.verifyPassword.mockReset();
    mocks.getAuthLoginDetails.mockReset();
    mocks.incrementFailedLoginAttempts.mockReset();
    mocks.applyLoginLockout.mockReset();
    mocks.clearLoginLockoutState.mockReset();
    mocks.logAction.mockReset();
    mocks.createRefreshToken.mockReset();

    mocks.findByEmail.mockResolvedValue({
      id: 33,
      email: 'staff@est.example.com',
      password_hash: '$2b$12$hash',
      is_admin: false,
      role: 'staff',
      establishment_id: 'est-1',
      is_active: true,
      failed_login_attempts: 0,
      lockout_count: 0,
      locked_until: null,
    });
    mocks.verifyPassword.mockResolvedValue(false);
    mocks.incrementFailedLoginAttempts.mockResolvedValue(1);
    mocks.applyLoginLockout.mockResolvedValue(1);
    mocks.clearLoginLockoutState.mockResolvedValue(undefined);
    mocks.logAction.mockResolvedValue({});
    mocks.createRefreshToken.mockResolvedValue({ id: 'rt-1', familyId: 'fam-1' });
  });

  it('increments failed attempts and rejects invalid credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'staff@est.example.com',
      password: 'WrongPass1!',
      rememberMe: false,
    });

    expect(res.status).toBe(401);
    expect(mocks.incrementFailedLoginAttempts).toHaveBeenCalledWith(33);
    expect(mocks.applyLoginLockout).not.toHaveBeenCalled();
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'LOGIN_FAILED',
        user_id: '33',
      })
    );
  });

  it('locks account once threshold is reached', async () => {
    mocks.incrementFailedLoginAttempts.mockResolvedValueOnce(5);

    const res = await request(app).post('/auth/login').send({
      email: 'staff@est.example.com',
      password: 'WrongPass1!',
      rememberMe: false,
    });

    expect(res.status).toBe(401);
    expect(mocks.applyLoginLockout).toHaveBeenCalledWith(33, expect.any(Date));
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'ACCOUNT_LOCKED',
        user_id: '33',
      })
    );
  });

  it('returns 423 when account is currently locked', async () => {
    mocks.findByEmail.mockResolvedValueOnce({
      id: 33,
      email: 'staff@est.example.com',
      password_hash: '$2b$12$hash',
      is_admin: false,
      role: 'staff',
      establishment_id: 'est-1',
      is_active: true,
      failed_login_attempts: 0,
      lockout_count: 1,
      locked_until: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await request(app).post('/auth/login').send({
      email: 'staff@est.example.com',
      password: 'WrongPass1!',
      rememberMe: false,
    });

    expect(res.status).toBe(423);
    expect(res.body.code).toBe('ACCOUNT_LOCKED');
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.incrementFailedLoginAttempts).not.toHaveBeenCalled();
  });
});
