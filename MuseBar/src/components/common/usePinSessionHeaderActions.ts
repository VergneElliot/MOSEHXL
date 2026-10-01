import { useCallback, useEffect, useRef, useState } from 'react';
import { usePinSessions } from '../../contexts/PinSessionsContext';
import { pinActorFromVerify } from '../../contexts/pinActorFromVerify';
import { isSessionUnlocked } from '../../contexts/pinSessionsMerge';
import * as floorApi from '../../services/api/floor';

type PadPurpose = 'open' | 'unlock' | 'close';

/**
 * Header PIN pad + focus gate: unlock remote tabs with that user's PIN; close tabs
 * only after the same PIN (any device). Auto-prompts once when the focused badge expires.
 */
export function usePinSessionHeaderActions() {
  const {
    sessions,
    activeSessionId,
    expiredSessionIds,
    setActiveSessionId,
    addOrFocusSession,
    closeSessionAsPinUser,
    refreshRemoteSessions,
    isSyncingRemoteSessions,
  } = usePinSessions();

  const [pinOpen, setPinOpen] = useState(false);
  const [pinMode, setPinMode] = useState<'verify' | 'set'>('verify');
  const [toast, setToast] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'error'>('success');
  const [renewNotice, setRenewNotice] = useState<string | null>(null);
  const [unlockUserId, setUnlockUserId] = useState<number | null>(null);
  const [unlockDisplayName, setUnlockDisplayName] = useState<string | null>(null);
  const [padPurpose, setPadPurpose] = useState<PadPurpose>('open');
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const promptedExpiryRef = useRef<string | null>(null);

  const isExpired = useCallback(
    (id: string) => expiredSessionIds.includes(id),
    [expiredSessionIds]
  );

  const openPad = useCallback(
    (
      notice: string | null,
      expectedUserId: number | null,
      name: string | null,
      purpose: PadPurpose
    ) => {
      setRenewNotice(notice);
      setUnlockUserId(expectedUserId);
      setUnlockDisplayName(name);
      setPadPurpose(purpose);
      setPinMode('verify');
      setPinOpen(true);
    },
    []
  );

  useEffect(() => {
    if (!activeSessionId || !isExpired(activeSessionId)) {
      if (activeSessionId && !isExpired(activeSessionId)) {
        promptedExpiryRef.current = null;
      }
      return;
    }
    if (pinOpen || promptedExpiryRef.current === activeSessionId) return;
    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session) return;
    promptedExpiryRef.current = activeSessionId;
    openPad(
      `Session expirée — ressaisissez le PIN de ${session.actor.displayName}.`,
      session.actor.userId,
      session.actor.displayName,
      'unlock'
    );
  }, [activeSessionId, isExpired, pinOpen, sessions, openPad]);

  const requestActivateSession = useCallback(
    (id: string) => {
      const session = sessions.find((s) => s.id === id);
      if (!session) return;

      if (!isSessionUnlocked(session) || isExpired(id)) {
        openPad(
          isExpired(id)
            ? `Session expirée — ressaisissez le PIN de ${session.actor.displayName}.`
            : `Saisissez le PIN de ${session.actor.displayName} pour activer ce badge sur cet appareil.`,
          session.actor.userId,
          session.actor.displayName,
          'unlock'
        );
        return;
      }
      setUnlockUserId(null);
      setUnlockDisplayName(null);
      setPendingCloseId(null);
      setActiveSessionId(id);
    },
    [sessions, isExpired, openPad, setActiveSessionId]
  );

  const requestDismissSession = useCallback(
    (id: string) => {
      const session = sessions.find((s) => s.id === id);
      if (!session) return;
      setPendingCloseId(id);
      openPad(
        `Saisissez le PIN de ${session.actor.displayName} pour fermer ce badge (pointage sortie).`,
        session.actor.userId,
        session.actor.displayName,
        'close'
      );
    },
    [sessions, openPad]
  );

  const openNewSessionPad = useCallback(() => {
    setPendingCloseId(null);
    openPad(null, null, null, 'open');
  }, [openPad]);

  const handleVerify = useCallback(
    async (pin: string) => {
      const result = await floorApi.verifyPin(pin);
      if (unlockUserId != null && result.user_id !== unlockUserId) {
        const expected = unlockDisplayName ?? 'ce profil';
        throw new Error(`Ce PIN ne correspond pas à ${expected}.`);
      }

      if (padPurpose === 'close') {
        const tab = pendingCloseId
          ? sessions.find((s) => s.id === pendingCloseId)
          : undefined;
        const sessionId =
          result.pin_session_id ??
          tab?.actor.sessionId ??
          tab?.id ??
          pendingCloseId;
        if (!sessionId) {
          throw new Error('Session introuvable — actualisez la liste puis réessayez.');
        }
        try {
          await closeSessionAsPinUser(sessionId, result.pin_actor_token);
        } catch (err) {
          const message =
            (err as { message?: string }).message ||
            'Impossible de fermer ce badge (tables ouvertes ?).';
          throw new Error(message);
        }
        setPinOpen(false);
        setRenewNotice(null);
        setUnlockUserId(null);
        setUnlockDisplayName(null);
        setPendingCloseId(null);
        setToastSeverity('success');
        setToast(`Session fermée : ${result.display_name}`);
        return;
      }

      addOrFocusSession(pinActorFromVerify(result));
      setPinOpen(false);
      setRenewNotice(null);
      setUnlockUserId(null);
      setUnlockDisplayName(null);
      setPendingCloseId(null);
      setToastSeverity('success');
      setToast(`Session ouverte : ${result.display_name}`);
    },
    [
      unlockUserId,
      unlockDisplayName,
      padPurpose,
      pendingCloseId,
      sessions,
      closeSessionAsPinUser,
      addOrFocusSession,
    ]
  );

  const handleSetPin = useCallback(async (pin: string) => {
    await floorApi.setPin(pin);
    setPinMode('verify');
    setToastSeverity('success');
    setToast('PIN enregistré — vous pouvez ouvrir une session');
  }, []);

  const closePad = useCallback(() => {
    setPinOpen(false);
    setRenewNotice(null);
    setUnlockUserId(null);
    setUnlockDisplayName(null);
    setPendingCloseId(null);
    setPadPurpose('open');
  }, []);

  const handleManualRefresh = useCallback(async () => {
    await refreshRemoteSessions();
    setToastSeverity('info');
    setToast('Liste des badges actualisée');
  }, [refreshRemoteSessions]);

  return {
    sessions,
    activeSessionId,
    expiredSessionIds,
    pinOpen,
    pinMode,
    setPinMode,
    toast,
    setToast,
    toastSeverity,
    renewNotice,
    unlockUserId,
    padPurpose,
    isExpired,
    isSyncingRemoteSessions,
    requestActivateSession,
    requestDismissSession,
    openNewSessionPad,
    handleVerify,
    handleSetPin,
    closePad,
    handleManualRefresh,
  };
}
