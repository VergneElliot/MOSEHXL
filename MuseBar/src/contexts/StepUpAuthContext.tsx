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

const LazyPinPadDialog = React.lazy(() => import('../components/POS/PinPadDialog'));

type SessionRequest = {
  kind: 'session';
  resolve: (actor: PinActorState) => void;
  reject: (err: Error) => void;
};

type PermissionRequest = {
  kind: 'permission';
  permission: string;
  title: string;
  description: string;
  resolve: (actor: PinActorState) => void;
  reject: (err: Error) => void;
};

type PendingRequest = SessionRequest | PermissionRequest;

interface StepUpAuthContextValue {
  /** Ensure an active PIN session exists (opens session pad if needed). */
  ensureSession: (opts?: { message?: string }) => Promise<PinActorState>;
  /**
   * Mode A step-up: if active session has `permission`, return it;
   * otherwise prompt for a PIN that holds the right (does not open a session tab).
   */
  ensurePermission: (
    permission: string,
    opts?: { title?: string; description?: string }
  ) => Promise<PinActorState>;
  /** One-shot grants from step-up for the current active session (cleared on session switch). */
  hasGrant: (permission: string) => boolean;
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
  const [grantByPermission, setGrantByPermission] = useState<Map<string, PinActorState>>(
    () => new Map()
  );
  const grantsSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (grantsSessionRef.current !== activeSessionId) {
      grantsSessionRef.current = activeSessionId;
      setGrantByPermission(new Map());
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

  const ensurePermission = useCallback(
    (permission: string, opts?: { title?: string; description?: string }) => {
      if (activeSession?.actor && pinActorHasPermission(activeSession.actor, permission)) {
        return Promise.resolve(activeSession.actor);
      }
      const granted = grantByPermission.get(permission);
      if (granted) {
        return Promise.resolve(granted);
      }
      return new Promise<PinActorState>((resolve, reject) => {
        setPending({
          kind: 'permission',
          permission,
          title: opts?.title ?? 'Autorisation requise',
          description:
            opts?.description ??
            'Un profil avec le droit nécessaire doit saisir son PIN (autorisation ponctuelle).',
          resolve,
          reject,
        });
      });
    },
    [activeSession, grantByPermission]
  );

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

      if (!pinActorHasPermission(actor, pending.permission)) {
        throw new Error('Ce PIN n’a pas le droit requis pour cette action');
      }
      setGrantByPermission((prev) => {
        const next = new Map(prev);
        next.set(pending.permission, actor);
        return next;
      });
      pending.resolve(actor);
      setPending(null);
    },
    [pending, addOrFocusSession]
  );

  const value = useMemo<StepUpAuthContextValue>(
    () => ({
      ensureSession,
      ensurePermission,
      hasGrant: (permission: string) => grantByPermission.has(permission),
    }),
    [ensureSession, ensurePermission, grantByPermission]
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
