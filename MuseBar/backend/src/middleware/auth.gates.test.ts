import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  generateToken,
  requireAdmin,
  requireEstablishmentAdmin,
  verifyToken,
} from './auth';

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

describe('auth gates and token helpers', () => {
  it('generateToken strips legacy is_admin and verifyToken round-trips', () => {
    const token = generateToken(
      {
        id: 1,
        email: 'a@b.com',
        role: 'establishment_admin',
        establishment_id: 'est-1',
        is_admin: true,
      },
      false
    );
    const payload = verifyToken(token);
    expect(payload.is_admin).toBeUndefined();
    expect(payload.role).toBe('establishment_admin');
    expect(payload.jti).toBeTruthy();
  });

  it('requireAdmin allows system_admin only', () => {
    const next = vi.fn();
    const res = mockRes();
    requireAdmin({ user: { role: 'staff' } } as Request, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();

    requireAdmin({ user: { role: 'system_admin' } } as Request, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('requireEstablishmentAdmin allows establishment_admin only', () => {
    const next = vi.fn() as NextFunction;
    const res = mockRes();
    requireEstablishmentAdmin({ user: { role: 'staff' } } as Request, res, next);
    expect(res.statusCode).toBe(403);

    requireEstablishmentAdmin(
      { user: { role: 'establishment_admin' } } as Request,
      mockRes(),
      next
    );
    expect(next).toHaveBeenCalled();
  });
});
