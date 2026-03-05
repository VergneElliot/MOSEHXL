/**
 * Comprehensive Security Middleware
 * Main orchestrator for all security middleware components
 */

import { Request, Response, NextFunction } from 'express';
import { EnvironmentConfig } from '../../config/environment';
import { Logger } from '../../utils/logger';
import { RateLimitMiddleware } from './RateLimitMiddleware';
import { InputSanitizationService, RequestSizeLimitService } from './InputSanitization';
import { SecurityHeadersService } from './SecurityHeaders';
import { 
  SecurityOptions, 
  SecurityMiddlewareFunction, 
  ExtendedSecurityMiddleware,
  RateLimitStats
} from './types';

/**
 * Comprehensive Security Middleware Factory
 */
export class SecurityMiddlewareFactory {
  /**
   * Create comprehensive security middleware
   */
  public static create(
    config: EnvironmentConfig,
    logger: Logger,
    options: Partial<SecurityOptions> = {}
  ): ExtendedSecurityMiddleware {
    const opts: SecurityOptions = {
      enableRateLimit: true,
      enableInputSanitization: true,
      enableSecurityHeaders: true,
      enableRequestSizeLimit: true,
      maxRequestSizeKB: 1024, // 1MB default
      ...options,
    };

    const middlewares: SecurityMiddlewareFunction[] = [];

    // Security headers
    if (opts.enableSecurityHeaders) {
      middlewares.push(SecurityHeadersService.createMiddleware(config));
    }

    // Request size limiting
    if (opts.enableRequestSizeLimit) {
      middlewares.push(RequestSizeLimitService.createMiddleware(opts.maxRequestSizeKB, logger));
    }

    // Input sanitization
    if (opts.enableInputSanitization) {
      middlewares.push(InputSanitizationService.createMiddleware(logger));
    }

    // Rate limiting (use pool when provided so limits are shared across processes and survive restart)
    let rateLimitMiddleware: RateLimitMiddleware | null = null;
    if (opts.enableRateLimit) {
      rateLimitMiddleware = new RateLimitMiddleware(config, logger, opts.pool);
      middlewares.push(rateLimitMiddleware.createMiddleware());
    }

    // Combined middleware function
    const securityMiddleware: ExtendedSecurityMiddleware = (
      req: Request, 
      res: Response, 
      next: NextFunction
    ) => {
      SecurityMiddlewareFactory.executeMiddlewares(logger, middlewares, req, res, next);
    };

    // Attach cleanup method
    securityMiddleware.destroy = () => {
      if (rateLimitMiddleware) {
        rateLimitMiddleware.destroy();
      }
    };

    // Attach stats method (async when using shared store)
    securityMiddleware.getStats = (): Promise<RateLimitStats | null> => {
      return rateLimitMiddleware ? rateLimitMiddleware.getStats() : Promise.resolve(null);
    };

    return securityMiddleware;
  }

  /**
   * Execute middleware chain
   */
  private static executeMiddlewares(
    logger: Logger,
    middlewares: SecurityMiddlewareFunction[],
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    let index = 0;

    const runNext = (err?: any) => {
      if (err) {
        logger.warn(`Security middleware error at index ${index}`, { error: err?.message ?? err });
        return next(err);
      }
      
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index];
      index++;
      try {
        middleware(req, res, runNext);
      } catch (error) {
        logger.warn(`Security middleware exception at index ${index - 1}`, { error: error instanceof Error ? error.message : error });
        next(error);
      }
    };

    runNext();
  }

  /**
   * Create lightweight security middleware (minimal overhead)
   */
  public static createLightweight(
    config: EnvironmentConfig,
    logger: Logger
  ): SecurityMiddlewareFunction {
    return SecurityMiddlewareFactory.create(config, logger, {
      enableRateLimit: false,
      enableInputSanitization: true,
      enableSecurityHeaders: true,
      enableRequestSizeLimit: true,
      maxRequestSizeKB: 512,
    });
  }

  /**
   * Create strict security middleware (maximum protection)
   */
  public static createStrict(
    config: EnvironmentConfig,
    logger: Logger
  ): ExtendedSecurityMiddleware {
    return SecurityMiddlewareFactory.create(config, logger, {
      enableRateLimit: true,
      enableInputSanitization: true,
      enableSecurityHeaders: true,
      enableRequestSizeLimit: true,
      maxRequestSizeKB: 256,
    });
  }

  /**
   * Create API-specific security middleware
   */
  public static createForAPI(
    config: EnvironmentConfig,
    logger: Logger
  ): ExtendedSecurityMiddleware {
    return SecurityMiddlewareFactory.create(config, logger, {
      enableRateLimit: true,
      enableInputSanitization: true,
      enableSecurityHeaders: false, // API endpoints might not need all headers
      enableRequestSizeLimit: true,
      maxRequestSizeKB: 2048, // APIs might need larger payloads
    });
  }

  /**
   * Create upload-specific security middleware
   */
  public static createForUploads(
    config: EnvironmentConfig,
    logger: Logger,
    maxSizeMB: number = 10
  ): ExtendedSecurityMiddleware {
    return SecurityMiddlewareFactory.create(config, logger, {
      enableRateLimit: true,
      enableInputSanitization: false, // File uploads don't need string sanitization
      enableSecurityHeaders: true,
      enableRequestSizeLimit: true,
      maxRequestSizeKB: maxSizeMB * 1024,
    });
  }
}

// Export convenience function for backward compatibility
export const createSecurityMiddleware = SecurityMiddlewareFactory.create;
