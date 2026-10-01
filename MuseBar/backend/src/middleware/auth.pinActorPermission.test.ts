import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const mocks = vi.hoisted(() => ({
  verifyPinActorToken: vi.fn(),
}));

vi.mock('../models/user', () => ({
  UserModel: { getUserPermissions: vi.fn() },
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

describe('requirePermission — PIN-only feature gates', () => {
  beforeEach(() => {
    mocks.verifyPinActorToken.mockReset();
  });

  it('refuses when only the venue login JWT is present (no PIN)', async () => {
    const req = buildRequest();
    const res = buildResponse();
    const next = vi.fn();

    await requirePermission('orders_cancel')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect((res.body as { code?: string }).code).toBe('PIN_ACTOR_REQUIRED');
  });

  it('passes when the PIN identity holds the permission', async () => {
    mocks.verifyPinActorToken.mockReturnValue({
      id: 42,
      establishment_id: 'est-1',
      role: 'staff',
      permissions: ['orders_cancel'],
    });
    const req = buildRequest('manager-token');
    const res = buildResponse();
    const next = vi.fn();

    await requirePermission('orders_cancel')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.pinActor?.id).toBe(42);
  });

  it('refuses when PIN lacks the permission', async () => {
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
    mocks.verifyPinActorToken.mockReturnValue({
      id: 42,
      establishment_id: 'est-other',
      permissions: ['orders_cancel'],
    });
    const req = buildRequest('foreign-token');
    const res = buildResponse();
    const next = vi.fn();

    await requirePermission('orders_cancel')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});
