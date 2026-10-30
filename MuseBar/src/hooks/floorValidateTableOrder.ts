/**
 * Kitchen-validate draft lines on an open ticket, then release the local cart
 * when that ticket is the bound Caisse table.
 */

import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import {
  resolveTargetOrderItems,
  ticketLineIdsFromItems,
} from '../utils/posCartSelection';
import type { ActiveTableState, PinActorState } from '../contexts/PinSessionsContext';
import { isOpenTicketGoneError } from './floorTicketGone';

export async function runValidateTableOrder(input: {
  order: OrderItem[];
  ticketIdOverride?: number;
  pinActor: PinActorState | null;
  activeTable: ActiveTableState | null;
  getActionItems: (order?: OrderItem[]) => OrderItem[];
  getSelectedIds: () => Set<string>;
  openPinDialog: (mode: 'verify' | 'set') => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
  releaseLocalTableCart: (infoMessage?: string) => void;
}): Promise<void> {
  const {
    order,
    ticketIdOverride,
    pinActor,
    activeTable,
    getActionItems,
    getSelectedIds,
    openPinDialog,
    onError,
    onInfo,
    releaseLocalTableCart,
  } = input;

  if (!pinActor) {
    openPinDialog('verify');
    onError('Badge requis pour valider la commande table');
    return;
  }
  const ticketId = ticketIdOverride ?? activeTable?.ticketId;
  if (ticketId == null) {
    onError('Table active requise');
    return;
  }
  const targets = getActionItems(order);
  const pending = targets.filter(
    (line) => !line.isTip && line.tableLineStatus !== 'validated'
  );
  if (pending.length === 0) {
    onError('Aucun article en attente de validation');
    return;
  }
  try {
    const { items: saved } = await floorApi.replaceTicketItems(
      ticketId,
      order,
      pinActor.token
    );
    const synced = floorApi.mapTicketItemsToOrderItems(saved);
    const draftLineIds = ticketLineIdsFromItems(
      resolveTargetOrderItems(synced, getSelectedIds()).filter(
        (line) => line.tableLineStatus !== 'validated'
      )
    );
    const result = await floorApi.validateTicket(
      ticketId,
      pinActor.token,
      draftLineIds.length > 0 ? draftLineIds : undefined
    );
    const msg =
      result.print.enqueued > 0
        ? `Commande table validée — ${result.print.enqueued} ticket(s) cuisine`
        : 'Commande table validée (aucun ticket cuisine)';
    if (activeTable?.ticketId === ticketId) {
      releaseLocalTableCart(msg);
    } else {
      onInfo(msg);
    }
  } catch (error: unknown) {
    if (isOpenTicketGoneError(error)) {
      if (activeTable?.ticketId === ticketId) {
        releaseLocalTableCart('Table déjà clôturée — panier local libéré');
      } else {
        onError('Table déjà clôturée');
      }
      return;
    }
    const err = error as { message?: string };
    onError(err.message || 'Validation commande table échouée');
  }
}
