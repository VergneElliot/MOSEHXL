/**
 * Security Middleware Collection
 * Re-exports modular security components for backward compatibility
 */

// Re-export all components from the modular security package
export { SecurityMiddlewareFactory } from './security/SecurityMiddleware';
export { RateLimitMiddleware } from './security/RateLimitMiddleware';
export { InputSanitizationService } from './security/InputSanitization';
export { RequestSizeLimitService } from './security/InputSanitization';
export { SecurityHeadersService } from './security/SecurityHeaders';
export { CorsConfigurationService } from './security/CorsConfiguration';

// Re-export convenience functions
export { 
  createSecurityMiddleware,
  inputSanitization,
  requestSizeLimit,
  securityHeaders,
  createCorsOptions
} from './security/index';

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
export { SecurityMiddlewareFactory as default } from './security/SecurityMiddleware'; 