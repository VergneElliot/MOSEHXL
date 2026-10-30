/**
 * Debounced cart → open-ticket sync. Clears local binding when the ticket is gone.
 */

import { useEffect, type MutableRefObject } from 'react';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import type { ActiveTableState, PinActorState } from '../contexts/PinSessionsContext';
import { isOpenTicketGoneError } from './floorTicketGone';

export function useFloorTicketCartSync(options: {
  activeTable: ActiveTableState | null;
  pinActor: PinActorState | null;
  currentOrder: OrderItem[];
  skipNextSync: MutableRefObject<boolean>;
  applyTicketItemsToCart: (items: floorApi.OpenTicketItemDto[]) => void;
  releaseLocalTableCart: (infoMessage?: string) => void;
  onError: (message: string) => void;
}): void {
  const {
    activeTable,
    pinActor,
    currentOrder,
    skipNextSync,
    applyTicketItemsToCart,
    releaseLocalTableCart,
    onError,
  } = options;

  useEffect(() => {
    if (!activeTable || !pinActor) {
      return;
    }
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void floorApi
        .replaceTicketItems(activeTable.ticketId, currentOrder, pinActor.token)
        .then(({ items }) => {
          applyTicketItemsToCart(items);
        })
        .catch((error: unknown) => {
          if (isOpenTicketGoneError(error)) {
            releaseLocalTableCart('Table déjà clôturée — panier local libéré');
            return;
          }
          const err = error as { message?: string };
          onError(err.message || 'Synchronisation table échouée');
        });
    }, 450);
    return () => clearTimeout(timer);
  }, [
    currentOrder,
    activeTable,
    pinActor,
    skipNextSync,
    applyTicketItemsToCart,
    releaseLocalTableCart,
    onError,
  ]);
}
