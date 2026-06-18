import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';
import type { Request, Response, NextFunction } from 'express';
import { RequestLogger } from './requestLogger';

describe('RequestLogger header redaction', () => {
  it('redacts setup and client-error secret headers in request-start logs', () => {
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      security: vi.fn(),
      authentication: vi.fn(),
      api: vi.fn(),
      httpRequest: vi.fn(),
    };

    const middleware = RequestLogger.createMiddleware(logger);
    const req = {
      method: 'POST',
      path: '/api/client-errors',
      originalUrl: '/api/client-errors',
      ip: '127.0.0.1',
      headers: {
        authorization: 'Bearer abc123',
        'x-refresh-token': 'refresh-secret',
        'x-setup-secret': 'super-secret-setup',
        'x-client-error-key': 'super-secret-client-key',
        'user-agent': 'vitest-agent',
      },
      query: {},
      body: { message: 'hello' },
      user: { id: 42 },
    } as unknown as Request;

    const resEmitter = new EventEmitter() as Response;
    const next = vi.fn<NextFunction>();

    middleware(req, resEmitter, next);

    expect(next).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledTimes(3);

    const requestStartCall = logger.debug.mock.calls[1];
    const metadata = requestStartCall[1] as { headers?: Record<string, unknown> };
    expect(metadata.headers?.authorization).toBe('[REDACTED]');
    expect(metadata.headers?.['x-refresh-token']).toBe('[REDACTED]');
    expect(metadata.headers?.['x-setup-secret']).toBe('[REDACTED]');
    expect(metadata.headers?.['x-client-error-key']).toBe('[REDACTED]');
  });

  it('redacts refresh_token and invitation_token fields in request body', () => {
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      security: vi.fn(),
      authentication: vi.fn(),
      api: vi.fn(),
      httpRequest: vi.fn(),
    };

    const middleware = RequestLogger.createMiddleware(logger);
    const req = {
      method: 'POST',
      path: '/api/auth/login',
      originalUrl: '/api/auth/login',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'vitest-agent',
      },
      query: {},
      body: {
        refresh_token: 'refresh-token-value',
        invitation_token: 'invitation-token-value',
        nested: {
          invitation_token: 'nested-invitation-token',
          safe: 'ok',
        },
      },
      user: { id: 42 },
    } as unknown as Request;

    const resEmitter = new EventEmitter() as Response;
    const next = vi.fn<NextFunction>();

    middleware(req, resEmitter, next);

    expect(next).toHaveBeenCalled();
    const requestStartCall = logger.debug.mock.calls[1];
    const metadata = requestStartCall[1] as { body?: Record<string, unknown> };
    expect(metadata.body?.refresh_token).toBe('[REDACTED]');
    expect(metadata.body?.invitation_token).toBe('[REDACTED]');
    expect((metadata.body?.nested as Record<string, unknown>)?.invitation_token).toBe('[REDACTED]');
    expect((metadata.body?.nested as Record<string, unknown>)?.safe).toBe('ok');
  });
});
