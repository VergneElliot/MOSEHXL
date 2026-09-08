import { OpenTicketModel, type OpenTicket } from '../../models/database/openTicketModel';
import type { PinActorPayload } from '../auth/pinActorToken';
import { pinActorHasPermission } from '../auth/pinActorToken';
import { P } from '../../permissions/registry';
import { AuthorizationError, NotFoundError } from '../../middleware/errorHandler';

/**
 * Live table owner for Z / CA: `last_served_by_user_id`.
 * Intervene may act without changing this field; only `assignWaiter` transfers ownership.
 */
export function assertCanInterveneOnTicket(
  ticket: Pick<OpenTicket, 'last_served_by_user_id'>,
  actor: PinActorPayload
): void {
  const assigned = ticket.last_served_by_user_id;
  if (assigned == null || actor.id === assigned) return;
  if (pinActorHasPermission(actor, P.pos_intervene_table)) return;
  throw new AuthorizationError(
    'PIN autorisé requis pour modifier une table assignée à un autre serveur'
  );
}

/** Load an open ticket and enforce intervene when the actor is not the owner. */
export async function requireOpenTicketForActor(
  id: number,
  establishmentId: string,
  actor: PinActorPayload
): Promise<OpenTicket> {
  const ticket = await OpenTicketModel.get(id, establishmentId);
  if (!ticket || ticket.status !== 'open') {
    throw new NotFoundError('Open ticket not found or already closed');
  }
  assertCanInterveneOnTicket(ticket, actor);
  return ticket;
}

/**
 * Abandon with only drafts is basic (owner / intervene).
 * Abandon that drops validated (kitchen-sent) lines requires `orders_cancel`.
 */
export async function assertCanAbandonTicket(
  ticketId: number,
  establishmentId: string,
  actor: PinActorPayload
): Promise<void> {
  const items = await OpenTicketModel.listActiveItems(ticketId, establishmentId);
  if (!items.some((item) => item.line_status === 'validated')) return;
  if (pinActorHasPermission(actor, P.orders_cancel)) return;
  throw new AuthorizationError(
    'PIN autorisé requis pour abandonner une table avec des articles validés'
  );
}
