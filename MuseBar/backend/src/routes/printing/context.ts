import type { NextFunction, Response } from 'express';

import { pool } from '../../db/pool';
import type { IPrintingService } from '../../services/printing';
import { createPrintingServiceManager } from '../../printing/printingServiceManager';
import type { PrintingUser } from '../../printing/printDataRepo';
import { getLogger } from '../../utils/logger';
import type { AuthenticatedRequest } from '../userManagement/types';
import { ValidationError } from '../../middleware/errorHandler';

export const printingServiceManager = createPrintingServiceManager(pool, getLogger());

export function getPrintingUser(req: AuthenticatedRequest): PrintingUser | null {
  const establishmentIdRaw = req.user?.establishment_id;
  const establishmentId = typeof establishmentIdRaw === 'string' ? establishmentIdRaw : null;
  if (!establishmentId) return null;
  if (!req.user) return null;
  return {
    establishment_id: establishmentId,
    id: req.user.id,
    username: (req.user as { username?: string }).username,
  };
}

export async function getPrintingService(establishmentId: string): Promise<IPrintingService> {
  return printingServiceManager.getPrintingService(establishmentId);
}

export const ensureEstablishment = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const user = getPrintingUser(req);
  if (!user) {
    throw new ValidationError('Establishment context required');
  }
  void res;
  next();
};
