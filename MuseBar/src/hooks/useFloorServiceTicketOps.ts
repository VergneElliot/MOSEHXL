import { useCallback } from 'react';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import {
  resolveTargetOrderItems,
  ticketLineIdsFromItems,
} from '../utils/posCartSelection';
import type { FloorServiceContext, FloorServiceDialogControls } from './floorServiceContext';

/** Validate, À suivre, waiter assign, and validated-line retour on the active ticket. */
export function useFloorServiceTicketOps(
  ctx: FloorServiceContext,
  dialogs: Pick<FloorServiceDialogControls, 'openPinDialog' | 'pendingAfterPin'>
) {
  const {
    pinActor,
    activeTable,
    updateActiveSession,
    onError,
    onInfo,
    applyTicketItemsToCart,
    getActionItems,
    getSelectedIds,
  } = ctx;
  const { openPinDialog, pendingAfterPin } = dialogs;

  const assignTicketWaiter = useCallback(
    async (userId: number, displayName: string) => {
      if (!pinActor) {
        openPinDialog('verify');
        onError('Badge requis');
        return;
      }
      if (!activeTable) {
        onError('Table active requise pour assigner un serveur');
        return;
      }
      try {
        const { served_by_display_name } = await floorApi.assignTicketWaiter(
          activeTable.ticketId,
          userId,
          pinActor.token
        );
        updateActiveSession({
          activeTable: {
            ...activeTable,
            assignedWaiterUserId: userId,
            assignedWaiterDisplayName: served_by_display_name ?? displayName,
          },
        });
        onInfo(`Serveur assigné : ${served_by_display_name ?? displayName}`);
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Assignation serveur impossible');
      }
    },
    [pinActor, activeTable, openPinDialog, onError, onInfo, updateActiveSession]
  );

  const printSuivre = useCallback(
    async (order: OrderItem[]) => {
      if (!pinActor) {
        pendingAfterPin.current = null;
        openPinDialog('verify');
        onError('Badge requis pour À suivre');
        return;
      }
      try {
        if (activeTable) {
          const { items } = await floorApi.replaceTicketItems(
            activeTable.ticketId,
            order,
            pinActor.token
          );
          applyTicketItemsToCart(items);
          const synced = floorApi.mapTicketItemsToOrderItems(items);
          const suivreIds = ticketLineIdsFromItems(
            resolveTargetOrderItems(synced, getSelectedIds())
          );
          const result = await floorApi.printSuivreForTicket(
            activeTable.ticketId,
            pinActor.token,
            suivreIds.length > 0 ? suivreIds : undefined
          );
          onInfo(
            result.enqueued > 0
              ? `À suivre envoyé (${result.enqueued})`
              : 'Aucun ticket cuisine (imprimantes ?)'
          );
          return;
        }
        const sale = getActionItems(order);
        if (sale.length === 0) {
          onError('Aucun article à envoyer');
          return;
        }
        const result = await floorApi.printSuivreFromCart(
          sale.map((line) => ({
            product_id: line.productId ? parseInt(String(line.productId), 10) || null : null,
            product_name: line.productName,
            quantity: line.quantity,
          })),
          pinActor.token,
          null
        );
        onInfo(
          result.enqueued > 0
            ? `À suivre envoyé (${result.enqueued})`
            : 'Aucun ticket cuisine (imprimantes ?)'
        );
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Impression À suivre échouée');
      }
    },
    [
      pinActor,
      activeTable,
      openPinDialog,
      onError,
      onInfo,
      applyTicketItemsToCart,
      getActionItems,
      getSelectedIds,
      pendingAfterPin,
    ]
  );

  const validateTableOrder = useCallback(
    async (order: OrderItem[], ticketIdOverride?: number) => {
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
        applyTicketItemsToCart(result.items);
        onInfo(
          result.print.enqueued > 0
            ? `Commande table validée — ${result.print.enqueued} ticket(s) cuisine`
            : 'Commande table validée (aucun ticket cuisine)'
        );
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Validation commande table échouée');
      }
    },
    [pinActor, activeTable, openPinDialog, onError, onInfo, applyTicketItemsToCart, getActionItems, getSelectedIds]
  );

  const cancelValidatedTicketLine = useCallback(
    async (ticketLineId: number) => {
      if (!pinActor) {
        onError('Badge requis');
        return;
      }
      if (!activeTable) {
        onError('Table active requise');
        return;
      }
      try {
        const result = await floorApi.cancelTicketLines(
          activeTable.ticketId,
          [ticketLineId],
          pinActor.token
        );
        applyTicketItemsToCart(result.items);
        onInfo(
          result.print.enqueued > 0
            ? `Retour envoyé — ${result.print.enqueued} ticket(s) cuisine`
            : 'Article retiré de la commande'
        );
      } catch (error: unknown) {
        const err = error as { message?: string };
        onError(err.message || 'Retour impossible');
      }
    },
    [pinActor, activeTable, onError, onInfo, applyTicketItemsToCart]
  );

  return {
    assignTicketWaiter,
    printSuivre,
    validateTableOrder,
    cancelValidatedTicketLine,
  };
}
