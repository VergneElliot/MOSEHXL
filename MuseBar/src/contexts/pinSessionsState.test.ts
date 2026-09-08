import { describe, expect, it } from 'vitest';
import {
  addOrFocusSession,
  dismissSession,
  focusSession,
  isActorExpired,
  normalizeState,
  patchSession,
  readTokenExpiryMs,
  readTokenSessionId,
  resolveSessionId,
  withTokenExpiry,
  EMPTY_PIN_SESSIONS,
  type PinActorState,
  type PinSessionsState,
} from './pinSessionsState';

function fakeToken(expSeconds?: number, sid?: string): string {
  const payload: Record<string, unknown> = {};
  if (expSeconds != null) payload.exp = expSeconds;
  if (sid != null) payload.sid = sid;
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.sig`;
}

function actor(userId: number, overrides: Partial<PinActorState> = {}): PinActorState {
  return {
    token: fakeToken(),
    userId,
    displayName: `User ${userId}`,
    email: `user${userId}@example.com`,
    role: 'staff',
    permissions: ['access_pos'],
    ...overrides,
  };
}

describe('pinSessionsState — session set transitions', () => {
  it('opens a session and focuses it', () => {
    const next = addOrFocusSession(EMPTY_PIN_SESSIONS, actor(1), 'a');
    expect(next.sessions).toHaveLength(1);
    expect(next.activeSessionId).toBe('a');
  });

  it('refreshes and focuses the existing session for the same user', () => {
    const first = addOrFocusSession(EMPTY_PIN_SESSIONS, actor(1), 'a');
    const withCart = patchSession(first, 'a', { cart: [{ id: 'x' }] as never });
    const second = addOrFocusSession(
      withCart,
      actor(1, { token: fakeToken(), displayName: 'Renamed' }),
      'b'
    );

    expect(second.sessions).toHaveLength(1);
    expect(second.sessions[0]?.id).toBe('a');
    expect(second.sessions[0]?.actor.displayName).toBe('Renamed');
    expect(second.sessions[0]?.cart).toHaveLength(1);
    expect(second.activeSessionId).toBe('a');
  });

  it('keeps one tab per distinct user', () => {
    let state: PinSessionsState = EMPTY_PIN_SESSIONS;
    state = addOrFocusSession(state, actor(1), 'a');
    state = addOrFocusSession(state, actor(2), 'b');
    state = addOrFocusSession(state, actor(3), 'c');
    state = addOrFocusSession(state, actor(4), 'd');

    expect(state.sessions.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(state.activeSessionId).toBe('d');
  });

  /**
   * Regression: a cart/table write derived from a pre-add snapshot used to
   * overwrite the whole session list and erase the tab just opened.
   */
  it('never drops a concurrently opened session when patching another one', () => {
    const before = addOrFocusSession(EMPTY_PIN_SESSIONS, actor(1), 'a');
    const afterAdd = addOrFocusSession(before, actor(2), 'b');

    const stalePatch = { cart: [{ id: 'line-1' }] as never };
    const result = patchSession(afterAdd, 'a', stalePatch);

    expect(result.sessions.map((s) => s.id)).toEqual(['a', 'b']);
    expect(result.sessions[0]?.cart).toHaveLength(1);
    expect(result.sessions[1]?.cart).toHaveLength(0);
  });

  it('ignores patches for sessions that no longer exist', () => {
    const state = addOrFocusSession(EMPTY_PIN_SESSIONS, actor(1), 'a');
    const closed = dismissSession(state, 'a');
    const late = patchSession(closed, 'a', { cart: [{ id: 'x' }] as never });

    expect(late).toBe(closed);
    expect(late.sessions).toHaveLength(0);
  });

  it('falls back to the last session when the focused one is closed', () => {
    let state: PinSessionsState = EMPTY_PIN_SESSIONS;
    state = addOrFocusSession(state, actor(1), 'a');
    state = addOrFocusSession(state, actor(2), 'b');
    state = focusSession(state, 'a');

    const next = dismissSession(state, 'a');
    expect(next.activeSessionId).toBe('b');
  });

  it('refuses to focus an unknown session', () => {
    const state = addOrFocusSession(EMPTY_PIN_SESSIONS, actor(1), 'a');
    expect(focusSession(state, 'ghost')).toBe(state);
  });

  it('resolves the id a verify will land on', () => {
    const state = addOrFocusSession(EMPTY_PIN_SESSIONS, actor(1), 'a');
    expect(resolveSessionId(state, 1, 'candidate')).toBe('a');
    expect(resolveSessionId(state, 9, 'candidate')).toBe('candidate');
  });
});

describe('pinSessionsState — token expiry', () => {
  it('reads exp from the actor token', () => {
    expect(readTokenExpiryMs(fakeToken(1_700_000_000))).toBe(1_700_000_000_000);
  });

  it('returns null for malformed or exp-less tokens', () => {
    expect(readTokenExpiryMs('not-a-jwt')).toBeNull();
    expect(readTokenExpiryMs(fakeToken())).toBeNull();
  });

  it('stamps expiry when a session is opened', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const state = addOrFocusSession(
      EMPTY_PIN_SESSIONS,
      actor(1, { token: fakeToken(exp) }),
      'a'
    );
    expect(state.sessions[0]?.actor.expiresAt).toBe(exp * 1000);
  });

  it('flags expired actors only once the deadline passed', () => {
    const now = 1_000_000;
    expect(isActorExpired(withTokenExpiry(actor(1, { expiresAt: now + 1 })), now)).toBe(false);
    expect(isActorExpired(withTokenExpiry(actor(1, { expiresAt: now })), now)).toBe(true);
  });

  it('reads the badge session id from the token', () => {
    expect(readTokenSessionId(fakeToken(undefined, 'sid-42'))).toBe('sid-42');
    expect(readTokenSessionId(fakeToken(1_700_000_000))).toBeNull();
    expect(readTokenSessionId('not-a-jwt')).toBeNull();
  });

  it('stamps the badge session id when a session is opened', () => {
    const state = addOrFocusSession(
      EMPTY_PIN_SESSIONS,
      actor(1, { token: fakeToken(undefined, 'sid-42') }),
      'a'
    );
    expect(state.sessions[0]?.actor.sessionId).toBe('sid-42');
  });

  it('treats an actor without expiry as not expired', () => {
    expect(isActorExpired(actor(1, { expiresAt: null }))).toBe(false);
  });
});

describe('pinSessionsState — persisted payloads', () => {
  it('drops unusable entries and dangling focus', () => {
    const state = normalizeState({
      sessions: [
        { id: 'a', actor: { token: fakeToken(), userId: 1 }, cart: [], activeTable: null },
        { id: 'b', actor: { token: '' }, cart: [] },
        null,
        { actor: { token: fakeToken(), userId: 2 } },
      ],
      activeSessionId: 'gone',
    });

    expect(state.sessions.map((s) => s.id)).toEqual(['a']);
    expect(state.sessions[0]?.actor.permissions).toEqual([]);
    expect(state.activeSessionId).toBe('a');
  });

  it('survives garbage input', () => {
    expect(normalizeState(null)).toEqual(EMPTY_PIN_SESSIONS);
    expect(normalizeState({ sessions: 'nope' })).toEqual(EMPTY_PIN_SESSIONS);
  });
});
