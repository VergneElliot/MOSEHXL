import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const mocks = vi.hoisted(() => ({
  getUserPermissions: vi.fn(),
  verifyPinActorToken: vi.fn(),
}));

vi.mock('../models/user', () => ({
  UserModel: { getUserPermissions: mocks.getUserPermissions },
}));

vi.mock('../services/auth/pinActorToken', () => ({
  verifyPinActorToken: mocks.verifyPinActorToken,
  pinActorHasPermission: (
    actor: { permissions?: string[] } | null | undefined,
    permission: string
  ) => Boolean(actor?.permissions?.includes(permission)),
}));

import { requirePermission } from './auth';

function buildRequest(pinActorToken?: string): Request {
  return {
    user: { id: 7, establishment_id: 'est-1', role: 'staff' },
    headers: pinActorToken ? { 'x-pin-actor-token': pinActorToken } : {},
  } as unknown as Request;
}

function buildResponse(): Response & { statusCode?: number; body?: unknown } {
  const res = {
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  } as unknown as Response & { statusCode?: number; body?: unknown };
  return res;
}

describe('requirePermission with a PIN identity', () => {
  beforeEach(() => {
    mocks.getUserPermissions.mockReset();
    mocks.verifyPinActorToken.mockReset();
  });

  it('passes when the logged-in account holds the permission', async () => {
    mocks.getUserPermissions.mockResolvedValue(['orders_cancel']);
    const req = buildRequest();
    const res = buildResponse();
    const next = vi.fn();

    await requirePermission('orders_cancel')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeUndefined();
  });

  it('passes when the PIN identity holds it and the account does not', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);
    mocks.verifyPinActorToken.mockReturnValue({
      id: 42,
      establishment_id: 'est-1',
      permissions: ['orders_cancel'],
    });
    const req = buildRequest('manager-token');
    const res = buildResponse();
    const next = vi.fn();

    await requirePermission('orders_cancel')(req, res, next);

    expect(next).toHaveBeenCalled();
    // The identity that authorized the call is exposed for traceability.
    expect(req.pinActor?.id).toBe(42);
  });

  it('refuses when neither identity holds it', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);
    mocks.verifyPinActorToken.mockReturnValue({
      id: 42,
      establishment_id: 'est-1',
      permissions: ['access_pos'],
    });
    const req = buildRequest('basic-token');
    const res = buildResponse();
    const next = vi.fn();

    await requirePermission('orders_cancel')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('ignores a PIN identity from another establishment', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);
    mocks.verifyPinActorToken.mockReturnValue({
      id: 42,
      establishment_id: 'est-2',
      permissions: ['orders_cancel'],
    });
    const req = buildRequest('foreign-token');
    const res = buildResponse();
    const next = vi.fn();

    await requirePermission('orders_cancel')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('ignores an invalid or expired PIN token', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);
    mocks.verifyPinActorToken.mockImplementation(() => {
      throw new Error('expired');
    });
    const req = buildRequest('stale-token');
    const res = buildResponse();
    const next = vi.fn();

    await requirePermission('orders_cancel')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('refuses when no PIN identity is presented', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);
    const req = buildRequest();
    const res = buildResponse();
    const next = vi.fn();

    await requirePermission('orders_cancel')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});
