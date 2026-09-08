import React, {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  usePinSessions,
  type PinActorState,
} from './PinSessionsContext';
import * as floorApi from '../services/api/floor';
import { pinActorHasPermission } from '../utils/pinSessionPermissions';
import {
  clearElevationScopes,
  clearTransientElevation,
  closeElevationScope,
  hasElevationScope,
  openElevationScope,
  registerSessionTokenProvider,
  setTransientElevation,
} from '../services/pinElevation';

const LazyPinPadDialog = React.lazy(() => import('../components/POS/PinPadDialog'));

type SessionRequest = {
  kind: 'session';
  resolve: (actor: PinActorState) => void;
  reject: (err: Error) => void;
};

type PermissionRequest = {
  kind: 'permission';
  /** Any one of these authorizes the request. */
  permissions: string[];
  elevation: ElevationKind;
  title: string;
  description: string;
  resolve: (actor: PinActorState) => void;
  reject: (err: Error) => void;
};

type PendingRequest = SessionRequest | PermissionRequest;

/** How long a step-up authorization survives: one request, or until the page is left. */
type ElevationKind = 'action' | 'scope';

interface StepUpAuthContextValue {
  /** Ensure an active PIN session exists (opens session pad if needed). */
  ensureSession: (opts?: { message?: string }) => Promise<PinActorState>;
  /**
   * Single action step-up: if the active session holds `permission`, return its actor;
   * otherwise prompt for a PIN that holds the right. The authorization applies to the next
   * request only — the next click prompts again. Does not open a session tab.
   */
  ensurePermission: (
    permission: string | string[],
    opts?: { title?: string; description?: string }
  ) => Promise<PinActorState>;
  /**
   * Page-scoped step-up: same prompt, but the authorization stays open so the page's own
   * reads and writes keep working. Release it when leaving the page.
   */
  ensureAccess: (
    permission: string | string[],
    opts?: { title?: string; description?: string }
  ) => Promise<PinActorState>;
  /** True when the active session holds one of `permission` or a scope is open for it. */
  hasAccess: (permission: string | string[]) => boolean;
  releaseAccess: (permission: string) => void;
  releaseAllAccess: () => void;
}

const StepUpAuthContext = createContext<StepUpAuthContextValue | null>(null);

function toActor(result: floorApi.PinVerifyResult): PinActorState {
  return {
    token: result.pin_actor_token,
    userId: result.user_id,
    displayName: result.display_name,
    email: result.email,
    role: result.role,
    permissions: result.permissions ?? [],
  };
}

export function StepUpAuthProvider({ children }: { children: ReactNode }) {
  const { activeSession, activeSessionId, addOrFocusSession } = usePinSessions();
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [openScopes, setOpenScopes] = useState<string[]>([]);
  const scopeActorsRef = useRef<Map<string, PinActorState>>(new Map());
  const scopesSessionRef = useRef<string | null>(activeSessionId);

  // The active session badge is the default identity on every API request.
  useEffect(() => {
    registerSessionTokenProvider(() => activeSession?.actor.token ?? null);
    return () => registerSessionTokenProvider(null);
  }, [activeSession]);

  // Switching badge drops every step-up authorization obtained under the previous one.
  useEffect(() => {
    if (scopesSessionRef.current !== activeSessionId) {
      scopesSessionRef.current = activeSessionId;
      clearElevationScopes();
      clearTransientElevation();
      scopeActorsRef.current.clear();
      setOpenScopes([]);
    }
  }, [activeSessionId]);

  const closePending = useCallback((err?: Error) => {
    setPending((cur) => {
      if (cur && err) cur.reject(err);
      return null;
    });
  }, []);

  const ensureSession = useCallback(
    (opts?: { message?: string }) => {
      if (activeSession?.actor) {
        return Promise.resolve(activeSession.actor);
      }
      return new Promise<PinActorState>((resolve, reject) => {
        setPending({
          kind: 'session',
          resolve,
          reject,
        });
        void opts;
      });
    },
    [activeSession]
  );

  const requestElevation = useCallback(
    (
      permission: string | string[],
      elevation: ElevationKind,
      opts?: { title?: string; description?: string }
    ) => {
      const permissions = Array.isArray(permission) ? permission : [permission];
      if (
        activeSession?.actor &&
        permissions.some((p) => pinActorHasPermission(activeSession.actor, p))
      ) {
        return Promise.resolve(activeSession.actor);
      }
      if (elevation === 'scope') {
        for (const p of permissions) {
          const openScopeActor = scopeActorsRef.current.get(p);
          if (openScopeActor && hasElevationScope(p)) {
            return Promise.resolve(openScopeActor);
          }
        }
      }
      return new Promise<PinActorState>((resolve, reject) => {
        setPending({
          kind: 'permission',
          permissions,
          elevation,
          title: opts?.title ?? 'Autorisation requise',
          description:
            opts?.description ??
            (elevation === 'action'
              ? 'Un profil disposant du droit doit saisir son PIN (autorisation ponctuelle).'
              : 'Un profil disposant du droit doit saisir son PIN pour ouvrir cette page.'),
          resolve,
          reject,
        });
      });
    },
    [activeSession]
  );

  const ensurePermission = useCallback(
    (permission: string | string[], opts?: { title?: string; description?: string }) =>
      requestElevation(permission, 'action', opts),
    [requestElevation]
  );

  const ensureAccess = useCallback(
    (permission: string | string[], opts?: { title?: string; description?: string }) =>
      requestElevation(permission, 'scope', opts),
    [requestElevation]
  );

  const hasAccess = useCallback(
    (permission: string | string[]) => {
      const permissions = Array.isArray(permission) ? permission : [permission];
      return permissions.some(
        (p) =>
          (activeSession?.actor != null && pinActorHasPermission(activeSession.actor, p)) ||
          openScopes.includes(p)
      );
    },
    [activeSession, openScopes]
  );

  const releaseAccess = useCallback((permission: string) => {
    closeElevationScope(permission);
    scopeActorsRef.current.delete(permission);
    setOpenScopes((prev) => (prev.includes(permission) ? prev.filter((p) => p !== permission) : prev));
  }, []);

  const releaseAllAccess = useCallback(() => {
    clearElevationScopes();
    scopeActorsRef.current.clear();
    setOpenScopes([]);
  }, []);

  const handleVerify = useCallback(
    async (pin: string) => {
      if (!pending) return;
      const result = await floorApi.verifyPin(pin);
      const actor = toActor(result);

      if (pending.kind === 'session') {
        addOrFocusSession(actor);
        pending.resolve(actor);
        setPending(null);
        return;
      }

      const held = pending.permissions.filter((p) => pinActorHasPermission(actor, p));
      if (held.length === 0) {
        throw new Error('Ce PIN n’a pas le droit requis pour cette action');
      }

      if (pending.elevation === 'scope') {
        for (const permission of held) {
          openElevationScope(permission, actor.token);
          scopeActorsRef.current.set(permission, actor);
        }
        setOpenScopes((prev) => Array.from(new Set([...prev, ...held])));
      } else {
        setTransientElevation(actor.token);
      }

      pending.resolve(actor);
      setPending(null);
    },
    [pending, addOrFocusSession]
  );

  const value = useMemo<StepUpAuthContextValue>(
    () => ({
      ensureSession,
      ensurePermission,
      ensureAccess,
      hasAccess,
      releaseAccess,
      releaseAllAccess,
    }),
    [
      ensureSession,
      ensurePermission,
      ensureAccess,
      hasAccess,
      releaseAccess,
      releaseAllAccess,
    ]
  );

  const dialogOpen = pending != null;
  const isStepUp = pending?.kind === 'permission';

  return (
    <StepUpAuthContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <LazyPinPadDialog
          open={dialogOpen}
          mode="verify"
          stepUp={
            isStepUp && pending
              ? {
                  title: pending.title,
                  description: pending.description,
                }
              : pending?.kind === 'session'
                ? {
                    title: 'Session PIN requise',
                    description:
                      'Ouvrez une session PIN pour encaisser et attribuer la vente.',
                  }
                : undefined
          }
          onClose={() => closePending(new Error('cancelled'))}
          onVerify={handleVerify}
          onSetPin={async () => {
            throw new Error('Définissez le PIN depuis Administration');
          }}
          onSwitchToSet={() => undefined}
          onSwitchToVerify={() => undefined}
          hideSetPin
        />
      </Suspense>
    </StepUpAuthContext.Provider>
  );
}

export function useStepUpAuth(): StepUpAuthContextValue {
  const ctx = useContext(StepUpAuthContext);
  if (!ctx) {
    throw new Error('useStepUpAuth must be used within StepUpAuthProvider');
  }
  return ctx;
}
