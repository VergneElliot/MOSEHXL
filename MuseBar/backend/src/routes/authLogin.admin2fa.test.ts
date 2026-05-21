import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
  getMfaTotpState: vi.fn(),
  logAction: vi.fn(),
  createRefreshToken: vi.fn(),
  totpCheck: vi.fn(),
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
    getMfaTotpState: mocks.getMfaTotpState,
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

vi.mock('otplib', () => ({
  verifySync: mocks.totpCheck,
  generateSecret: vi.fn(() => 'SECRET'),
  generateURI: vi.fn(() => 'otpauth://example'),
}));

import authLoginRouter from './authLogin';

const app = express();
app.use(express.json());
app.use('/auth', authLoginRouter);

describe('POST /auth/login admin 2FA enforcement', () => {
  const previousEnforceFlag = process.env.AUTH_ENFORCE_ADMIN_2FA;

  beforeEach(() => {
    process.env.AUTH_ENFORCE_ADMIN_2FA = 'true';
    mocks.poolQuery.mockReset();
    mocks.findByEmail.mockReset();
    mocks.verifyPassword.mockReset();
    mocks.getAuthLoginDetails.mockReset();
    mocks.clearLoginLockoutState.mockReset();
    mocks.incrementFailedLoginAttempts.mockReset();
    mocks.applyLoginLockout.mockReset();
    mocks.getMfaTotpState.mockReset();
    mocks.logAction.mockReset();
    mocks.createRefreshToken.mockReset();
    mocks.totpCheck.mockReset();

    mocks.findByEmail.mockResolvedValue({
      id: 9,
      email: 'admin@est.example.com',
      password_hash: '$2b$12$hash',
      is_admin: false,
      role: 'establishment_admin',
      establishment_id: '11111111-1111-4111-8111-111111111111',
      is_active: true,
      failed_login_attempts: 0,
      lockout_count: 0,
      locked_until: null,
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
    mocks.clearLoginLockoutState.mockResolvedValue(undefined);
    mocks.incrementFailedLoginAttempts.mockResolvedValue(1);
    mocks.applyLoginLockout.mockResolvedValue(1);
    mocks.logAction.mockResolvedValue({});
    mocks.createRefreshToken.mockResolvedValue({ id: 'rt-1', familyId: 'fam-1' });
  });

  afterAll(() => {
    process.env.AUTH_ENFORCE_ADMIN_2FA = previousEnforceFlag;
  });

  it('blocks admin login when 2FA setup is missing', async () => {
    mocks.getMfaTotpState.mockResolvedValueOnce({
      mfa_totp_enabled: false,
      mfa_totp_secret: null,
    });

    const res = await request(app).post('/auth/login').send({
      email: 'admin@est.example.com',
      password: 'TopSecret123!',
      rememberMe: false,
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ADMIN_2FA_SETUP_REQUIRED');
    expect(mocks.createRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects admin login when TOTP code is invalid', async () => {
    mocks.getMfaTotpState.mockResolvedValueOnce({
      mfa_totp_enabled: true,
      mfa_totp_secret: 'SECRET',
    });
    mocks.totpCheck.mockReturnValueOnce({ valid: false });

    const res = await request(app).post('/auth/login').send({
      email: 'admin@est.example.com',
      password: 'TopSecret123!',
      rememberMe: false,
      totpCode: '000000',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_2FA_CODE');
    expect(mocks.createRefreshToken).not.toHaveBeenCalled();
  });
});
