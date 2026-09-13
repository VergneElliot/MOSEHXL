import { useEffect, useRef } from 'react';

/**
 * Runs `tick` on an interval only while the page is visible.
 * Clears the timer when the tab is hidden (POS machines often leave the app open overnight).
 */
export function useVisibleInterval(tick: () => void, intervalMs: number, enabled = true): void {
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let timer: number | null = null;

    const clear = () => {
      if (timer != null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      clear();
      timer = window.setInterval(() => tickRef.current(), intervalMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tickRef.current();
        start();
      } else {
        clear();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clear();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs]);
}
