import type { Request, Response, NextFunction } from 'express';
import { requirePosPinActor } from './pinActor';

/**
 * Every POS order (comptoir or table) requires an active PIN with access_pos.
 * Venue login JWT alone is never enough.
 */
export async function requirePosPinActorForTableOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requirePosPinActor(req, res, next);
}
