/**
 * Captures beforeinstallprompt and exposes install / standalone state for UI.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BeforeInstallPromptEventLike,
  isIosSafariUserAgent,
  isStandaloneDisplay,
  readIosHintDismissed,
  writeIosHintDismissed,
} from './pwaInstallDetect';

export type PwaInstallState = {
  isStandalone: boolean;
  canPromptInstall: boolean;
  showIosHint: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  dismissIosHint: () => void;
};

export function usePwaInstall(): PwaInstallState {
  const [isStandalone, setIsStandalone] = useState(() =>
    typeof window === 'undefined'
      ? false
      : isStandaloneDisplay(window.matchMedia.bind(window), window.navigator as Navigator & {
          standalone?: boolean;
        })
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEventLike | null>(null);
  const [iosHintDismissed, setIosHintDismissed] = useState(() =>
    typeof localStorage === 'undefined' ? true : readIosHintDismissed(localStorage)
  );

  useEffect(() => {
    const refreshStandalone = () => {
      setIsStandalone(
        isStandaloneDisplay(window.matchMedia.bind(window), window.navigator as Navigator & {
          standalone?: boolean;
        })
      );
    };
    refreshStandalone();

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEventLike);
    };
    const onInstalled = () => {
      setDeferred(null);
      refreshStandalone();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener?.('change', refreshStandalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      mq.removeEventListener?.('change', refreshStandalone);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return 'unavailable' as const;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      return choice.outcome;
    } catch {
      setDeferred(null);
      return 'unavailable' as const;
    }
  }, [deferred]);

  const dismissIosHint = useCallback(() => {
    writeIosHintDismissed(localStorage);
    setIosHintDismissed(true);
  }, []);

  const showIosHint = useMemo(() => {
    if (isStandalone || deferred) return false;
    if (iosHintDismissed) return false;
    if (typeof navigator === 'undefined') return false;
    return isIosSafariUserAgent(navigator.userAgent);
  }, [isStandalone, deferred, iosHintDismissed]);

  return useMemo(
    () => ({
      isStandalone,
      canPromptInstall: Boolean(deferred) && !isStandalone,
      showIosHint,
      promptInstall,
      dismissIosHint,
    }),
    [isStandalone, deferred, showIosHint, promptInstall, dismissIosHint]
  );
}
