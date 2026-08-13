import { Request, Response, NextFunction } from 'express';
import { P } from '../permissions/registry';
import { ValidationError, AuthorizationError } from './errorHandler';
import {
  pinActorHasPermission,
  verifyPinActorToken,
  type PinActorPayload,
} from '../services/auth/pinActorToken';

declare module 'express-serve-static-core' {
  interface Request {
    pinActor?: PinActorPayload;
  }
}

export function requirePinActor(requiredPermission?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers['x-pin-actor-token'];
    const raw = Array.isArray(header) ? header[0] : header;
    if (!raw || typeof raw !== 'string') {
      return res.status(401).json({
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
      if (requiredPermission && !pinActorHasPermission(actor, requiredPermission)) {
        throw new AuthorizationError(`PIN profile lacks permission: ${requiredPermission}`);
      }
      req.pinActor = actor;
      return next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message, code: error.errorCode });
      }
      return res.status(401).json({
        error: 'Invalid or expired PIN session',
        code: 'PIN_ACTOR_INVALID',
      });
    }
  };
}

/** Convenience: require pin actor with access_pos. */
export const requirePosPinActor = requirePinActor(P.access_pos);

export function parsePinBody(pin: unknown): string {
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
    throw new ValidationError('pin must be exactly 6 digits');
  }
  return pin;
}
