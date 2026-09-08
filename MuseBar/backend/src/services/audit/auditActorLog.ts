import type { Request } from 'express';
import { AuditTrailModel, type AuditEntry } from '../../models/auditTrail';
import { actorTrace, resolveActor } from '../auth/actorContext';

type ActorAuditInput = Omit<
  Partial<AuditEntry>,
  'user_id' | 'pin_user_id' | 'session_id' | 'ip_address' | 'user_agent'
> & { action_type: string };

/**
 * Audit write that fills both identities from the request: the logged-in account, and the PIN
 * identity/session when the action came from a badge or answered a step-up prompt.
 *
 * Prefer this over `AuditTrailModel.logAction` in any route handler — passing identity by hand
 * is how half the trail ended up account-only.
 */
export async function logActorAction(
  req: Request,
  entry: ActorAuditInput
): Promise<void> {
  const actor = resolveActor(req);
  await AuditTrailModel.logActionBestEffort({
    ...entry,
    establishment_id: entry.establishment_id ?? actor.establishmentId,
    user_id: actor.accountUserId != null ? String(actor.accountUserId) : undefined,
    pin_user_id: actor.pinUserId,
    session_id: actor.pinSessionId ?? undefined,
    ip_address: req.ip,
    user_agent: req.headers?.['user-agent'] as string | undefined,
    action_details: {
      ...(entry.action_details ?? {}),
      actor: actorTrace(actor),
    },
  });
}
