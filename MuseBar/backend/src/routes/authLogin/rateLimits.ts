import { Logger } from '../../utils/logger';
import { pool } from '../../db/pool';
import {
  createAuthRateLimitMiddleware,
  resolveOpaqueRefreshRateLimitKey,
  resolveLoginRateLimitKey,
} from '../../middleware/security/AuthEndpointRateLimit';

const authRateLimitBase = process.env.NODE_ENV === 'development' ? 5 : 1;
const authLimiterPool = process.env.NODE_ENV === 'test' ? undefined : pool;

const authRateLimitLogger = {
  security: (
    event: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: number
  ) => {
    try {
      Logger.getInstance().security(event, severity, metadata, requestId, userId);
    } catch {
      // In isolated tests the logger may not be initialized; skip side-effect logging.
    }
  },
};

export const loginRateLimit = createAuthRateLimitMiddleware({
  logger: authRateLimitLogger,
  pool: authLimiterPool,
  keyPrefix: 'auth_login',
  windowMs: 15 * 60 * 1000,
  maxRequests: 10 * authRateLimitBase,
  keyResolver: resolveLoginRateLimitKey,
  errorMessage: 'Too many login attempts. Please retry later.',
});

export const refreshRateLimit = createAuthRateLimitMiddleware({
  logger: authRateLimitLogger,
  pool: authLimiterPool,
  keyPrefix: 'auth_refresh',
  windowMs: 15 * 60 * 1000,
  maxRequests: 30 * authRateLimitBase,
  keyResolver: resolveOpaqueRefreshRateLimitKey,
  errorMessage: 'Too many token refresh attempts. Please retry later.',
});
