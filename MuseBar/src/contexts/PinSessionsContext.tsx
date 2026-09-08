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
  resolveSessionId,
  EMPTY_PIN_SESSIONS,
  type PinActorState,
  type PinSession,
  type PinSessionPatch,
  type PinSessionsState,
} from './pinSessionsState';
import { closePinSession } from '../services/api/pin';

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
  dismissSession: (id: string) => void;
  dismissActiveSession: () => void;
  updateSession: (id: string, patch: PinSessionPatch) => void;
  updateActiveSession: (patch: PinSessionPatch) => void;
}

const STORAGE_KEY = 'mosehxl.pinSessions.v1';
const LEGACY_ACTOR_KEY = 'mosehxl.pinActor';
const EXPIRY_TICK_MS = 30_000;

function readStored(): PinSessionsState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));

    const legacy = sessionStorage.getItem(LEGACY_ACTOR_KEY);
    if (legacy) {
      const actor = JSON.parse(legacy) as PinActorState;
      sessionStorage.removeItem(LEGACY_ACTOR_KEY);
      return normalizeState({
        sessions: [{ id: newSessionId(), actor, cart: [], activeTable: null }],
      });
    }
    return EMPTY_PIN_SESSIONS;
  } catch {
    return EMPTY_PIN_SESSIONS;
  }
}

function writeStored(state: PinSessionsState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage unavailable (private mode / quota) — state stays in memory
  }
}

const PinSessionsContext = createContext<PinSessionsContextValue | null>(null);

export function PinSessionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PinSessionsState>(readStored);
  const [nowMs, setNowMs] = useState(() => Date.now());

  /**
   * Mirrors committed state for callbacks that must return a value synchronously.
   * All mutations still go through functional updates, so a stale read can never
   * drop a concurrently opened session.
   */
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    writeStored(state);
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
    const candidateId = newSessionId();
    setState((prev) => addOrFocusSessionState(prev, actor, candidateId));
    setNowMs(Date.now());
    return resolveSessionId(stateRef.current, actor.userId, candidateId);
  }, []);

  /**
   * Releases the server-side badge so its token stops being accepted, instead of leaving it
   * open until the 8h expiry. Failure is silent: the tab closes locally either way.
   */
  const closeRemoteSession = useCallback((id: string) => {
    const sessionId = stateRef.current.sessions.find((s) => s.id === id)?.actor.sessionId;
    if (!sessionId) return;
    void closePinSession(sessionId).catch(() => undefined);
  }, []);

  const dismissSession = useCallback(
    (id: string) => {
      closeRemoteSession(id);
      setState((prev) => dismissSessionState(prev, id));
    },
    [closeRemoteSession]
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
    () => sessions.filter((s) => isActorExpired(s.actor, nowMs)).map((s) => s.id),
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
      dismissSession,
      dismissActiveSession,
      updateSession,
      updateActiveSession,
    }),
    [
      sessions,
      activeSessionId,
      activeSession,
      expiredSessionIds,
      setActiveSessionId,
      addOrFocusSession,
      dismissSession,
      dismissActiveSession,
      updateSession,
      updateActiveSession,
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
