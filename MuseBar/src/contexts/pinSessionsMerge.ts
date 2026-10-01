/**
 * Merge establishment-wide open badges (API) with this device's unlocked actors/carts.
 * One tab per PIN user (server already dedupes; FE still collapses by user_id).
 */

import type { ActivePinSessionDto } from '../services/api/pin';
import {
  EMPTY_PIN_SESSIONS,
  type PinSession,
  type PinSessionsState,
} from './pinSessionsState';

/** Keep a just-verified badge if the list poll raced ahead of the insert. */
export const REMOTE_OPEN_GRACE_MS = 10_000;

export function isSessionUnlocked(session: PinSession): boolean {
  return Boolean(session.actor.token);
}

/** Keeps the first row per user_id (caller should pass latest-first). */
export function dedupeRemoteByUser(remote: ActivePinSessionDto[]): ActivePinSessionDto[] {
  const seen = new Set<number>();
  const out: ActivePinSessionDto[] = [];
  for (const row of remote) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    out.push(row);
  }
  return out;
}

function remotePlaceholder(remote: ActivePinSessionDto, prior?: PinSession): PinSession {
  return {
    id: remote.id,
    actor: {
      token: '',
      userId: remote.user_id,
      displayName: remote.display_name,
      email: remote.email,
      role: 'staff',
      permissions: [],
      sessionId: remote.id,
      expiresAt: null,
    },
    cart: prior?.cart ?? [],
    activeTable: prior?.activeTable ?? null,
  };
}

/**
 * Builds the tab list: every open server session (≤1 per user), with local unlock/cart.
 * Unlocked locals missing from the server are kept only briefly (verify race).
 */
export function mergeServerSessions(
  local: PinSessionsState,
  remote: ActivePinSessionDto[],
  nowMs: number = Date.now()
): PinSessionsState {
  const remoteUnique = dedupeRemoteByUser(
    [...remote].sort(
      (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
    )
  );

  const localBySid = new Map<string, PinSession>();
  const localUnlockedByUser = new Map<number, PinSession>();
  for (const session of local.sessions) {
    const sid = session.actor.sessionId ?? session.id;
    localBySid.set(sid, session);
    if (isSessionUnlocked(session)) {
      localUnlockedByUser.set(session.actor.userId, session);
    }
  }

  const sessions: PinSession[] = remoteUnique.map((row) => {
    const prior = localBySid.get(row.id) ?? localUnlockedByUser.get(row.user_id);
    if (prior && isSessionUnlocked(prior)) {
      return {
        ...prior,
        id: row.id,
        actor: {
          ...prior.actor,
          sessionId: row.id,
          userId: row.user_id,
          displayName: row.display_name,
          email: row.email || prior.actor.email,
        },
      };
    }
    return remotePlaceholder(row, prior);
  });

  const seenUsers = new Set(sessions.map((s) => s.actor.userId));
  const seenSids = new Set(sessions.map((s) => s.id));
  for (const session of local.sessions) {
    if (!isSessionUnlocked(session)) continue;
    if (seenUsers.has(session.actor.userId)) continue;
    const sid = session.actor.sessionId ?? session.id;
    if (seenSids.has(sid)) continue;
    const unlockedAt = session.localUnlockedAt ?? 0;
    if (nowMs - unlockedAt > REMOTE_OPEN_GRACE_MS) continue;
    sessions.push({ ...session, id: sid });
    seenUsers.add(session.actor.userId);
    seenSids.add(sid);
  }

  const requested = local.activeSessionId;
  const activeSessionId =
    requested && sessions.some((s) => s.id === requested && isSessionUnlocked(s))
      ? requested
      : sessions.find((s) => isSessionUnlocked(s))?.id ?? null;

  if (sessions.length === 0) return EMPTY_PIN_SESSIONS;
  return { sessions, activeSessionId };
}
