import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  addOrFocusSession as addOrFocusSessionState,
  dismissSession as dismissSessionState,
  focusSession as focusSessionState,
  isActorExpired,
  newSessionId,
  normalizeState,
  patchSession as patchSessionState,
  readTokenSessionId,
  resolveSessionId,
  withTokenExpiry,
  EMPTY_PIN_SESSIONS,
  type PinActorState,
  type PinSession,
  type PinSessionPatch,
  type PinSessionsState,
} from './pinSessionsState';
import { closePinSession } from '../services/api/pin';
import { registerSessionTokenProvider } from '../services/pinElevation';
import { usePinSessionsRemoteSync } from './usePinSessionsRemoteSync';

export type {
  PinActorState,
  ActiveTableState,
  PinSession,
} from './pinSessionsState';

interface PinSessionsContextValue {
  sessions: PinSession[];
  activeSessionId: string | null;
  activeSession: PinSession | null;
  /** Ids whose PIN actor token has expired — kept visible so staff can re-badge. */
  expiredSessionIds: string[];
  activeSessionExpired: boolean;
  setActiveSessionId: (id: string | null) => void;
  addOrFocusSession: (actor: PinActorState) => string;
  /** Removes a tab locally only (after a successful remote close, or soft cleanup). */
  dismissLocalSession: (id: string) => void;
  /**
   * Closes the server badge with the given PIN actor token, then drops the local tab.
   * Throws on API errors (e.g. open tables) so the UI can keep the tab.
   */
  closeSessionAsPinUser: (sessionId: string, pinActorToken: string) => Promise<void>;
  /** @deprecated Prefer PIN-gated close via header; still used to clear the focused badge. */
  dismissActiveSession: () => void;
  updateSession: (id: string, patch: PinSessionPatch) => void;
  updateActiveSession: (patch: PinSessionPatch) => void;
  /** Refetch establishment-wide open badges and merge into local state. */
  refreshRemoteSessions: () => Promise<void>;
  isSyncingRemoteSessions: boolean;
}

const STORAGE_KEY = 'mosehxl.pinSessions.v2';
const LEGACY_V1_KEY = 'mosehxl.pinSessions.v1';
const LEGACY_ACTOR_KEY = 'mosehxl.pinActor';
const EXPIRY_TICK_MS = 30_000;

function persistableState(state: PinSessionsState): PinSessionsState {
  const sessions = state.sessions.filter((s) => Boolean(s.actor.token));
  const activeSessionId =
    state.activeSessionId && sessions.some((s) => s.id === state.activeSessionId)
      ? state.activeSessionId
      : sessions[0]?.id ?? null;
  return { sessions, activeSessionId };
}

function readStored(): PinSessionsState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(LEGACY_V1_KEY);
    if (raw) {
      const normalized = normalizeState(JSON.parse(raw));
      if (sessionStorage.getItem(LEGACY_V1_KEY) && !sessionStorage.getItem(STORAGE_KEY)) {
        sessionStorage.removeItem(LEGACY_V1_KEY);
        writeStored(normalized);
      }
      return normalized;
    }

    const legacy = sessionStorage.getItem(LEGACY_ACTOR_KEY);
    if (legacy) {
      const actor = withTokenExpiry(JSON.parse(legacy) as PinActorState);
      sessionStorage.removeItem(LEGACY_ACTOR_KEY);
      const id = actor.sessionId ?? readTokenSessionId(actor.token) ?? newSessionId();
      return normalizeState({
        sessions: [{ id, actor, cart: [], activeTable: null }],
      });
    }
    return EMPTY_PIN_SESSIONS;
  } catch {
    return EMPTY_PIN_SESSIONS;
  }
}

function writeStored(state: PinSessionsState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState(state)));
  } catch {
    // sessionStorage unavailable (private mode / quota) — state stays in memory
  }
}

const PinSessionsContext = createContext<PinSessionsContextValue | null>(null);

export function PinSessionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PinSessionsState>(readStored);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { refreshRemoteSessions, isSyncing } = usePinSessionsRemoteSync(setState);

  /**
   * Mirrors committed state for callbacks that must return a value synchronously.
   * All mutations still go through functional updates, so a stale read can never
   * drop a concurrently opened session.
   */
  const stateRef = useRef(state);
  stateRef.current = state;

  // Render-time registration so child effects (catalog fetch) already see the PIN token.
  registerSessionTokenProvider(() => {
    const token = stateRef.current.sessions.find(
      (s) => s.id === stateRef.current.activeSessionId
    )?.actor.token;
    return token || null;
  });

  useEffect(() => {
    writeStored(state);
    return () => registerSessionTokenProvider(null);
  }, [state]);

  const hasExpiringSession = state.sessions.some(
    (s) => typeof s.actor.expiresAt === 'number'
  );

  useEffect(() => {
    if (!hasExpiringSession) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), EXPIRY_TICK_MS);
    return () => window.clearInterval(timer);
  }, [hasExpiringSession]);

  const setActiveSessionId = useCallback((id: string | null) => {
    setState((prev) => focusSessionState(prev, id));
  }, []);

  const addOrFocusSession = useCallback((actor: PinActorState) => {
    const stamped = withTokenExpiry(actor);
    const candidateId = stamped.sessionId ?? newSessionId();
    setState((prev) => addOrFocusSessionState(prev, stamped, candidateId));
    setNowMs(Date.now());
    void refreshRemoteSessions();
    return resolveSessionId(
      stateRef.current,
      stamped.userId,
      candidateId,
      stamped.sessionId
    );
  }, [refreshRemoteSessions]);

  /**
   * Best-effort remote close for the focused unlocked badge (floor clear).
   * Header tab close uses PIN-gated `closeSessionAsPinUser` instead.
   */
  const closeRemoteSession = useCallback((id: string) => {
    const session = stateRef.current.sessions.find((s) => s.id === id);
    const sessionId = session?.actor.sessionId ?? id;
    const token = session?.actor.token || undefined;
    if (!sessionId) return;
    void closePinSession(sessionId, token)
      .catch(() => undefined)
      .finally(() => {
        void refreshRemoteSessions();
      });
  }, [refreshRemoteSessions]);

  const dismissLocalSession = useCallback((id: string) => {
    setState((prev) => dismissSessionState(prev, id));
  }, []);

  const closeSessionAsPinUser = useCallback(
    async (sessionId: string, pinActorToken: string) => {
      await closePinSession(sessionId, pinActorToken);
      setState((prev) => {
        const match =
          prev.sessions.find((s) => s.id === sessionId || s.actor.sessionId === sessionId) ??
          null;
        if (!match) return prev;
        return dismissSessionState(prev, match.id);
      });
      await refreshRemoteSessions();
    },
    [refreshRemoteSessions]
  );

  const dismissActiveSession = useCallback(() => {
    const activeId = stateRef.current.activeSessionId;
    if (activeId) closeRemoteSession(activeId);
    setState((prev) =>
      prev.activeSessionId ? dismissSessionState(prev, prev.activeSessionId) : prev
    );
  }, [closeRemoteSession]);

  const updateSession = useCallback((id: string, patch: PinSessionPatch) => {
    setState((prev) => patchSessionState(prev, id, patch));
  }, []);

  const updateActiveSession = useCallback((patch: PinSessionPatch) => {
    setState((prev) =>
      prev.activeSessionId ? patchSessionState(prev, prev.activeSessionId, patch) : prev
    );
  }, []);

  const { sessions, activeSessionId } = state;

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const expiredSessionIds = useMemo(
    () =>
      sessions
        .filter((s) => Boolean(s.actor.token) && isActorExpired(s.actor, nowMs))
        .map((s) => s.id),
    [sessions, nowMs]
  );

  const value = useMemo<PinSessionsContextValue>(
    () => ({
      sessions,
      activeSessionId,
      activeSession,
      expiredSessionIds,
      activeSessionExpired:
        activeSession != null && expiredSessionIds.includes(activeSession.id),
      setActiveSessionId,
      addOrFocusSession,
      dismissLocalSession,
      closeSessionAsPinUser,
      dismissActiveSession,
      updateSession,
      updateActiveSession,
      refreshRemoteSessions,
      isSyncingRemoteSessions: isSyncing,
    }),
    [
      sessions,
      activeSessionId,
      activeSession,
      expiredSessionIds,
      setActiveSessionId,
      addOrFocusSession,
      dismissLocalSession,
      closeSessionAsPinUser,
      dismissActiveSession,
      updateSession,
      updateActiveSession,
      refreshRemoteSessions,
      isSyncing,
    ]
  );

  return (
    <PinSessionsContext.Provider value={value}>{children}</PinSessionsContext.Provider>
  );
}

export function usePinSessions(): PinSessionsContextValue {
  const ctx = useContext(PinSessionsContext);
  if (!ctx) {
    throw new Error('usePinSessions must be used within PinSessionsProvider');
  }
  return ctx;
}
