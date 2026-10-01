import { useCallback, useEffect, useRef, useState } from 'react';
import { listActivePinSessions } from '../services/api/pin';
import { useVisibleInterval } from '../hooks/useVisibleInterval';
import { mergeServerSessions } from './pinSessionsMerge';
import type { PinSessionsState } from './pinSessionsState';

const POLL_MS = 12_000;

/**
 * Pulls establishment-wide open badges and merges them into local unlock/cart state.
 * Polls only while visible; also refreshes on focus / online / after verify|close.
 */
export function usePinSessionsRemoteSync(
  setState: React.Dispatch<React.SetStateAction<PinSessionsState>>
): { refreshRemoteSessions: () => Promise<void>; isSyncing: boolean } {
  const [isSyncing, setIsSyncing] = useState(false);
  const inFlightRef = useRef(false);

  const refreshRemoteSessions = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsSyncing(true);
    try {
      const remote = await listActivePinSessions();
      setState((prev) => mergeServerSessions(prev, remote));
    } catch {
      // Auth/network errors leave the local unlock map untouched.
    } finally {
      inFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [setState]);

  useEffect(() => {
    void refreshRemoteSessions();
  }, [refreshRemoteSessions]);

  useVisibleInterval(() => {
    void refreshRemoteSessions();
  }, POLL_MS, true);

  useEffect(() => {
    const onFocusOrOnline = () => {
      void refreshRemoteSessions();
    };
    window.addEventListener('focus', onFocusOrOnline);
    window.addEventListener('online', onFocusOrOnline);
    return () => {
      window.removeEventListener('focus', onFocusOrOnline);
      window.removeEventListener('online', onFocusOrOnline);
    };
  }, [refreshRemoteSessions]);

  return { refreshRemoteSessions, isSyncing };
}
