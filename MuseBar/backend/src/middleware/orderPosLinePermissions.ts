import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user';
import { P } from '../permissions/registry';
import { readOptionalPinActor } from './pinActor';
import { pinActorHasPermission } from '../services/auth/pinActorToken';

type OrderItemInput = {
  description?: string | null;
  happy_hour_applied?: boolean;
  is_manual_happy_hour?: boolean;
  manual_happy_hour?: boolean;
};

function descriptionHasTag(description: string | null | undefined, tag: string): boolean {
  return typeof description === 'string' && description.includes(tag);
}

/**
 * True when the logged-in account or the PIN identity on the request holds `permission`.
 * Matches `requirePermission` so a step-up PIN that authorised the line action is enough.
 */
async function requestHoldsPermission(req: Request, permission: string): Promise<boolean> {
  const accountPermissions = await UserModel.getUserPermissions(
    Number(req.user?.id),
    req.user?.establishment_id
  );
  if (accountPermissions.includes(permission)) return true;

  const actor = req.pinActor ?? readOptionalPinActor(req);
  return Boolean(actor && pinActorHasPermission(actor, permission));
}

/**
 * After validateBody for POST /api/orders — ensures staff holds POS line-item permissions
 * (manual Happy Hour, Offert, Perso, Remise) when the payload requests those features.
 */
export function assertPosOrderLinePermissions() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = Number(req.user?.id);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const items = (req.body as { items?: OrderItemInput[] })?.items;
    if (!Array.isArray(items)) {
      return next();
    }

    const hasManualHh = items.some(
      (i) => i && (i.is_manual_happy_hour === true || i.manual_happy_hour === true)
    );
    const hasOffert = items.some((i) => descriptionHasTag(i?.description, '[Offert]'));
    const hasPerso = items.some((i) => descriptionHasTag(i?.description, '[Perso]'));
    const hasRemise = items.some((i) => descriptionHasTag(i?.description, '[Remise'));

    if (hasManualHh && !(await requestHoldsPermission(req, P.pos_happyhour_manual))) {
      return res.status(403).json({ error: 'Permission denied: Happy Hour manuel' });
    }
    if (hasOffert && !(await requestHoldsPermission(req, P.pos_apply_offert))) {
      return res.status(403).json({ error: 'Permission denied: offert' });
    }
    if (hasPerso && !(await requestHoldsPermission(req, P.pos_apply_perso))) {
      return res.status(403).json({ error: 'Permission denied: perso' });
    }
    if (hasRemise && !(await requestHoldsPermission(req, P.pos_apply_remise))) {
      return res.status(403).json({ error: 'Permission denied: remise' });
    }

    return next();
  };
}
