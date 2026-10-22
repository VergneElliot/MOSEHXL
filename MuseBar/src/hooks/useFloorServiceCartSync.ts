import { useEffect, useRef } from 'react';
import * as floorApi from '../services/api/floor';
import type { FloorServiceContext } from './floorServiceContext';

/** Debounced cart → open-ticket sync while a table is bound to the Caisse session. */
export function useFloorServiceCartSync(ctx: FloorServiceContext): void {
  const {
    activeTable,
    pinActor,
    currentOrder,
    onError,
    applyTicketItemsToCart,
    skipNextSync,
  } = ctx;
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeTable || !pinActor) {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
        syncTimer.current = null;
      }
      return;
    }
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void floorApi
        .replaceTicketItems(activeTable.ticketId, currentOrder, pinActor.token)
        .then(({ items }) => {
          applyTicketItemsToCart(items);
        })
        .catch((error: unknown) => {
          const err = error as { message?: string };
          onError(err.message || 'Synchronisation table échouée');
        });
    }, 450);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [currentOrder, activeTable, pinActor, onError, applyTicketItemsToCart, skipNextSync]);
}
