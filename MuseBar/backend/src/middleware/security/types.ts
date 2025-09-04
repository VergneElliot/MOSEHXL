/**
 * Security Middleware Types
 * Type definitions for security middleware components
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Rate limiting store interface
 */
export interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
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
  getStats?: () => RateLimitStats | null;
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
