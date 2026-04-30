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
});
