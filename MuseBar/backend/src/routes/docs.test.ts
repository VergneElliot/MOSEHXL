import { describe, expect, it } from 'vitest';
import { buildSwaggerUiOptions } from './docs';

describe('swagger docs route options', () => {
  it('disables try-it-out in production regardless docs exposure toggle', () => {
    const options = buildSwaggerUiOptions('production');
    expect(options.swaggerOptions.tryItOutEnabled).toBe(false);
    expect(options.swaggerOptions).not.toHaveProperty('requestInterceptor');
  });

  it('enables try-it-out outside production and keeps request interceptor', () => {
    const options = buildSwaggerUiOptions('development');
    expect(options.swaggerOptions.tryItOutEnabled).toBe(true);
    expect(typeof (options.swaggerOptions as { requestInterceptor?: unknown }).requestInterceptor).toBe('function');
  });

  it('request interceptor reads auth_token and sets Authorization header', () => {
    const options = buildSwaggerUiOptions('development');
    const interceptor = (options.swaggerOptions as {
      requestInterceptor?: (req: { headers: Record<string, string> }) => { headers: Record<string, string> };
    }).requestInterceptor;

    expect(typeof interceptor).toBe('function');
    if (!interceptor) {
      throw new Error('requestInterceptor missing in development mode');
    }

    const originalLocalStorage = globalThis.localStorage;
    const getItem = (key: string) => (key === 'auth_token' ? 'jwt-token-value' : null);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem },
    });

    try {
      const req = { headers: {} as Record<string, string> };
      const intercepted = interceptor(req);
      expect(intercepted.headers.Authorization).toBe('Bearer jwt-token-value');
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });

  it('request interceptor leaves Authorization unset when auth_token is absent', () => {
    const options = buildSwaggerUiOptions('development');
    const interceptor = (options.swaggerOptions as {
      requestInterceptor?: (req: { headers: Record<string, string> }) => { headers: Record<string, string> };
    }).requestInterceptor;

    expect(typeof interceptor).toBe('function');
    if (!interceptor) {
      throw new Error('requestInterceptor missing in development mode');
    }

    const originalLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => null },
    });

    try {
      const req = { headers: {} as Record<string, string> };
      const intercepted = interceptor(req);
      expect(intercepted.headers.Authorization).toBeUndefined();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });
});
