import type { OpenTicket } from '../../models/database/openTicketModel';
import type { PinActorPayload } from '../auth/pinActorToken';
import { pinActorHasPermission } from '../auth/pinActorToken';
import { P } from '../../permissions/registry';
import { AuthorizationError } from '../../middleware/errorHandler';

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
