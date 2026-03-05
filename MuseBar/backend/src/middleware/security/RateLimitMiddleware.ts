/**
 * Rate Limiting Middleware
 * Uses a store adapter: in-memory (single process, resets on restart) or
 * PostgreSQL (shared across processes, survives restart). See audit #40.
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
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
    const key = this.getKey(req);
    const windowMs = this.config.security.rateLimitWindowMs;
    const maxRequests = this.config.security.rateLimitMaxRequests;

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

  private getKey(req: Request): string {
    const userId = req.user?.id;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
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
