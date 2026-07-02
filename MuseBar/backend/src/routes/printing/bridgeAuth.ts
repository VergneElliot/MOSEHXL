import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

import { pool } from '../../db/pool';
import { getActiveBridgeConfiguration } from '../../printing/printingConfigRepo';
import { getLogger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function validateBridgeRequest(req: Request): Promise<string> {
  const establishmentId = typeof req.query.establishment_id === 'string'
    ? req.query.establishment_id.trim()
    : '';
  const bridgeKey = typeof req.headers['x-bridge-key'] === 'string'
    ? req.headers['x-bridge-key'].trim()
    : '';

  if (!establishmentId || !bridgeKey) {
    throw new AppError('Bridge authentication required', 401, 'BRIDGE_AUTH_REQUIRED');
  }

  const config = await getActiveBridgeConfiguration(pool, establishmentId);
  const expected = typeof config?.bridgeKey === 'string' ? config.bridgeKey : '';
  if (!expected || !safeEquals(bridgeKey, expected)) {
    getLogger().warn('Bridge authentication failed');
    throw new AppError('Invalid bridge key', 401, 'BRIDGE_AUTH_FAILED');
  }

  return establishmentId;
}
