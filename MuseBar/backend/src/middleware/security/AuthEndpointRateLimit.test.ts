import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { RateLimitError } from '../errorHandler';
import { signJwtToken } from '../../security/jwtConfig';
import {
  createAuthRateLimitMiddleware,
  createRefreshRateLimitKeyResolver,
  resolveLoginRateLimitKey,
} from './AuthEndpointRateLimit';

function createRes(): Response {
  return {
    set: vi.fn(),
  } as unknown as Response;
}

function createLogger() {
  return {
    security: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    httpRequest: vi.fn(),
    authentication: vi.fn(),
    api: vi.fn(),
    performance: vi.fn(),
    business: vi.fn(),
    database: vi.fn(),
    system: vi.fn(),
  };
}

describe('auth endpoint rate limiter utilities', () => {
  it('builds login key with hashed email (not plaintext)', () => {
    const req = {
      ip: '10.0.0.5',
      body: { email: 'User.Name@example.com' },
    } as unknown as Request;

    const key = resolveLoginRateLimitKey(req);

    expect(key).toMatch(/^ip:10\.0\.0\.5:email:[a-f0-9]{24}$/);
    expect(key).not.toContain('user.name@example.com');
  });

  it('derives refresh key from bearer token user id', () => {
    const secret = 'x'.repeat(40);
    const token = signJwtToken({ id: 42 }, '1h');
    const resolver = createRefreshRateLimitKeyResolver(secret);
    const req = {
      ip: '127.0.0.1',
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as Request;

    const key = resolver(req);
    expect(key).toBe('ip:127.0.0.1:user:42');
  });

  it('returns RateLimitError once auth limit is exceeded', async () => {
    const logger = createLogger();
    const limiter = createAuthRateLimitMiddleware({
      logger,
      keyPrefix: 'auth_login',
      windowMs: 60_000,
      maxRequests: 2,
      keyResolver: () => 'ip:127.0.0.1:email:test',
      errorMessage: 'Too many login attempts',
    });
    const req = {
      method: 'POST',
      originalUrl: '/api/auth/login',
      ip: '127.0.0.1',
      headers: {},
    } as unknown as Request;
    const res = createRes();

    const nextCalls: unknown[] = [];
    const next = ((err?: unknown) => {
      nextCalls.push(err);
    }) as NextFunction;

    limiter(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    limiter(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    limiter(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(nextCalls[0]).toBeUndefined();
    expect(nextCalls[1]).toBeUndefined();
    expect(nextCalls[2]).toBeInstanceOf(RateLimitError);
    expect((nextCalls[2] as RateLimitError).statusCode).toBe(429);
  });
});
