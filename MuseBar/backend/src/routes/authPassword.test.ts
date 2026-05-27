import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  verifyPassword: vi.fn(),
  updatePasswordById: vi.fn(),
  invalidateActiveRequestsForUser: vi.fn(),
  createRequest: vi.fn(),
  findValidByTokenHash: vi.fn(),
  markUsed: vi.fn(),
  revokeAllUserTokensIssuedBefore: vi.fn(),
  revokeToken: vi.fn(),
  revokeAllRefreshTokensForUser: vi.fn(),
  auditLogAction: vi.fn(),
  sendTemplateEmail: vi.fn(),
  emailIsConfigured: vi.fn(),
}));

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: unknown }).user = {
      id: 77,
      email: 'user@example.com',
      role: 'staff',
      is_admin: false,
      establishment_id: 'est-1',
    };
    next();
  },
}));

vi.mock('../models/user', () => ({
  UserModel: {
    findByEmail: mocks.findByEmail,
    findById: mocks.findById,
    verifyPassword: mocks.verifyPassword,
    updatePasswordById: mocks.updatePasswordById,
  },
}));

vi.mock('../models/passwordResetRequest', () => ({
  PasswordResetRequestModel: {
    invalidateActiveRequestsForUser: mocks.invalidateActiveRequestsForUser,
    createRequest: mocks.createRequest,
    findValidByTokenHash: mocks.findValidByTokenHash,
    markUsed: mocks.markUsed,
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
    revokeAllForUser: mocks.revokeAllRefreshTokensForUser,
  },
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.auditLogAction,
  },
}));

vi.mock('../utils/logger', () => ({
  Logger: {
    getInstance: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
  },
}));

vi.mock('../services/email/EmailService', () => ({
  EmailService: {
    getInstance: () => ({
      isConfigured: mocks.emailIsConfigured,
      sendTemplateEmail: mocks.sendTemplateEmail,
    }),
  },
}));

import authPasswordRouter from './authPassword';
import { errorHandler } from '../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/auth', authPasswordRouter);
app.use(errorHandler);

describe('authPassword routes', () => {
  const originalBreachToggle = process.env.PASSWORD_BREACH_CHECK_ENABLED;

  beforeEach(() => {
    mocks.findByEmail.mockReset();
    mocks.findById.mockReset();
    mocks.verifyPassword.mockReset();
    mocks.updatePasswordById.mockReset();
    mocks.invalidateActiveRequestsForUser.mockReset();
    mocks.createRequest.mockReset();
    mocks.findValidByTokenHash.mockReset();
    mocks.markUsed.mockReset();
    mocks.revokeAllUserTokensIssuedBefore.mockReset();
    mocks.revokeToken.mockReset();
    mocks.revokeAllRefreshTokensForUser.mockReset();
    mocks.auditLogAction.mockReset();
    mocks.sendTemplateEmail.mockReset();
    mocks.emailIsConfigured.mockReset();

    mocks.auditLogAction.mockResolvedValue(undefined);
    mocks.emailIsConfigured.mockReturnValue(true);
    mocks.sendTemplateEmail.mockResolvedValue('track-1');
    mocks.updatePasswordById.mockResolvedValue(true);
    mocks.revokeAllUserTokensIssuedBefore.mockResolvedValue(undefined);
    mocks.revokeToken.mockResolvedValue(undefined);
    mocks.revokeAllRefreshTokensForUser.mockResolvedValue(undefined);
    mocks.markUsed.mockResolvedValue(undefined);
    mocks.invalidateActiveRequestsForUser.mockResolvedValue(undefined);
    mocks.createRequest.mockResolvedValue({ id: 'req-1' });
    process.env.PASSWORD_BREACH_CHECK_ENABLED = originalBreachToggle;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns generic success for unknown email on forgot-password', async () => {
    mocks.findByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/password/forgot')
      .send({ email: 'missing@example.com' });

    expect(res.status).toBe(200);
    expect(String(res.body.message)).toContain('If an account with this email exists');
    expect(mocks.createRequest).not.toHaveBeenCalled();
    expect(mocks.sendTemplateEmail).not.toHaveBeenCalled();
  });

  it('creates reset request and sends email for known user', async () => {
    mocks.findByEmail.mockResolvedValue({
      id: 11,
      email: 'known@example.com',
      first_name: 'Known',
    });

    const res = await request(app)
      .post('/auth/password/forgot')
      .send({ email: 'known@example.com' });

    expect(res.status).toBe(200);
    expect(mocks.invalidateActiveRequestsForUser).toHaveBeenCalledWith(11);
    expect(mocks.createRequest).toHaveBeenCalledTimes(1);
    expect(mocks.sendTemplateEmail).toHaveBeenCalledTimes(1);
  });

  it('rejects reset with invalid token', async () => {
    mocks.findValidByTokenHash.mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/password/reset')
      .send({ token: 'bad-token', newPassword: 'StrongPass1' });

    expect(res.status).toBe(400);
    expect(String(res.body?.error?.message ?? '')).toContain('Invalid or expired reset token');
  });

  it('resets password and revokes all prior tokens', async () => {
    mocks.findValidByTokenHash.mockResolvedValue({
      id: 'req-2',
      user_id: 11,
      email: 'known@example.com',
    });

    const res = await request(app)
      .post('/auth/password/reset')
      .send({ token: 'ok-token', newPassword: 'StrongPass1' });

    expect(res.status).toBe(200);
    expect(mocks.updatePasswordById).toHaveBeenCalledWith(11, 'StrongPass1');
    expect(mocks.markUsed).toHaveBeenCalledWith('req-2');
    expect(mocks.revokeAllUserTokensIssuedBefore).toHaveBeenCalledWith(
      11,
      expect.any(Number),
      'PASSWORD_RESET'
    );
    expect(mocks.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(11, 'PASSWORD_RESET');
  });

  it('changes password when current password is valid and revokes sessions', async () => {
    mocks.findById.mockResolvedValue({
      id: 77,
      email: 'user@example.com',
      password_hash: 'hashed',
    });
    mocks.verifyPassword
      .mockResolvedValueOnce(true)  // current password is valid
      .mockResolvedValueOnce(false); // new password is different

    const res = await request(app)
      .post('/auth/password/change')
      .set('Authorization', 'Bearer token-123')
      .send({ currentPassword: 'OldPass1', newPassword: 'StrongPass1' });

    expect(res.status).toBe(200);
    expect(mocks.updatePasswordById).toHaveBeenCalledWith(77, 'StrongPass1');
    expect(mocks.revokeAllUserTokensIssuedBefore).toHaveBeenCalledWith(
      77,
      expect.any(Number),
      'PASSWORD_CHANGE'
    );
    expect(mocks.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(77, 'PASSWORD_CHANGE');
    expect(mocks.revokeToken).toHaveBeenCalledWith(
      'token-123',
      expect.objectContaining({ userId: 77, reason: 'PASSWORD_CHANGE_CURRENT_TOKEN_REVOKE' })
    );
  });

  it('rejects breached passwords on reset when check is enabled', async () => {
    process.env.PASSWORD_BREACH_CHECK_ENABLED = 'true';
    const hashHex = crypto.createHash('sha1').update('StrongPass1').digest('hex').toUpperCase();
    const suffix = hashHex.slice(5);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:999\n`,
    }));

    const res = await request(app)
      .post('/auth/password/reset')
      .send({ token: 'ok-token', newPassword: 'StrongPass1' });

    expect(res.status).toBe(400);
    expect(String(res.body.error?.message)).toContain('known data breaches');
    expect(mocks.updatePasswordById).not.toHaveBeenCalled();
  });
});
