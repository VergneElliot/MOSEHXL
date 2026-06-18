import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  logAction: vi.fn().mockResolvedValue({}),
  findActiveRefreshToken: vi.fn(),
  listActiveSessionsByUser: vi.fn(),
  revokeAllForUserExceptFamily: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
    connect: vi.fn(),
  },
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.logAction,
  },
}));

vi.mock('../models/refreshToken', () => ({
  RefreshTokenModel: {
    findActiveByRawToken: mocks.findActiveRefreshToken,
    listActiveSessionsByUser: mocks.listActiveSessionsByUser,
    revokeAllForUserExceptFamily: mocks.revokeAllForUserExceptFamily,
    getFamilyIssuedAt: vi.fn(),
    rotate: vi.fn(),
    revokeFamily: vi.fn(),
    revokeAllForUser: vi.fn(),
    create: vi.fn(),
    revokeByRawToken: vi.fn(),
  },
}));

import authLoginRouter from './authLogin';

const app = express();
app.use(express.json());
app.use('/auth', authLoginRouter);
app.use(errorHandler);

describe('auth session management endpoints', () => {
  const authToken = generateToken({
    id: 42,
    email: 'admin@example.com',
    role: 'establishment_admin',
    establishment_id: '11111111-1111-4111-8111-111111111111',
  });

  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.logAction.mockReset();
    mocks.findActiveRefreshToken.mockReset();
    mocks.listActiveSessionsByUser.mockReset();
    mocks.revokeAllForUserExceptFamily.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });
    mocks.logAction.mockResolvedValue({});
  });

  it('lists active sessions and marks current family', async () => {
    mocks.findActiveRefreshToken.mockResolvedValue({
      user_id: 42,
      family_id: 'family-current',
    });
    mocks.listActiveSessionsByUser.mockResolvedValue([
      {
        id: 'session-1',
        familyId: 'family-current',
        issuedAt: new Date('2026-05-28T10:00:00.000Z'),
        expiresAt: new Date('2026-05-29T10:00:00.000Z'),
        ipAddress: '192.168.1.5',
        ipSubnet: '192.168.1.0/24',
        userAgent: 'Mozilla/5.0',
        clientId: 'client-current',
      },
      {
        id: 'session-2',
        familyId: 'family-other',
        issuedAt: new Date('2026-05-27T10:00:00.000Z'),
        expiresAt: new Date('2026-05-28T23:00:00.000Z'),
        ipAddress: '10.0.0.2',
        ipSubnet: '10.0.0.0/24',
        userAgent: 'Safari',
        clientId: 'client-other',
      },
    ]);

    const res = await request(app)
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', ['musebar_refresh_token=current-refresh-token']);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions).toHaveLength(2);
    expect(res.body.sessions[0].isCurrent).toBe(true);
    expect(res.body.sessions[1].isCurrent).toBe(false);
  });

  it('revokes all other sessions while preserving current family', async () => {
    mocks.findActiveRefreshToken.mockResolvedValue({
      user_id: 42,
      family_id: 'family-current',
    });
    mocks.revokeAllForUserExceptFamily.mockResolvedValue(3);

    const res = await request(app)
      .post('/auth/sessions/revoke-others')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', ['musebar_refresh_token=current-refresh-token'])
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.revokedCount).toBe(3);
    expect(mocks.revokeAllForUserExceptFamily).toHaveBeenCalledWith(
      42,
      'family-current',
      'USER_REVOKE_OTHER_SESSIONS'
    );
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'REVOKE_OTHER_SESSIONS',
        user_id: '42',
      })
    );
  });

  it('returns 400 when revoke-others is called without refresh cookie', async () => {
    const res = await request(app)
      .post('/auth/sessions/revoke-others')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(String(res.body.error?.message)).toContain('Refresh token cookie is required');
  });
});
