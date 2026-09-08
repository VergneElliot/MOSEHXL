import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { actorTrace, resolveActor } from './actorContext';

function requestWith(overrides: Partial<Request>): Request {
  return { headers: {}, ...overrides } as Request;
}

const ACCOUNT = {
  id: 7,
  email: 'manager@example.com',
  is_admin: false,
  role: 'staff',
  establishment_id: 'est-1',
};

describe('resolveActor', () => {
  it('records both identities when a badge acted on a logged-in account', () => {
    const actor = resolveActor(
      requestWith({
        user: ACCOUNT,
        pinActor: {
          token_use: 'pin_actor',
          id: 12,
          email: 'server@example.com',
          role: 'staff',
          establishment_id: 'est-1',
          display_name: 'Besservex',
          permissions: [],
          sid: 'sid-1',
        },
      } as Partial<Request>)
    );

    expect(actor).toEqual({
      accountUserId: 7,
      accountEmail: 'manager@example.com',
      pinUserId: 12,
      pinDisplayName: 'Besservex',
      pinSessionId: 'sid-1',
      establishmentId: 'est-1',
    });
  });

  it('leaves the PIN half null when the account acted on its own', () => {
    const actor = resolveActor(requestWith({ user: ACCOUNT } as Partial<Request>));
    expect(actor.accountUserId).toBe(7);
    expect(actor.pinUserId).toBeNull();
    expect(actor.pinSessionId).toBeNull();
  });

  it('produces a flat trace payload for JSONB columns', () => {
    const trace = actorTrace({
      accountUserId: 7,
      accountEmail: 'manager@example.com',
      pinUserId: 12,
      pinDisplayName: 'Besservex',
      pinSessionId: 'sid-1',
      establishmentId: 'est-1',
    });

    expect(trace).toEqual({
      account_user_id: 7,
      account_email: 'manager@example.com',
      pin_user_id: 12,
      pin_display_name: 'Besservex',
      pin_session_id: 'sid-1',
    });
  });
});
