import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  InputSanitizationService,
  RequestSizeLimitService,
} from './InputSanitization';

describe('InputSanitizationService', () => {
  it('sanitizeString strips XSS vectors', () => {
    expect(InputSanitizationService.sanitizeString('  hi <script>x</script> ')).toBe('hi');
    expect(InputSanitizationService.sanitizeString('javascript:alert(1)')).not.toContain(
      'javascript:'
    );
  });

  it('sanitizeObject walks nested structures', () => {
    expect(
      InputSanitizationService.sanitizeObject({
        a: '<script>z</script>ok',
        b: ['x', { c: 'onload=1' }],
      })
    ).toEqual({ a: 'ok', b: ['x', { c: '1' }] });
  });

  it('validators and html helpers', () => {
    expect(InputSanitizationService.isValidEmail('a@b.com')).toBe(true);
    expect(InputSanitizationService.isValidEmail('bad')).toBe(false);
    expect(InputSanitizationService.isValidPhone('+33123456789')).toBe(true);
    expect(InputSanitizationService.containsDangerousPatterns('<script>')).toBe(true);
    expect(InputSanitizationService.escapeHtml('<b>"x"</b>')).toContain('&lt;');
    expect(InputSanitizationService.stripHtml('<b>x</b>')).toBe('x');
  });

  it('createMiddleware sanitizes body/query/params', () => {
    const next = vi.fn();
    const mw = InputSanitizationService.createMiddleware();
    const req = {
      body: { name: '<script>x</script>Ada' },
      query: { q: 'javascript:1' },
      params: { id: '1' },
    } as unknown as Request;
    mw(req, {} as Response, next as NextFunction);
    expect((req.body as { name: string }).name).toBe('Ada');
    expect(next).toHaveBeenCalled();
  });
});

describe('RequestSizeLimitService', () => {
  it('allows inbound-email and rejects oversized bodies', () => {
    const next = vi.fn();
    const mw = RequestSizeLimitService.createMiddleware(1);
    mw(
      { originalUrl: '/api/inbound-email', headers: { 'content-length': '999999' } } as Request,
      {} as Response,
      next as NextFunction
    );
    expect(next).toHaveBeenCalled();

    expect(() =>
      mw(
        {
          originalUrl: '/api/other',
          headers: { 'content-length': String(2 * 1024) },
          method: 'POST',
          ip: '1.1.1.1',
        } as Request,
        {} as Response,
        next as NextFunction
      )
    ).toThrow(/Request too large/);
  });
});
