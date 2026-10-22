import { describe, expect, it } from 'vitest';
import type { PinVerifyResult } from '../services/api/pin';
import { pinActorFromVerify } from './pinActorFromVerify';

function fakeToken(sid?: string): string {
  const payload: Record<string, unknown> = {};
  if (sid != null) payload.sid = sid;
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.sig`;
}

function verify(partial: Partial<PinVerifyResult> & Pick<PinVerifyResult, 'user_id' | 'pin_actor_token'>): PinVerifyResult {
  return {
    email: 'u@ex.com',
    role: 'staff',
    display_name: 'User',
    permissions: ['access_pos'],
    ...partial,
  };
}

describe('pinActorFromVerify', () => {
  it('maps verify fields onto PinActorState', () => {
    const actor = pinActorFromVerify(
      verify({
        user_id: 7,
        pin_actor_token: 'tok',
        pin_session_id: 'sid-7',
        display_name: 'Alice',
        email: 'a@ex.com',
        role: 'establishment_admin',
        permissions: ['access_settings'],
      })
    );
    expect(actor).toEqual({
      token: 'tok',
      userId: 7,
      displayName: 'Alice',
      email: 'a@ex.com',
      role: 'establishment_admin',
      permissions: ['access_settings'],
      sessionId: 'sid-7',
    });
  });

  it('falls back to JWT sid when pin_session_id is absent', () => {
    const actor = pinActorFromVerify(
      verify({ user_id: 1, pin_actor_token: fakeToken('from-jwt') })
    );
    expect(actor.sessionId).toBe('from-jwt');
  });

  it('prefers pin_session_id over the JWT claim', () => {
    const actor = pinActorFromVerify(
      verify({
        user_id: 1,
        pin_actor_token: fakeToken('from-jwt'),
        pin_session_id: 'from-body',
      })
    );
    expect(actor.sessionId).toBe('from-body');
  });

  it('defaults missing permissions to an empty list', () => {
    const actor = pinActorFromVerify(
      verify({
        user_id: 1,
        pin_actor_token: 'tok',
        permissions: undefined as unknown as string[],
      })
    );
    expect(actor.permissions).toEqual([]);
  });
});
