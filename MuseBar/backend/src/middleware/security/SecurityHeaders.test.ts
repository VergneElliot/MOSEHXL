import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { SecurityHeadersService } from './SecurityHeaders';

describe('SecurityHeadersService', () => {
  it('applySecurityHeaders sets baseline headers and HSTS in production', () => {
    const headers: Record<string, string> = {};
    const res = { set: (h: Record<string, string>) => Object.assign(headers, h) } as unknown as Response;

    SecurityHeadersService.applySecurityHeaders(res, {
      app: { environment: 'development' },
    } as never);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headers['Strict-Transport-Security']).toBeUndefined();

    SecurityHeadersService.applySecurityHeaders(res, {
      app: { environment: 'production' },
    } as never);
    expect(headers['Strict-Transport-Security']).toContain('max-age=');
  });

  it('createMiddleware calls next after setting headers', () => {
    const next = vi.fn();
    const set = vi.fn();
    const mw = SecurityHeadersService.createMiddleware({
      app: { environment: 'test' },
    } as never);
    mw({} as Request, { set } as unknown as Response, next as NextFunction);
    expect(set).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
