/**
 * Security Middleware Collection
 * Re-exports modular security components for backward compatibility
 */

// Re-export all components from the modular security package
export { 
  SecurityMiddlewareFactory,
  createSecurityMiddleware,
  RateLimitMiddleware,
  InputSanitizationService,
  RequestSizeLimitService,
  SecurityHeadersService,
  CorsConfigurationService,
  inputSanitization,
  requestSizeLimit,
  securityHeaders,
  createCorsOptions
} from './security';

// Re-export types for backward compatibility
export type {
  SecurityOptions,
  RateLimitStore,
  RateLimitStats,
  SecurityMiddlewareFunction,
  ExtendedSecurityMiddleware,
  CorsCallback,
  CorsOriginFunction
} from './security/types';

// Default export for backward compatibility
export { SecurityMiddlewareFactory as default } from './security'; 