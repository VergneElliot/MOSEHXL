import { Request, Response, NextFunction } from 'express';
import { P } from '../permissions/registry';
import { readOptionalPinActor } from './pinActor';
import { pinActorHasPermission } from '../services/auth/pinActorToken';

export type OrderItemPermissionInput = {
  description?: string | null;
  happy_hour_applied?: boolean;
  is_manual_happy_hour?: boolean;
  manual_happy_hour?: boolean;
};

function descriptionHasTag(description: string | null | undefined, tag: string): boolean {
  return typeof description === 'string' && description.includes(tag);
}

/** PIN actor only — venue login JWT grants never authorize line actions. */
function pinHoldsPermission(req: Request, permission: string): boolean {
  const actor = req.pinActor ?? readOptionalPinActor(req);
  return Boolean(actor && pinActorHasPermission(actor, permission));
}

export function itemsRequirePosLinePermissions(items: OrderItemPermissionInput[]): {
  needManualHh: boolean;
  needOffert: boolean;
  needPerso: boolean;
  needRemise: boolean;
} {
  return {
    needManualHh: items.some(
      (i) => i && (i.is_manual_happy_hour === true || i.manual_happy_hour === true)
    ),
    needOffert: items.some((i) => descriptionHasTag(i?.description, '[Offert]')),
    needPerso: items.some((i) => descriptionHasTag(i?.description, '[Perso]')),
    needRemise: items.some((i) => descriptionHasTag(i?.description, '[Remise')),
  };
}

export function denyIfMissingPosLinePermissions(
  req: Request,
  res: Response,
  items: OrderItemPermissionInput[]
): boolean {
  const { needManualHh, needOffert, needPerso, needRemise } =
    itemsRequirePosLinePermissions(items);

  if (needManualHh && !pinHoldsPermission(req, P.pos_happyhour_manual)) {
    res.status(403).json({ error: 'Permission denied: Happy Hour manuel', code: 'POS_HAPPYHOUR_MANUAL' });
    return true;
  }
  if (needOffert && !pinHoldsPermission(req, P.pos_apply_offert)) {
    res.status(403).json({ error: 'Permission denied: offert', code: 'POS_APPLY_OFFERT' });
    return true;
  }
  if (needPerso && !pinHoldsPermission(req, P.pos_apply_perso)) {
    res.status(403).json({ error: 'Permission denied: perso', code: 'POS_APPLY_PERSO' });
    return true;
  }
  if (needRemise && !pinHoldsPermission(req, P.pos_apply_remise)) {
    res.status(403).json({ error: 'Permission denied: remise', code: 'POS_APPLY_REMISE' });
    return true;
  }
  return false;
}

/**
 * After validateBody for POST /api/orders (and floor ticket sync) — ensures the PIN actor
 * holds Offert / Perso / Remise / Happy Hour manuel when the payload requests them.
 */
export function assertPosOrderLinePermissions() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const items = (req.body as { items?: OrderItemPermissionInput[] })?.items;
    if (!Array.isArray(items)) {
      return next();
    }

    if (denyIfMissingPosLinePermissions(req, res, items)) {
      return;
    }
    return next();
  };
}
