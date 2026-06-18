import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user';
import { P } from '../permissions/registry';

type OrderItemInput = {
  description?: string | null;
  happy_hour_applied?: boolean;
  is_manual_happy_hour?: boolean;
  manual_happy_hour?: boolean;
};

/**
 * After validateBody for POST /api/orders — ensures staff holds POS line-item permissions
 * (manual Happy Hour, Offert, Perso) when the payload requests those features.
 * establishment_admin effective permissions always include all keys (UserModel.getUserPermissions).
 */
export function assertPosOrderLinePermissions() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = Number(req.user?.id);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const perms = await UserModel.getUserPermissions(userId);
    const items = (req.body as { items?: OrderItemInput[] })?.items;
    if (!Array.isArray(items)) {
      return next();
    }

    const hasManualHh = items.some(
      (i) => i && (i.is_manual_happy_hour === true || i.manual_happy_hour === true)
    );
    const hasOffert = items.some(
      (i) => typeof i?.description === 'string' && i.description.includes('[Offert]')
    );
    const hasPerso = items.some(
      (i) => typeof i?.description === 'string' && i.description.includes('[Perso]')
    );

    if (hasManualHh && !perms.includes(P.pos_happyhour_manual)) {
      return res.status(403).json({ error: 'Permission denied: Happy Hour manuel' });
    }
    if (hasOffert && !perms.includes(P.pos_apply_offert)) {
      return res.status(403).json({ error: 'Permission denied: offert' });
    }
    if (hasPerso && !perms.includes(P.pos_apply_perso)) {
      return res.status(403).json({ error: 'Permission denied: perso' });
    }

    return next();
  };
}
