import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../services/auth/pinActorToken', () => ({
  verifyPinActorToken: vi.fn(),
  pinActorHasPermission: (
    actor: { permissions?: string[] } | null | undefined,
    permission: string
  ) => Boolean(actor?.permissions?.includes(permission)),
}));

import { assertPosOrderLinePermissions } from './orderPosLinePermissions';

function buildRequest(
  body: unknown,
  pinActor?: { id: number; establishment_id: string; permissions: string[]; role: string }
): Request {
  return {
    user: { id: 7, establishment_id: 'est-1', role: 'staff' },
    headers: {},
    body,
    pinActor,
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
    vi.clearAllMocks();
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

  it('refuses Remise when PIN actor lacks pos_apply_remise', async () => {
    const res = buildResponse();
    const next = vi.fn();
    await assertPosOrderLinePermissions()(
      buildRequest(
        { items: [{ description: '[Remise −10%]' }] },
        { id: 7, establishment_id: 'est-1', permissions: ['access_pos'], role: 'staff' }
      ),
      res,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('accepts Remise when the PIN identity holds the right', async () => {
    const next = vi.fn();
    await assertPosOrderLinePermissions()(
      buildRequest(
        { items: [{ description: '[Remise −2.00€]' }] },
        {
          id: 42,
          establishment_id: 'est-1',
          permissions: ['pos_apply_remise'],
          role: 'staff',
        }
      ),
      buildResponse(),
      next
    );
    expect(next).toHaveBeenCalled();
  });

  it('still gates manual Happy Hour, Offert and Perso', async () => {
    const res = buildResponse();
    await assertPosOrderLinePermissions()(
      buildRequest(
        {
          items: [{ description: '[Offert]', is_manual_happy_hour: true }],
        },
        { id: 7, establishment_id: 'est-1', permissions: ['access_pos'], role: 'staff' }
      ),
      res,
      vi.fn()
    );
    expect(res.statusCode).toBe(403);
    expect(String(res.body && (res.body as { error?: string }).error)).toMatch(
      /Happy Hour manuel/
    );
  });

  it('does not accept account JWT grants without a PIN actor', async () => {
    const res = buildResponse();
    const next = vi.fn();
    await assertPosOrderLinePermissions()(
      buildRequest({ items: [{ description: '[Offert]' }] }),
      res,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});
