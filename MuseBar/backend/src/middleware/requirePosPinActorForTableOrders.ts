import type { Request, Response, NextFunction } from 'express';
import { P } from '../permissions/registry';
import { AuthorizationError } from './errorHandler';
import {
  pinActorHasPermission,
  verifyPinActorToken,
} from '../services/auth/pinActorToken';
import { checkPinSession, touchPinSession } from '../services/auth/pinSessionGuard';

function readPinActorTokenHeader(req: Request): string | null {
  const header = req.headers?.['x-pin-actor-token'];
  const raw = Array.isArray(header) ? header[0] : header;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function tableLabelFromBody(body: unknown): string | null {
  const raw =
    body && typeof body === 'object' && 'table_label' in body
      ? (body as { table_label?: unknown }).table_label
      : undefined;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

/**
 * Table orders require an active PIN with access_pos.
 * Comptoir (no table_label) allows account-only; optional PIN is attached when present.
 */
export async function requirePosPinActorForTableOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const needsPin = tableLabelFromBody(req.body) != null;
  const raw = readPinActorTokenHeader(req);

  if (!raw) {
    if (needsPin) {
      res.status(403).json({
        error: 'PIN identification required',
        code: 'PIN_ACTOR_REQUIRED',
      });
      return;
    }
    next();
    return;
  }

  try {
    const actor = verifyPinActorToken(raw);
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId || actor.establishment_id !== establishmentId) {
      res.status(403).json({
        error: 'PIN actor does not match active establishment',
        code: 'PIN_ACTOR_ESTABLISHMENT_MISMATCH',
      });
      return;
    }
    const sessionState = await checkPinSession(actor.sid, establishmentId);
    if (sessionState === 'revoked') {
      res.status(403).json({
        error: 'PIN session closed',
        code: 'PIN_SESSION_CLOSED',
      });
      return;
    }
    if (!pinActorHasPermission(actor, P.access_pos)) {
      throw new AuthorizationError(`PIN profile lacks permission: ${P.access_pos}`);
    }
    touchPinSession(actor.sid, establishmentId);
    req.pinActor = actor;
    next();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      res.status(403).json({ error: error.message, code: error.errorCode });
      return;
    }
    res.status(403).json({
      error: 'Invalid or expired PIN session',
      code: 'PIN_ACTOR_INVALID',
    });
  }
}
