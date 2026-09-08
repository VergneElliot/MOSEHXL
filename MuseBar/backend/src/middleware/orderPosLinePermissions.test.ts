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

import { assertPosOrderLinePermissions } from './orderPosLinePermissions';

function buildRequest(body: unknown, pinToken?: string): Request {
  return {
    user: { id: 7, establishment_id: 'est-1', role: 'staff' },
    headers: pinToken ? { 'x-pin-actor-token': pinToken } : {},
    body,
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

describe('assertPosOrderLinePermissions', () => {
  beforeEach(() => {
    mocks.getUserPermissions.mockReset();
    mocks.verifyPinActorToken.mockReset();
    mocks.getUserPermissions.mockResolvedValue([]);
  });

  it('allows a cart with no elevated line tags', async () => {
    const next = vi.fn();
    await assertPosOrderLinePermissions()(
      buildRequest({ items: [{ description: 'Café' }] }),
      buildResponse(),
      next
    );
    expect(next).toHaveBeenCalled();
  });

  it('refuses Remise when neither account nor PIN holds pos_apply_remise', async () => {
    const res = buildResponse();
    const next = vi.fn();
    await assertPosOrderLinePermissions()(
      buildRequest({ items: [{ description: '[Remise −10%]' }] }),
      res,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('accepts Remise when a step-up PIN identity holds the right', async () => {
    mocks.verifyPinActorToken.mockReturnValue({
      id: 42,
      establishment_id: 'est-1',
      permissions: ['pos_apply_remise'],
      role: 'staff',
    });
    const next = vi.fn();
    await assertPosOrderLinePermissions()(
      buildRequest({ items: [{ description: '[Remise −2.00€]' }] }, 'manager-token'),
      buildResponse(),
      next
    );
    expect(next).toHaveBeenCalled();
  });

  it('still gates manual Happy Hour, Offert and Perso', async () => {
    const res = buildResponse();
    await assertPosOrderLinePermissions()(
      buildRequest({
        items: [{ description: '[Offert]', is_manual_happy_hour: true }],
      }),
      res,
      vi.fn()
    );
    expect(res.statusCode).toBe(403);
    expect(String(res.body && (res.body as { error?: string }).error)).toMatch(
      /Happy Hour manuel/
    );
  });
});
