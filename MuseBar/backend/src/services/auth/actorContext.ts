import type { Request } from 'express';
import { readOptionalPinActor } from '../../middleware/pinActor';

/**
 * Who performed an action, in the two identities this system always records together:
 * the account the terminal is logged into, and the PIN identity (badge) that acted on it.
 *
 * Both halves are optional on their own — a background job has no account, a manager working
 * from their own login has no badge — but every traced write should carry whichever exist.
 */
export interface ActorContext {
  accountUserId: number | null;
  accountEmail: string | null;
  pinUserId: number | null;
  pinDisplayName: string | null;
  pinSessionId: string | null;
  establishmentId: string | null;
}

export function resolveActor(req: Request): ActorContext {
  const account = req.user;
  const pinActor = req.pinActor ?? readOptionalPinActor(req);

  return {
    accountUserId: typeof account?.id === 'number' ? account.id : null,
    accountEmail: typeof account?.email === 'string' ? account.email : null,
    pinUserId: pinActor?.id ?? null,
    pinDisplayName: pinActor?.display_name ?? null,
    pinSessionId: pinActor?.sid ?? null,
    establishmentId: account?.establishment_id ?? pinActor?.establishment_id ?? null,
  };
}

/** Compact, stable shape for JSONB payloads (audit details, journal transaction_data). */
export function actorTrace(actor: ActorContext): Record<string, unknown> {
  return {
    account_user_id: actor.accountUserId,
    account_email: actor.accountEmail,
    pin_user_id: actor.pinUserId,
    pin_display_name: actor.pinDisplayName,
    pin_session_id: actor.pinSessionId,
  };
}
