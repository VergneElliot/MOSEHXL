import { afterEach, describe, expect, it } from 'vitest';
import { resolveFrontendBaseUrl } from './frontendBaseUrl';

describe('resolveFrontendBaseUrl', () => {
  const prev = {
    FRONTEND_URL: process.env.FRONTEND_URL,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    CORS_ORIGINS: process.env.CORS_ORIGINS,
  };

  afterEach(() => {
    process.env.FRONTEND_URL = prev.FRONTEND_URL;
    process.env.CORS_ORIGIN = prev.CORS_ORIGIN;
    process.env.CORS_ORIGINS = prev.CORS_ORIGINS;
  });

  it('prefers FRONTEND_URL without trailing slash', () => {
    process.env.FRONTEND_URL = 'https://app.example.com/';
    expect(resolveFrontendBaseUrl()).toBe('https://app.example.com');
  });

  it('falls back to first https CORS origin', () => {
    delete process.env.FRONTEND_URL;
    process.env.CORS_ORIGIN = 'http://localhost:3000, https://prod.example.com/';
    expect(resolveFrontendBaseUrl()).toBe('https://prod.example.com');
  });

  it('defaults to localhost when nothing else is set', () => {
    delete process.env.FRONTEND_URL;
    delete process.env.CORS_ORIGIN;
    delete process.env.CORS_ORIGINS;
    expect(resolveFrontendBaseUrl()).toBe('http://localhost:3000');
  });
});
