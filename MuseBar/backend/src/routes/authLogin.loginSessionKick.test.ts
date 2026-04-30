import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  findByEmail: vi.fn(),
  verifyPassword: vi.fn(),
  getAuthLoginDetails: vi.fn(),
  logAction: vi.fn(),
  revokeAllUserTokensIssuedBefore: vi.fn(),
  revokeToken: vi.fn(),
}));

vi.mock('../app', () => ({
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
    mocks.logAction.mockReset();
    mocks.revokeAllUserTokensIssuedBefore.mockReset();
    mocks.revokeToken.mockReset();

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
    mocks.revokeAllUserTokensIssuedBefore.mockResolvedValue(undefined);
    mocks.revokeToken.mockResolvedValue(undefined);
  });

  it('does not revoke prior sessions by default', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'admin@est.example.com',
      password: 'TopSecret123!',
      rememberMe: false,
    });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(mocks.revokeAllUserTokensIssuedBefore).not.toHaveBeenCalled();
  });

  it('revokes prior sessions when kickPriorSessions is true', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'admin@est.example.com',
      password: 'TopSecret123!',
      rememberMe: false,
      kickPriorSessions: true,
    });

    expect(res.status).toBe(200);
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
