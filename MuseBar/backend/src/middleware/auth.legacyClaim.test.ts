import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { requireAuth, getLegacyAdminClaimMetrics, resetLegacyAdminClaimMetrics } from './auth';

vi.mock('../models/tokenBlocklist', () => ({
  TokenBlocklistModel: {
    isTokenRevoked: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock('../utils/logger', () => ({
  Logger: {
    getInstance: () => ({
      security: vi.fn(),
    }),
  },
}));

const ORIGINAL_ENV = { ...process.env };

function makeLegacyClaimToken(secret: string) {
  return jwt.sign(
    {
      id: 101,
      email: 'legacy@example.com',
      role: 'staff',
      establishment_id: 'est-1',
      is_admin: true,
    },
    secret,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
}

function buildApp() {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => {
    return res.json({
      id: req.user?.id,
      role: req.user?.role,
      is_admin: req.user?.is_admin,
    });
  });
  return app;
}

describe('legacy is_admin claim retirement policy', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.JWT_SECRET = 'x'.repeat(32);
    resetLegacyAdminClaimMetrics();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('tracks legacy claim usage but allows token when rejection policy is disabled', async () => {
    process.env.AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM = 'false';
    const app = buildApp();
    const token = makeLegacyClaimToken(process.env.JWT_SECRET!);

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('staff');
    // Admin authority now derives strictly from role, not legacy claim.
    expect(res.body.is_admin).toBe(false);

    const metrics = getLegacyAdminClaimMetrics();
    expect(metrics.seenCount).toBe(1);
    expect(metrics.rejectedCount).toBe(0);
    expect(metrics.lastSeenAt).not.toBeNull();
  });

  it('rejects legacy claim token when rejection policy is enabled', async () => {
    process.env.AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM = 'true';
    const app = buildApp();
    const token = makeLegacyClaimToken(process.env.JWT_SECRET!);

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('retired legacy admin claim');

    const metrics = getLegacyAdminClaimMetrics();
    expect(metrics.seenCount).toBe(1);
    expect(metrics.rejectedCount).toBe(1);
    expect(metrics.lastRejectedAt).not.toBeNull();
  });

  it('defaults to reject in production when policy env is omitted', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM;
    const app = buildApp();
    const token = makeLegacyClaimToken(process.env.JWT_SECRET!);

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    const metrics = getLegacyAdminClaimMetrics();
    expect(metrics.rejectedCount).toBe(1);
  });
});
