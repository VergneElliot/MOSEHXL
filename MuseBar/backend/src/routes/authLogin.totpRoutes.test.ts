import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  setMfaTotpSecret: vi.fn(),
  getMfaTotpState: vi.fn(),
  enableMfaTotp: vi.fn(),
  verifyPassword: vi.fn(),
  disableMfaTotp: vi.fn(),
  logAction: vi.fn(),
  totpVerify: vi.fn(),
  qrCodeToDataUrl: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: unknown }).user = {
      id: 42,
      email: 'admin@example.com',
      role: 'establishment_admin',
      establishment_id: 'est-1',
    };
    next();
  },
}));

vi.mock('../models/user', () => ({
  UserModel: {
    findById: mocks.findById,
    setMfaTotpSecret: mocks.setMfaTotpSecret,
    getMfaTotpState: mocks.getMfaTotpState,
    enableMfaTotp: mocks.enableMfaTotp,
    verifyPassword: mocks.verifyPassword,
    disableMfaTotp: mocks.disableMfaTotp,
  },
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.logAction,
  },
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: mocks.qrCodeToDataUrl,
  },
}));

vi.mock('speakeasy', () => ({
  default: {
    generateSecret: vi.fn(() => ({
      base32: 'SECRET',
      otpauth_url: 'otpauth://example',
    })),
    totp: {
      verify: mocks.totpVerify,
    },
  },
}));

import totpRoutes from './authLogin/totpRoutes';

const app = express();
app.use(express.json());
app.use('/2fa/totp', totpRoutes);
app.use(errorHandler);

describe('auth TOTP management routes', () => {
  beforeEach(() => {
    mocks.findById.mockReset();
    mocks.setMfaTotpSecret.mockReset();
    mocks.getMfaTotpState.mockReset();
    mocks.enableMfaTotp.mockReset();
    mocks.verifyPassword.mockReset();
    mocks.disableMfaTotp.mockReset();
    mocks.logAction.mockReset();
    mocks.totpVerify.mockReset();
    mocks.qrCodeToDataUrl.mockReset();

    mocks.findById.mockResolvedValue({
      id: 42,
      email: 'admin@example.com',
      role: 'establishment_admin',
      is_admin: false,
      establishment_id: 'est-1',
      mfa_totp_enabled: false,
      mfa_totp_secret: null,
    });
    mocks.logAction.mockResolvedValue({});
    mocks.qrCodeToDataUrl.mockResolvedValue('data:image/png;base64,qr');
  });

  it('returns TOTP status for the authenticated user', async () => {
    const res = await request(app).get('/2fa/totp/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      enabled: false,
      required_for_role: false,
      role: 'establishment_admin',
    });
    expect(mocks.findById).toHaveBeenCalledWith(42);
  });

  it('starts TOTP setup and persists the generated secret', async () => {
    const res = await request(app).post('/2fa/totp/setup').send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      secret: 'SECRET',
      otpauthUrl: 'otpauth://example',
      qrCodeDataUrl: 'data:image/png;base64,qr',
    });
    expect(mocks.setMfaTotpSecret).toHaveBeenCalledWith(42, 'SECRET');
    expect(mocks.logAction).toHaveBeenCalledWith(expect.objectContaining({
      action_type: 'MFA_TOTP_SETUP_STARTED',
    }));
  });

  it('enables TOTP after a valid code', async () => {
    mocks.getMfaTotpState.mockResolvedValue({
      mfa_totp_secret: 'SECRET',
      mfa_totp_enabled: false,
    });
    mocks.totpVerify.mockReturnValue(true);

    const res = await request(app).post('/2fa/totp/enable').send({ code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Two-factor authentication enabled');
    expect(mocks.enableMfaTotp).toHaveBeenCalledWith(42);
  });

  it('disables TOTP after password and code verification', async () => {
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.getMfaTotpState.mockResolvedValue({
      mfa_totp_secret: 'SECRET',
      mfa_totp_enabled: true,
    });
    mocks.totpVerify.mockReturnValue(true);

    const res = await request(app).post('/2fa/totp/disable').send({
      code: '123456',
      password: 'CorrectHorseBatteryStaple1!',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Two-factor authentication disabled');
    expect(mocks.disableMfaTotp).toHaveBeenCalledWith(42);
  });
});
