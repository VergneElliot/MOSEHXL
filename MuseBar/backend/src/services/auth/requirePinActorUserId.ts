/**
 * Resolve which user profile the request is editing: the active PIN actor only.
 */

import type { Request } from 'express';
import { readOptionalPinActor } from '../../middleware/pinActor';
import { ValidationError, AuthorizationError } from '../../middleware/errorHandler';

export function requirePinActorUserId(req: Request): {
  userId: number;
  email: string;
  role: string;
  permissions: string[];
} {
  const actor = req.pinActor ?? readOptionalPinActor(req);
  if (!actor) {
    throw new AuthorizationError('PIN session required');
  }
  if (!req.user?.establishment_id || actor.establishment_id !== req.user.establishment_id) {
    throw new AuthorizationError('PIN actor does not match active establishment');
  }
  const userId = Number(actor.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ValidationError('Invalid PIN actor');
  }
  return {
    userId,
    email: actor.email,
    role: actor.role,
    permissions: actor.permissions || [],
  };
}
