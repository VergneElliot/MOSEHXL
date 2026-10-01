/**
 * Registers the production service worker and notifies when an update is waiting.
 * /api is NetworkOnly (see vite.config.ts) — never cached for fiscal safety.
 */

import { registerSW } from 'virtual:pwa-register';

export type PwaUpdateHandlers = {
  onNeedRefresh: (applyUpdate: () => void) => void;
};

export function registerPwaUpdate(handlers: PwaUpdateHandlers): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => undefined;
  }

  // registerSW returns an update function; call with true to activate waiting SW + reload.
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      handlers.onNeedRefresh(() => {
        void updateSW(true);
      });
    },
  });

  return () => undefined;
}
