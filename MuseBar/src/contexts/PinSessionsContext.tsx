import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { OrderItem } from '../types';

export interface PinActorState {
  token: string;
  userId: number;
  displayName: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface ActiveTableState {
  id: number;
  label: string;
  floorPlanId: number;
  ticketId: number;
}

export interface PinSession {
  id: string;
  actor: PinActorState;
  cart: OrderItem[];
  activeTable: ActiveTableState | null;
}

interface PinSessionsContextValue {
  sessions: PinSession[];
  activeSessionId: string | null;
  activeSession: PinSession | null;
  setActiveSessionId: (id: string | null) => void;
  addOrFocusSession: (actor: PinActorState) => string;
  dismissSession: (id: string) => void;
  dismissActiveSession: () => void;
  updateSession: (
    id: string,
    patch: Partial<Pick<PinSession, 'cart' | 'activeTable' | 'actor'>>
  ) => void;
  updateActiveSession: (
    patch: Partial<Pick<PinSession, 'cart' | 'activeTable' | 'actor'>>
  ) => void;
}

const STORAGE_KEY = 'mosehxl.pinSessions.v1';

function newSessionId(): string {
  return `pin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStored(): { sessions: PinSession[]; activeSessionId: string | null } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migrate legacy single actor
      const legacy = sessionStorage.getItem('mosehxl.pinActor');
      if (legacy) {
        const actor = JSON.parse(legacy) as PinActorState;
        if (actor?.token && actor.userId) {
          const id = newSessionId();
          const sessions = [{ id, actor, cart: [], activeTable: null }];
          sessionStorage.removeItem('mosehxl.pinActor');
          return { sessions, activeSessionId: id };
        }
      }
      return { sessions: [], activeSessionId: null };
    }
    const parsed = JSON.parse(raw) as {
      sessions?: PinSession[];
      activeSessionId?: string | null;
    };
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    const activeSessionId =
      parsed.activeSessionId && sessions.some((s) => s.id === parsed.activeSessionId)
        ? parsed.activeSessionId
        : sessions[0]?.id ?? null;
    return { sessions, activeSessionId };
  } catch {
    return { sessions: [], activeSessionId: null };
  }
}

function writeStored(sessions: PinSession[], activeSessionId: string | null): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, activeSessionId }));
  } catch {
    // ignore
  }
}

const PinSessionsContext = createContext<PinSessionsContextValue | null>(null);

export function PinSessionsProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => readStored(), []);
  const [sessions, setSessions] = useState<PinSession[]>(initial.sessions);
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(
    initial.activeSessionId
  );

  const persist = useCallback((nextSessions: PinSession[], nextActive: string | null) => {
    setSessions(nextSessions);
    setActiveSessionIdState(nextActive);
    writeStored(nextSessions, nextActive);
  }, []);

  const setActiveSessionId = useCallback(
    (id: string | null) => {
      persist(sessions, id);
    },
    [persist, sessions]
  );

  const addOrFocusSession = useCallback(
    (actor: PinActorState) => {
      const existing = sessions.find((s) => s.actor.userId === actor.userId);
      if (existing) {
        const next = sessions.map((s) =>
          s.id === existing.id ? { ...s, actor } : s
        );
        persist(next, existing.id);
        return existing.id;
      }
      const id = newSessionId();
      const session: PinSession = {
        id,
        actor,
        cart: [],
        activeTable: null,
      };
      persist([...sessions, session], id);
      return id;
    },
    [persist, sessions]
  );

  const dismissSession = useCallback(
    (id: string) => {
      const next = sessions.filter((s) => s.id !== id);
      const nextActive =
        activeSessionId === id ? next[next.length - 1]?.id ?? null : activeSessionId;
      persist(next, nextActive);
    },
    [activeSessionId, persist, sessions]
  );

  const dismissActiveSession = useCallback(() => {
    if (activeSessionId) dismissSession(activeSessionId);
  }, [activeSessionId, dismissSession]);

  const updateSession = useCallback(
    (id: string, patch: Partial<Pick<PinSession, 'cart' | 'activeTable' | 'actor'>>) => {
      const next = sessions.map((s) => (s.id === id ? { ...s, ...patch } : s));
      persist(next, activeSessionId);
    },
    [activeSessionId, persist, sessions]
  );

  const updateActiveSession = useCallback(
    (patch: Partial<Pick<PinSession, 'cart' | 'activeTable' | 'actor'>>) => {
      if (!activeSessionId) return;
      updateSession(activeSessionId, patch);
    },
    [activeSessionId, updateSession]
  );

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const value = useMemo<PinSessionsContextValue>(
    () => ({
      sessions,
      activeSessionId,
      activeSession,
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
