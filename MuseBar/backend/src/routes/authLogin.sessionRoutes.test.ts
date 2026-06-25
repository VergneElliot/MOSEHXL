import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  getAuthMeProfile: vi.fn(),
  getUserPermissions: vi.fn(),
  legacyMetrics: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  __esModule: true,
  pool: {
    connect: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock('../middleware/auth', () => ({
  generateToken: vi.fn(() => 'signed-token'),
  getLegacyAdminClaimMetrics: mocks.legacyMetrics,
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: unknown }).user = {
      id: 42,
      email: 'admin@example.com',
      is_admin: true,
      role: 'system_admin',
      establishment_id: null,
      support_impersonation: null,
    };
    next();
  },
}));

vi.mock('../models/user', () => ({
  UserModel: {
    getAuthMeProfile: mocks.getAuthMeProfile,
    getUserPermissions: mocks.getUserPermissions,
    getAuthRoleState: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../models/refreshToken', () => ({
  RefreshTokenModel: {
    findActiveByRawToken: vi.fn(),
    listActiveSessionsByUser: vi.fn(),
    revokeAllForUserExceptFamily: vi.fn(),
    getFamilyIssuedAt: vi.fn(),
    revokeAllForUser: vi.fn(),
    revokeFamily: vi.fn(),
    rotate: vi.fn(),
  },
}));

vi.mock('../models/tokenBlocklist', () => ({
  TokenBlocklistModel: {
    revokeAllUserTokensIssuedBefore: vi.fn(),
  },
}));

import sessionRoutes from './authLogin/sessionRoutes';

const app = express();
app.use(express.json());
app.use('/', sessionRoutes);
app.use(errorHandler);

describe('auth sessionRoutes profile and metrics endpoints', () => {
  beforeEach(() => {
    mocks.getAuthMeProfile.mockReset();
    mocks.getUserPermissions.mockReset();
    mocks.legacyMetrics.mockReset();

    mocks.getAuthMeProfile.mockResolvedValue({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email_verified: true,
    });
    mocks.getUserPermissions.mockResolvedValue(['legal:read', 'orders:write']);
    mocks.legacyMetrics.mockReturnValue({
      tokens_with_legacy_is_admin_claim: 0,
    });
  });

  it('returns the current profile with permissions', async () => {
    const res = await request(app).get('/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 42,
      email: 'admin@example.com',
      is_admin: true,
      role: 'system_admin',
      establishment_id: null,
      first_name: 'Ada',
      last_name: 'Lovelace',
      email_verified: true,
      permissions: ['legal:read', 'orders:write'],
      support_impersonation: null,
    });
  });

  it('returns legacy admin-claim metrics and policy state', async () => {
    const previousRejectFlag = process.env.AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM;
    process.env.AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM = 'true';

    try {
      const res = await request(app).get('/legacy-claim-metrics');

      expect(res.status).toBe(200);
      expect(res.body.metrics).toEqual({
        tokens_with_legacy_is_admin_claim: 0,
      });
      expect(res.body.policy.rejectLegacyIsAdminClaim).toBe(true);
    } finally {
      process.env.AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM = previousRejectFlag;
    }
  });
});
