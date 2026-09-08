import { Request, Response, NextFunction } from 'express';
import { P } from '../permissions/registry';
import { ValidationError, AuthorizationError } from './errorHandler';
import {
  pinActorHasPermission,
  verifyPinActorToken,
  type PinActorPayload,
} from '../services/auth/pinActorToken';
import { checkPinSession, touchPinSession } from '../services/auth/pinSessionGuard';

declare module 'express-serve-static-core' {
  interface Request {
    pinActor?: PinActorPayload;
  }
}

/**
 * Reads and validates `x-pin-actor-token` without failing the request.
 *
 * Used by permission gates so a specific permission can be authorized by the PIN identity
 * that answered a step-up prompt, in addition to the logged-in account.
 */
function readPinActorTokenHeader(req: Request): string | null {
  const header = req.headers?.['x-pin-actor-token'];
  const raw = Array.isArray(header) ? header[0] : header;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

export function readOptionalPinActor(req: Request): PinActorPayload | null {
  const raw = readPinActorTokenHeader(req);
  if (!raw) return null;

  try {
    const actor = verifyPinActorToken(raw);
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId || actor.establishment_id !== establishmentId) return null;
    return actor;
  } catch {
    return null;
  }
}

export function requirePinActor(requiredPermission?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const raw = readPinActorTokenHeader(req);
    if (!raw) {
      return res.status(403).json({
        error: 'PIN identification required',
        code: 'PIN_ACTOR_REQUIRED',
      });
    }

    try {
      const actor = verifyPinActorToken(raw);
      const establishmentId = req.user?.establishment_id;
      if (!establishmentId || actor.establishment_id !== establishmentId) {
        return res.status(403).json({
          error: 'PIN actor does not match active establishment',
          code: 'PIN_ACTOR_ESTABLISHMENT_MISMATCH',
        });
      }
      // Closing a badge revokes it immediately, ahead of the token's own expiry.
      const sessionState = await checkPinSession(actor.sid, establishmentId);
      if (sessionState === 'revoked') {
        return res.status(403).json({
          error: 'PIN session closed',
          code: 'PIN_SESSION_CLOSED',
        });
      }
      if (requiredPermission && !pinActorHasPermission(actor, requiredPermission)) {
        throw new AuthorizationError(`PIN profile lacks permission: ${requiredPermission}`);
      }
      touchPinSession(actor.sid, establishmentId);
      req.pinActor = actor;
      return next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message, code: error.errorCode });
      }
      return res.status(403).json({
        error: 'Invalid or expired PIN session',
        code: 'PIN_ACTOR_INVALID',
      });
    }
  };
}

/** Convenience: require pin actor with access_pos. */
export const requirePosPinActor = requirePinActor(P.access_pos);

export function parsePinBody(pin: unknown): string {
  if (typeof pin !== 'string' || !/^\d{2,8}$/.test(pin)) {
    throw new ValidationError('pin must be 2 to 8 digits');
  }
  return pin;
}
