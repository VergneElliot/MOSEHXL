import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  BusinessLogicError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  asyncHandler,
  createErrorHandler,
  notFound,
} from './errorHandler';

function mockRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('errorHandler classes', () => {
  it('sets status codes and names for subclasses', () => {
    expect(new ValidationError('bad').statusCode).toBe(400);
    expect(new AuthenticationError().statusCode).toBe(401);
    expect(new AuthorizationError().statusCode).toBe(403);
    expect(new NotFoundError('Order').message).toBe('Order not found');
    expect(new ConflictError('dup').statusCode).toBe(409);
    expect(new RateLimitError().statusCode).toBe(429);
    expect(new BusinessLogicError('nope').statusCode).toBe(422);
    expect(new DatabaseError().errorCode).toBe('DATABASE_ERROR');
    expect(new ExternalServiceError().statusCode).toBe(502);
  });
});

describe('asyncHandler', () => {
  it('forwards rejected promises to next', async () => {
    const next = vi.fn();
    const err = new Error('async fail');
    const handler = asyncHandler(async () => {
      throw err;
    });
    handler({} as Request, mockRes(), next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(err));
  });
});

describe('createErrorHandler', () => {
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
  });

  it('serializes AppError with details in test/dev', () => {
    process.env.NODE_ENV = 'test';
    const logger = { error: vi.fn(), warn: vi.fn() };
    const handler = createErrorHandler(logger as never);
    const res = mockRes();
    const req = {
      originalUrl: '/api/x',
      method: 'POST',
      ip: '127.0.0.1',
      headers: {},
      requestId: 'req-1',
      user: { id: 9 },
    } as unknown as Request;

    handler(new ValidationError('invalid', { field: 'email' }), req, res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'invalid',
        details: { field: 'email' },
        requestId: 'req-1',
      },
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('maps PostgreSQL unique violation to 409', () => {
    process.env.NODE_ENV = 'test';
    const handler = createErrorHandler();
    const res = mockRes();
    handler({ code: '23505' }, { originalUrl: '/', method: 'GET', headers: {} } as Request, res, vi.fn());
    expect(res.statusCode).toBe(409);
    expect((res.body as { error: { code: string } }).error.code).toBe('CONFLICT_ERROR');
  });

  it('maps JWT, network, rate-limit, JSON, and upload errors', () => {
    process.env.NODE_ENV = 'test';
    const handler = createErrorHandler();
    const req = { originalUrl: '/', method: 'GET', headers: {} } as Request;

    const cases: Array<{ err: unknown; status: number; code: string }> = [
      { err: { name: 'JsonWebTokenError' }, status: 401, code: 'AUTHENTICATION_ERROR' },
      { err: { name: 'TokenExpiredError' }, status: 401, code: 'AUTHENTICATION_ERROR' },
      { err: { code: 'ECONNREFUSED' }, status: 502, code: 'EXTERNAL_SERVICE_ERROR' },
      { err: { message: 'Rate limit exceeded' }, status: 429, code: 'RATE_LIMIT_ERROR' },
      { err: new SyntaxError('Unexpected token in JSON'), status: 400, code: 'VALIDATION_ERROR' },
      { err: { code: 'LIMIT_FILE_SIZE' }, status: 400, code: 'VALIDATION_ERROR' },
      { err: { code: 'LIMIT_UNEXPECTED_FILE' }, status: 400, code: 'VALIDATION_ERROR' },
      { err: { code: '23503' }, status: 400, code: 'VALIDATION_ERROR' },
      { err: { code: '42P01' }, status: 500, code: 'DATABASE_ERROR' },
      { err: { code: '23XYZ' }, status: 400, code: 'VALIDATION_ERROR' },
    ];

    for (const c of cases) {
      const res = mockRes();
      handler(c.err, req, res, vi.fn());
      expect(res.statusCode).toBe(c.status);
      expect((res.body as { error: { code: string } }).error.code).toBe(c.code);
    }
  });

  it('hides non-operational messages outside AppError', () => {
    process.env.NODE_ENV = 'production';
    const logger = { error: vi.fn(), warn: vi.fn() };
    const handler = createErrorHandler(logger as never);
    const res = mockRes();
    handler(
      new Error('secret stack at Object.foo'),
      { originalUrl: '/', method: 'GET', headers: {} } as Request,
      res,
      vi.fn()
    );
    expect(res.statusCode).toBe(500);
    expect((res.body as { error: { message: string } }).error.message).toBe(
      'Internal server error'
    );
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('notFound', () => {
  it('passes a 404 AppError to next', () => {
    const next = vi.fn() as NextFunction;
    notFound({ originalUrl: '/missing' } as Request, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as unknown as { mock: { calls: Array<[AppError]> } }).mock.calls[0]![0];
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('/missing');
  });
});
