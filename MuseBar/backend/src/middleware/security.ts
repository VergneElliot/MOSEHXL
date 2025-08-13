/**
 * Security Middleware Collection
 * Provides comprehensive security features including rate limiting, input validation, and security headers
 */

import { Request, Response, NextFunction } from 'express';
import { EnvironmentConfig } from '../config/environment';
import { Logger } from '../utils/logger';
import { RateLimitError, ValidationError } from './errorHandler';

/**
 * Rate limiting store interface
 */
interface RateLimitStore {
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
 * Rate Limiting Middleware
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
  public createMiddleware() {
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
          req.user?.id,
          req.ip,
          req.requestId
        );

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
          'Retry-After': retryAfter.toString(),
        });

        throw new RateLimitError(`Trop de requêtes. Réessayez dans ${retryAfter} secondes.`);
      }

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - entry.count).toString(),
        'X-RateLimit-Reset': entry.resetTime.toString(),
      });

      next();
    };
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
  public getStats(): {
    totalKeys: number;
    topIPs: Array<{ key: string; count: number; resetTime: number }>;
  } {
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
   * Cleanup on shutdown
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Input Sanitization Middleware
 */
export const inputSanitization = (logger?: Logger) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      if (logger) {
        logger.error(
          'Input sanitization failed',
          error as Error,
          {
            url: req.originalUrl,
            method: req.method,
          },
          'SECURITY',
          req.requestId
        );
      }

      throw new ValidationError('Invalid input format');
    }
  };
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Sanitize string input
 */
const sanitizeString = (str: string): string => {
  return str
    // Remove potential XSS vectors
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/onload\s*=/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onclick\s*=/gi, '')
    // Remove potential SQL injection vectors
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '')
    // Trim and limit length
    .trim()
    .substring(0, 10000); // Reasonable length limit
};

/**
 * Security Headers Middleware
 */
export const securityHeaders = (config: EnvironmentConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Security headers
    res.set({
      // Prevent XSS attacks
      'X-XSS-Protection': '1; mode=block',
      
      // Prevent content type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Prevent iframe embedding (clickjacking protection)
      'X-Frame-Options': 'DENY',
      
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
        "media-src 'self'",
        "frame-src 'none'",
      ].join('; '),
      
      // HTTP Strict Transport Security (HTTPS only)
      ...(config.app.environment === 'production' && {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      }),
      
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Feature Policy / Permissions Policy
      'Permissions-Policy': [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'interest-cohort=()',
      ].join(', '),
      
      // Server identification
      'X-Powered-By': config.app.name,
    });

    next();
  };
};

/**
 * Request Size Limiting Middleware
 */
export const requestSizeLimit = (maxSizeKB: number, logger?: Logger) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSizeBytes = maxSizeKB * 1024;

    if (contentLength > maxSizeBytes) {
      if (logger) {
        logger.security(
          'Request size limit exceeded',
          'low',
          {
            contentLength,
            maxSize: maxSizeBytes,
            url: req.originalUrl,
            method: req.method,
          },
          req.user?.id,
          req.ip,
          req.requestId
        );
      }

      throw new ValidationError(`Request too large. Maximum size: ${maxSizeKB}KB`);
    }

    next();
  };
};

/**
 * Comprehensive Security Middleware Factory
 */
export const createSecurityMiddleware = (
  config: EnvironmentConfig,
  logger: Logger,
  options: Partial<SecurityOptions> = {}
) => {
  const opts: SecurityOptions = {
    enableRateLimit: true,
    enableInputSanitization: true,
    enableSecurityHeaders: true,
    enableRequestSizeLimit: true,
    maxRequestSizeKB: 1024, // 1MB default
    ...options,
  };

  const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

  // Security headers
  if (opts.enableSecurityHeaders) {
    middlewares.push(securityHeaders(config));
  }

  // Request size limiting
  if (opts.enableRequestSizeLimit) {
    middlewares.push(requestSizeLimit(opts.maxRequestSizeKB, logger));
  }

  // Input sanitization
  if (opts.enableInputSanitization) {
    middlewares.push(inputSanitization(logger));
  }

  // Rate limiting
  let rateLimitMiddleware: RateLimitMiddleware | null = null;
  if (opts.enableRateLimit) {
    rateLimitMiddleware = new RateLimitMiddleware(config, logger);
    middlewares.push(rateLimitMiddleware.createMiddleware());
  }

  // Combined middleware function
  const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
    let index = 0;

    const runNext = (err?: any) => {
      if (err) return next(err);
      
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      try {
        middleware(req, res, runNext);
      } catch (error) {
        next(error);
      }
    };

    runNext();
  };

  // Attach cleanup method
  (securityMiddleware as any).destroy = () => {
    if (rateLimitMiddleware) {
      rateLimitMiddleware.destroy();
    }
  };

  // Attach stats method
  (securityMiddleware as any).getStats = () => {
    return rateLimitMiddleware ? rateLimitMiddleware.getStats() : null;
  };

  return securityMiddleware;
};

/**
 * CORS Configuration Helper
 */
export const createCorsOptions = (config: EnvironmentConfig) => {
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      const allowedOrigins = config.server.corsOrigins;
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        // Exact string match
        if (origin === allowedOrigin) {
          return true;
        }
        // Pattern matching for development
        if (allowedOrigin.includes('*')) {
          const pattern = allowedOrigin.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        return callback(null, true);
      }

      // In development, be more permissive
      if (config.app.environment === 'development') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Request-ID',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
  };
}; 