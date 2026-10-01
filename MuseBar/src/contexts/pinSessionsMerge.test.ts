import { describe, expect, it } from 'vitest';
import type { ActivePinSessionDto } from '../services/api/pin';
import { mergeServerSessions, isSessionUnlocked } from './pinSessionsMerge';
import type { PinActorState, PinSessionsState } from './pinSessionsState';

function actor(userId: number, overrides: Partial<PinActorState> = {}): PinActorState {
  return {
    token: 'tok',
    userId,
    displayName: `User ${userId}`,
    email: `u${userId}@ex.com`,
    role: 'staff',
    permissions: ['access_pos'],
    sessionId: `sid-${userId}`,
    ...overrides,
  };
}

function remote(partial: Partial<ActivePinSessionDto> & Pick<ActivePinSessionDto, 'id' | 'user_id'>): ActivePinSessionDto {
  return {
    display_name: `User ${partial.user_id}`,
    email: `u${partial.user_id}@ex.com`,
    opened_by_user_id: 1,
    opened_by_email: 'shell@ex.com',
    opened_at: '2026-01-01T00:00:00Z',
    last_seen_at: '2026-01-01T00:00:00Z',
    expires_at: '2026-01-02T00:00:00Z',
    ...partial,
  };
}

describe('mergeServerSessions', () => {
  it('shows remote badges without a local token as locked placeholders', () => {
    const local: PinSessionsState = { sessions: [], activeSessionId: null };
    const next = mergeServerSessions(local, [remote({ id: 'sid-1', user_id: 9 })]);
    expect(next.sessions).toHaveLength(1);
    expect(next.sessions[0]?.id).toBe('sid-1');
    expect(isSessionUnlocked(next.sessions[0]!)).toBe(false);
    expect(next.activeSessionId).toBeNull();
  });

  it('keeps local unlock + cart when the server lists the same sid', () => {
    const local: PinSessionsState = {
      sessions: [
        {
          id: 'sid-1',
          actor: actor(9, { sessionId: 'sid-1' }),
          cart: [{ id: 'line' } as never],
          activeTable: null,
        },
      ],
      activeSessionId: 'sid-1',
    };
    const next = mergeServerSessions(local, [remote({ id: 'sid-1', user_id: 9 })]);
    expect(isSessionUnlocked(next.sessions[0]!)).toBe(true);
    expect(next.sessions[0]?.cart).toHaveLength(1);
    expect(next.activeSessionId).toBe('sid-1');
  });

  it('keeps a just-unlocked local session missing from a stale remote list', () => {
    const now = 1_000_000;
    const local: PinSessionsState = {
      sessions: [
        {
          id: 'sid-new',
          actor: actor(3, { sessionId: 'sid-new' }),
          cart: [],
          activeTable: null,
          localUnlockedAt: now - 1_000,
        },
      ],
      activeSessionId: 'sid-new',
    };
    const next = mergeServerSessions(local, [], now);
    expect(next.sessions.map((s) => s.id)).toEqual(['sid-new']);
    expect(next.activeSessionId).toBe('sid-new');
  });

  it('drops an unlocked local session closed on another device after the grace window', () => {
    const now = 1_000_000;
    const local: PinSessionsState = {
      sessions: [
        {
          id: 'sid-gone',
          actor: actor(3, { sessionId: 'sid-gone' }),
          cart: [{ id: 'line' } as never],
          activeTable: null,
          localUnlockedAt: now - 60_000,
        },
      ],
      activeSessionId: 'sid-gone',
    };
    const next = mergeServerSessions(local, [], now);
    expect(next.sessions).toHaveLength(0);
    expect(next.activeSessionId).toBeNull();
  });

  it('collapses multiple remote rows for the same PIN user into one tab', () => {
    const local: PinSessionsState = { sessions: [], activeSessionId: null };
    const next = mergeServerSessions(local, [
      remote({ id: 'sid-new', user_id: 9, last_seen_at: '2026-01-02T00:00:00Z' }),
      remote({ id: 'sid-old', user_id: 9, last_seen_at: '2026-01-01T00:00:00Z' }),
    ]);
    expect(next.sessions).toHaveLength(1);
    expect(next.sessions[0]?.id).toBe('sid-new');
  });

  it('rebases a local unlock onto the canonical remote sid for the same user', () => {
    const local: PinSessionsState = {
      sessions: [
        {
          id: 'sid-stale',
          actor: actor(9, { sessionId: 'sid-stale' }),
          cart: [{ id: 'line' } as never],
          activeTable: null,
          localUnlockedAt: 1_000_000,
        },
      ],
      activeSessionId: 'sid-stale',
    };
    const next = mergeServerSessions(local, [
      remote({ id: 'sid-canonical', user_id: 9, last_seen_at: '2026-01-02T00:00:00Z' }),
    ]);
    expect(next.sessions).toHaveLength(1);
    expect(next.sessions[0]?.id).toBe('sid-canonical');
    expect(isSessionUnlocked(next.sessions[0]!)).toBe(true);
    expect(next.sessions[0]?.cart).toHaveLength(1);
    expect(next.activeSessionId).toBe('sid-canonical');
  });

  it('does not focus a locked remote tab', () => {
    const local: PinSessionsState = {
      sessions: [],
      activeSessionId: 'sid-1',
    };
    const next = mergeServerSessions(local, [remote({ id: 'sid-1', user_id: 9 })]);
    expect(next.activeSessionId).toBeNull();
  });
});
