/**
 * Rate Limiting Middleware
 * Handles request rate limiting with memory-based storage
 */

import { Request, Response, NextFunction } from 'express';
import { EnvironmentConfig } from '../../config/environment';
import { Logger } from '../../utils/logger';
import { RateLimitError } from '../errorHandler';
import { RateLimitStore, RateLimitStats, SecurityMiddlewareFunction } from './types';

/**
 * Rate Limiting Middleware Class
 */
export class RateLimitMiddleware {
  private store: RateLimitStore = {};
  private config: EnvironmentConfig;
  private logger: Logger;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: EnvironmentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Create rate limiting middleware
   */
  public createMiddleware(): SecurityMiddlewareFunction {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();
      const windowMs = this.config.security.rateLimitWindowMs;
      const maxRequests = this.config.security.rateLimitMaxRequests;

      // Initialize or get existing entry
      if (!this.store[key] || now > this.store[key].resetTime) {
        this.store[key] = {
          count: 1,
          resetTime: now + windowMs,
        };
      } else {
        this.store[key].count++;
      }

      const entry = this.store[key];

      // Check if limit exceeded
      if (entry.count > maxRequests) {
        const resetTime = new Date(entry.resetTime);
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

        // Log rate limit violation
        this.logger.security(
          'Rate limit exceeded',
          'medium',
          {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            url: req.originalUrl,
            count: entry.count,
            limit: maxRequests,
            resetTime: resetTime.toISOString(),
          },
          req.user?.id ? String(req.user.id) : undefined,
          req.ip,
          req.requestId
        );

        // Set rate limit headers
        this.setRateLimitHeaders(res, maxRequests, 0, entry.resetTime, retryAfter);

        throw new RateLimitError(`Trop de requêtes. Réessayez dans ${retryAfter} secondes.`);
      }

      // Set rate limit headers
      this.setRateLimitHeaders(
        res, 
        maxRequests, 
        Math.max(0, maxRequests - entry.count), 
        entry.resetTime
      );

      next();
    };
  }

  /**
   * Set rate limit headers
   */
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
   * Generate rate limit key based on IP and user
   */
  private getKey(req: Request): string {
    const userId = req.user?.id;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(
        'Rate limit store cleanup completed',
        { cleanedEntries: cleaned, remainingEntries: Object.keys(this.store).length },
        'RATE_LIMIT'
      );
    }
  }

  /**
   * Get rate limit statistics
   */
  public getStats(): RateLimitStats {
    const entries = Object.entries(this.store)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalKeys: Object.keys(this.store).length,
      topIPs: entries,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  public resetKey(key: string): boolean {
    if (this.store[key]) {
      delete this.store[key];
      this.logger.debug('Rate limit reset for key', { key }, 'RATE_LIMIT');
      return true;
    }
    return false;
  }

  /**
   * Get current count for a key
   */
  public getKeyCount(key: string): number {
    return this.store[key]?.count || 0;
  }

  /**
   * Cleanup on shutdown
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
