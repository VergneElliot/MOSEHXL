/**
 * Rate Limiting Middleware
 * Uses a store adapter: in-memory (single process, resets on restart) or
 * PostgreSQL (shared across processes, survives restart). See audit #40.
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { EnvironmentConfig } from '../../config/environment';
import { Logger } from '../../utils/logger';
import { RateLimitError } from '../errorHandler';
import { IRateLimitStoreAdapter, RateLimitStats, SecurityMiddlewareFunction } from './types';
import { InMemoryRateLimitStore } from './InMemoryRateLimitStore';
import { PostgresRateLimitStore } from './PostgresRateLimitStore';

export class RateLimitMiddleware {
  private store: IRateLimitStoreAdapter;
  private config: EnvironmentConfig;
  private logger: Logger;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: EnvironmentConfig, logger: Logger, pool?: Pool) {
    this.config = config;
    this.logger = logger;
    this.store = pool ? new PostgresRateLimitStore(pool) : new InMemoryRateLimitStore();
    this.cleanupInterval = setInterval(() => {
      this.store.cleanup().catch((err) => {
        this.logger.warn('Rate limit store cleanup failed', { error: err?.message ?? err });
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Create rate limiting middleware
   */
  public createMiddleware(): SecurityMiddlewareFunction {
    return (req: Request, res: Response, next: NextFunction) => {
      this.run(req, res, next).catch(next);
    };
  }

  private async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Skip rate limiting for health checks so probes do not consume the budget (fixes 429 on login)
    if (req.method === 'GET' && req.originalUrl === '/api/health') {
      return next();
    }

    const key = this.getKey(req);
    const windowMs = this.config.security.rateLimitWindowMs;
    // Global middleware runs before route auth — prefer per-user key from JWT (see getKey).
    // In development, allow more bursts (HMR, React StrictMode, local testing).
    const baseMax = this.config.security.rateLimitMaxRequests;
    const maxRequests =
      this.config.app.environment === 'development' ? baseMax * 10 : baseMax;

    const entry = await this.store.incrementAndGet(key, windowMs);
    const now = Date.now();

    if (entry.count > maxRequests) {
      const resetTime = new Date(entry.resetTime);
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      this.logger.security(
        'Rate limit exceeded',
        'MEDIUM',
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          url: req.originalUrl,
          count: entry.count,
          limit: maxRequests,
          resetTime: resetTime.toISOString(),
        },
        req.requestId,
        req.user?.id ? parseInt(String(req.user.id)) : undefined
      );

      this.setRateLimitHeaders(res, maxRequests, 0, entry.resetTime, retryAfter);
      return next(new RateLimitError(`Trop de requêtes. Réessayez dans ${retryAfter} secondes.`));
    }

    this.setRateLimitHeaders(
      res,
      maxRequests,
      Math.max(0, maxRequests - entry.count),
      entry.resetTime
    );
    next();
  }

  private setRateLimitHeaders(
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

  /**
   * Rate limit sharding. Security stack runs before `requireAuth`, so `req.user` is usually empty.
   * Decode Bearer JWT (same secret as API auth) to bucket by user id; otherwise fall back to IP.
   * Without this, all tabs / POS traffic from one public IP share one 500/15m budget and hit 429 in normal use.
   */
  private getKey(req: Request): string {
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice(7).trim();
      if (token) {
        try {
          const decoded = jwt.verify(token, this.config.security.jwtSecret) as { id?: number };
          if (typeof decoded?.id === 'number' && Number.isFinite(decoded.id)) {
            return `user:${decoded.id}`;
          }
        } catch {
          // Invalid/expired token — use IP
        }
      }
    }
    return `ip:${req.ip ?? 'unknown'}`;
  }

  /**
   * Get rate limit statistics
   */
  public async getStats(): Promise<RateLimitStats> {
    const entries = await this.store.getEntriesForStats();
    const sorted = entries
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return {
      totalKeys: entries.length,
      topIPs: sorted,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  public async resetKey(key: string): Promise<boolean> {
    const ok = await this.store.resetKey(key);
    if (ok) {
      this.logger.debug('Rate limit reset for key', { key }, 'RATE_LIMIT');
    }
    return ok;
  }

  /**
   * Get current count for a key
   */
  public async getKeyCount(key: string): Promise<number> {
    return this.store.getCount?.(key) ?? 0;
  }

  /**
   * Cleanup on shutdown
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.destroy?.();
  }
}
