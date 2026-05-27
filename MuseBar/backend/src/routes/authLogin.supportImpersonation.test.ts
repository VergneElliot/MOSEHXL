import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken, verifyToken } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  logAction: vi.fn().mockResolvedValue({}),
  getAuthRoleState: vi.fn(),
  getMfaTotpState: vi.fn(),
  totpCheck: vi.fn(),
}));

vi.mock('../db/pool', () => ({
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
    getMfaTotpState: mocks.getMfaTotpState,
  },
}));

vi.mock('speakeasy', () => ({
  default: {
    totp: {
      verify: mocks.totpCheck,
    },
  },
}));

import authLoginRouter from './authLogin';

const app = express();
app.use(express.json());
app.use('/auth', authLoginRouter);
app.use(errorHandler);

function systemAdminToken() {
  return generateToken(
    {
      id: 1,
      email: 'root@example.com',
      is_admin: true,
      role: 'system_admin',
      establishment_id: null,
    },
    false
  );
}

describe('support impersonation endpoints', () => {
  const previousEnforceFlag = process.env.AUTH_ENFORCE_ADMIN_2FA;

  beforeEach(() => {
    process.env.AUTH_ENFORCE_ADMIN_2FA = 'true';
    mocks.poolQuery.mockReset();
    mocks.logAction.mockReset();
    mocks.logAction.mockResolvedValue({});
    mocks.getAuthRoleState.mockReset();
    mocks.getMfaTotpState.mockReset();
    mocks.totpCheck.mockReset();
    mocks.getMfaTotpState.mockResolvedValue({
      mfa_totp_enabled: true,
      mfa_totp_secret: 'SECRET',
    });
    mocks.totpCheck.mockReturnValue(true);
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      if (sql.includes('FROM establishments')) {
        return { rows: [{ id: 'est-1', name: 'Cafe A' }] };
      }
      return { rows: [] };
    });
  });

  afterAll(() => {
    process.env.AUTH_ENFORCE_ADMIN_2FA = previousEnforceFlag;
  });

  it('starts a time-bounded impersonation token and logs audit action', async () => {
    const currentToken = systemAdminToken();
    const res = await request(app)
      .post('/auth/support/impersonation/start')
      .set('Authorization', `Bearer ${currentToken}`)
      .send({
        establishment_id: 'est-1',
        reason: 'Investigating closure mismatch',
        duration_minutes: 20,
        totpCode: '123456',
      });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    const decoded = verifyToken(res.body.token);
    expect(decoded.establishment_id).toBe('est-1');
    expect(decoded.support_impersonation?.reason).toBe('Investigating closure mismatch');
    expect(decoded.is_admin).toBeUndefined();

    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'SUPPORT_IMPERSONATION_STARTED',
        establishment_id: 'est-1',
      })
    );

    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO token_blocklist'),
      expect.arrayContaining([1, 'SUPPORT_IMPERSONATION_STARTED'])
    );
  });

  it('stops impersonation, issues base system_admin token, and logs audit action', async () => {
    mocks.getAuthRoleState.mockResolvedValue({
      role: 'system_admin',
      establishment_id: null,
      is_admin: true,
    });

    const supportToken = generateToken(
      {
        id: 1,
        email: 'root@example.com',
        is_admin: true,
        role: 'system_admin',
        establishment_id: 'est-1',
        support_impersonation: {
          actor_user_id: 1,
          reason: 'Support request',
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
      },
      false,
      '15m'
    );

    const res = await request(app)
      .post('/auth/support/impersonation/stop')
      .set('Authorization', `Bearer ${supportToken}`)
      .send({});

    expect(res.status).toBe(200);
    const decoded = verifyToken(res.body.token);
    expect(decoded.establishment_id).toBeNull();
    expect(decoded.support_impersonation).toBeUndefined();
    expect(decoded.is_admin).toBeUndefined();

    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'SUPPORT_IMPERSONATION_ENDED',
        establishment_id: 'est-1',
      })
    );

    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO token_blocklist'),
      expect.any(Array)
    );
  });

  it('rejects a revoked token before route execution', async () => {
    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [{ '?column?': 1 }] };
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post('/auth/support/impersonation/start')
      .set('Authorization', `Bearer ${systemAdminToken()}`)
      .send({
        establishment_id: 'est-1',
        reason: 'Investigating closure mismatch',
        duration_minutes: 20,
        totpCode: '123456',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token has been revoked');
  });

  it('blocks support impersonation start when admin 2FA setup is missing', async () => {
    mocks.getMfaTotpState.mockResolvedValueOnce({
      mfa_totp_enabled: false,
      mfa_totp_secret: null,
    });

    const res = await request(app)
      .post('/auth/support/impersonation/start')
      .set('Authorization', `Bearer ${systemAdminToken()}`)
      .send({
        establishment_id: 'est-1',
        reason: 'Investigating closure mismatch',
        duration_minutes: 20,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SUPPORT_IMPERSONATION_2FA_SETUP_REQUIRED');
  });

  it('blocks support impersonation start when totp code is invalid', async () => {
    mocks.totpCheck.mockReturnValueOnce(false);

    const res = await request(app)
      .post('/auth/support/impersonation/start')
      .set('Authorization', `Bearer ${systemAdminToken()}`)
      .send({
        establishment_id: 'est-1',
        reason: 'Investigating closure mismatch',
        duration_minutes: 20,
        totpCode: '000000',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SUPPORT_IMPERSONATION_INVALID_2FA_CODE');
  });
});

