import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { RateLimitError } from '../errorHandler';
import { InMemoryRateLimitStore } from './InMemoryRateLimitStore';
import { PostgresRateLimitStore } from './PostgresRateLimitStore';
import { IRateLimitStoreAdapter, SecurityMiddlewareFunction } from './types';
import { verifyJwtToken } from '../../security/jwtConfig';

interface SecurityLoggerLike {
  security: (
    event: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: number
  ) => void;
}

interface AuthRateLimitOptions {
  logger: SecurityLoggerLike;
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
  keyResolver: (req: Request) => string;
  errorMessage: string;
  pool?: Pool;
}

function setRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetTime: number,
  retryAfter?: number
): void {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(),
  };
  if (retryAfter !== undefined) {
    headers['Retry-After'] = retryAfter.toString();
  }
  res.set(headers);
}

function createStore(pool?: Pool): IRateLimitStoreAdapter {
  return pool ? new PostgresRateLimitStore(pool) : new InMemoryRateLimitStore();
}

function hashForRateLimit(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24);
}

export function resolveLoginRateLimitKey(req: Request): string {
  const ip = req.ip ?? 'unknown';
  const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const emailHash = hashForRateLimit(rawEmail || 'unknown-email');
  return `ip:${ip}:email:${emailHash}`;
}

export function createRefreshRateLimitKeyResolver(_jwtSecret: string) {
  void _jwtSecret;
  return (req: Request): string => {
    const ip = req.ip ?? 'unknown';
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return `ip:${ip}:user:anon`;
    }

    const token = auth.slice(7).trim();
    if (!token) {
      return `ip:${ip}:user:anon`;
    }

    try {
      const decoded = verifyJwtToken(token) as { id?: number };
      if (typeof decoded?.id === 'number' && Number.isFinite(decoded.id)) {
        return `ip:${ip}:user:${decoded.id}`;
      }
    } catch {
      // ignore invalid token and fall back to anon shard
    }

    return `ip:${ip}:user:anon`;
  };
}

export function resolveOpaqueRefreshRateLimitKey(req: Request): string {
  const ip = req.ip ?? 'unknown';
  const cookieHeader = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const refreshCookiePart = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('musebar_refresh_token='));
  const refreshFromCookie = refreshCookiePart
    ? decodeURIComponent(refreshCookiePart.slice('musebar_refresh_token='.length).trim())
    : '';
  const rawRefreshToken = refreshFromCookie;
  if (!rawRefreshToken) {
    return `ip:${ip}:refresh:anon`;
  }
  return `ip:${ip}:refresh:${hashForRateLimit(rawRefreshToken)}`;
}

export function createAuthRateLimitMiddleware(options: AuthRateLimitOptions): SecurityMiddlewareFunction {
  const store = createStore(options.pool);

  return (req: Request, res: Response, next: NextFunction) => {
    const execute = async () => {
      const key = `${options.keyPrefix}:${options.keyResolver(req)}`;
      const entry = await store.incrementAndGet(key, options.windowMs);
      const now = Date.now();

      if (entry.count > options.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        options.logger.security(
          'Auth endpoint rate limit exceeded',
          'MEDIUM',
          {
            keyPrefix: options.keyPrefix,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            count: entry.count,
            limit: options.maxRequests,
            retryAfterSeconds: retryAfter,
          },
          req.requestId,
          req.user?.id ? parseInt(String(req.user.id)) : undefined
        );
        setRateLimitHeaders(res, options.maxRequests, 0, entry.resetTime, retryAfter);
        return next(new RateLimitError(options.errorMessage));
      }

      setRateLimitHeaders(
        res,
        options.maxRequests,
        Math.max(0, options.maxRequests - entry.count),
        entry.resetTime
      );
      return next();
    };

    execute().catch(next);
  };
}
