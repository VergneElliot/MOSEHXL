import type { OrderItem } from '../types';

export interface PinActorState {
  token: string;
  userId: number;
  displayName: string;
  email: string;
  role: string;
  permissions: string[];
  /** Epoch ms when the PIN actor token stops being accepted by the API. */
  expiresAt?: number | null;
  /** Server-side badge session (`sid` claim); closing it revokes the token. */
  sessionId?: string | null;
}

export interface ActiveTableState {
  id: number;
  label: string;
  floorPlanId: number;
  ticketId: number;
  assignedWaiterUserId?: number | null;
  assignedWaiterDisplayName?: string | null;
}

export interface PinSession {
  id: string;
  actor: PinActorState;
  cart: OrderItem[];
  activeTable: ActiveTableState | null;
}

/** Sessions plus focus, kept in one object so every transition is atomic. */
export interface PinSessionsState {
  sessions: PinSession[];
  activeSessionId: string | null;
}

export type PinSessionPatch = Partial<Pick<PinSession, 'cart' | 'activeTable' | 'actor'>>;

export const EMPTY_PIN_SESSIONS: PinSessionsState = { sessions: [], activeSessionId: null };

export function newSessionId(): string {
  return `pin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function decodeBase64Url(segment: string): string | null {
  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  } catch {
    return null;
  }
}

/** Reads a PIN actor JWT payload without verifying it (display purposes only). */
function readTokenPayload(token: string): Record<string, unknown> | null {
  const payloadSegment = typeof token === 'string' ? token.split('.')[1] : undefined;
  if (!payloadSegment) return null;
  const json = decodeBase64Url(payloadSegment);
  if (!json) return null;
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function readTokenExpiryMs(token: string): number | null {
  const exp = readTokenPayload(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
}

export function readTokenSessionId(token: string): string | null {
  const sid = readTokenPayload(token)?.sid;
  return typeof sid === 'string' && sid.length > 0 ? sid : null;
}

/** Fills `expiresAt` and `sessionId` from the token so callers never have to. */
export function withTokenExpiry(actor: PinActorState): PinActorState {
  const expiresAt =
    typeof actor.expiresAt === 'number' ? actor.expiresAt : readTokenExpiryMs(actor.token);
  const sessionId = actor.sessionId ?? readTokenSessionId(actor.token);
  if (expiresAt === actor.expiresAt && sessionId === actor.sessionId) return actor;
  return { ...actor, expiresAt, sessionId };
}

export function isActorExpired(actor: PinActorState, nowMs: number = Date.now()): boolean {
  return typeof actor.expiresAt === 'number' && actor.expiresAt <= nowMs;
}

export function isSessionExpired(
  session: PinSession | null,
  nowMs: number = Date.now()
): boolean {
  return session != null && isActorExpired(session.actor, nowMs);
}

/**
 * Adds a session for `actor`, or refreshes the existing one for the same user.
 * The result is always focused on the resulting session.
 */
export function addOrFocusSession(
  state: PinSessionsState,
  actor: PinActorState,
  id: string
): PinSessionsState {
  const withExpiry = withTokenExpiry(actor);
  const existing = state.sessions.find((s) => s.actor.userId === withExpiry.userId);
  if (existing) {
    return {
      sessions: state.sessions.map((s) =>
        s.id === existing.id ? { ...s, actor: withExpiry } : s
      ),
      activeSessionId: existing.id,
    };
  }
  return {
    sessions: [...state.sessions, { id, actor: withExpiry, cart: [], activeTable: null }],
    activeSessionId: id,
  };
}

/** Id that `addOrFocusSession` would end up focusing, without applying it. */
export function resolveSessionId(
  state: PinSessionsState,
  userId: number,
  candidateId: string
): string {
  return state.sessions.find((s) => s.actor.userId === userId)?.id ?? candidateId;
}

export function focusSession(state: PinSessionsState, id: string | null): PinSessionsState {
  if (state.activeSessionId === id) return state;
  if (id != null && !state.sessions.some((s) => s.id === id)) return state;
  return { ...state, activeSessionId: id };
}

/** No-op when the session is gone, so late writes cannot resurrect a closed tab. */
export function patchSession(
  state: PinSessionsState,
  id: string,
  patch: PinSessionPatch
): PinSessionsState {
  if (!state.sessions.some((s) => s.id === id)) return state;
  return {
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === id ? { ...s, ...patch, actor: patch.actor ? withTokenExpiry(patch.actor) : s.actor } : s
    ),
  };
}

export function dismissSession(state: PinSessionsState, id: string): PinSessionsState {
  if (!state.sessions.some((s) => s.id === id)) return state;
  const sessions = state.sessions.filter((s) => s.id !== id);
  const activeSessionId =
    state.activeSessionId === id
      ? sessions[sessions.length - 1]?.id ?? null
      : state.activeSessionId;
  return { sessions, activeSessionId };
}

/** Normalizes a persisted or legacy payload, dropping anything unusable. */
export function normalizeState(input: unknown): PinSessionsState {
  const parsed = input as { sessions?: unknown; activeSessionId?: unknown } | null;
  const rawSessions = Array.isArray(parsed?.sessions) ? parsed!.sessions : [];
  const sessions: PinSession[] = [];
  for (const candidate of rawSessions) {
    const s = candidate as PinSession | null;
    if (!s || typeof s.id !== 'string' || !s.actor?.token || typeof s.actor.userId !== 'number') {
      continue;
    }
    sessions.push({
      id: s.id,
      actor: withTokenExpiry({ ...s.actor, permissions: s.actor.permissions ?? [] }),
      cart: Array.isArray(s.cart) ? s.cart : [],
      activeTable: s.activeTable ?? null,
    });
  }
  const requested = typeof parsed?.activeSessionId === 'string' ? parsed.activeSessionId : null;
  const activeSessionId =
    requested && sessions.some((s) => s.id === requested)
      ? requested
      : sessions[0]?.id ?? null;
  return { sessions, activeSessionId };
}
