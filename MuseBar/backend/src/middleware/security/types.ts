/**
 * Security Middleware Types
 * Type definitions for security middleware components
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

/**
 * Rate limiting store interface (in-memory object shape; legacy)
 */
export interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Async rate limit store adapter (in-memory or shared e.g. PostgreSQL).
 * Used so rate limiting works across server processes and survives restarts.
 */
export interface IRateLimitStoreAdapter {
  /** Increment counter for key, optionally starting a new window; returns current count and reset time (epoch ms). */
  incrementAndGet(key: string, windowMs: number): Promise<{ count: number; resetTime: number }>;
  /** All entries for stats (e.g. top IPs). */
  getEntriesForStats(): Promise<Array<{ key: string; count: number; resetTime: number }>>;
  /** Current count for a key (optional; for admin/tests). */
  getCount?(key: string): Promise<number>;
  /** Remove a key (e.g. admin reset). */
  resetKey(key: string): Promise<boolean>;
  /** Remove expired entries. */
  cleanup(): Promise<void>;
  /** Called on shutdown. */
  destroy?(): void;
}

/**
 * Security options interface
 */
export interface SecurityOptions {
  enableRateLimit: boolean;
  enableInputSanitization: boolean;
  enableSecurityHeaders: boolean;
  enableRequestSizeLimit: boolean;
  maxRequestSizeKB: number;
  /** When set, rate limiting uses PostgreSQL (shared across processes); otherwise in-memory. */
  pool?: Pool;
}

/**
 * Rate limit statistics
 */
export interface RateLimitStats {
  totalKeys: number;
  topIPs: Array<{ key: string; count: number; resetTime: number }>;
}

/**
 * Security middleware function type
 */
export type SecurityMiddlewareFunction = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => void;

/**
 * Extended security middleware with additional methods
 */
export interface ExtendedSecurityMiddleware extends SecurityMiddlewareFunction {
  destroy?: () => void;
  getStats?: () => Promise<RateLimitStats | null> | RateLimitStats | null;
}

/**
 * CORS callback function type
 */
export type CorsCallback = (err: Error | null, allow?: boolean) => void;

/**
 * CORS origin function type
 */
export type CorsOriginFunction = (
  origin: string | undefined, 
  callback: CorsCallback
) => void;
