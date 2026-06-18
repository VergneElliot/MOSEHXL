import { afterEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';
import express from 'express';
import request from 'supertest';

const ORIGINAL_ENV = { ...process.env };

describe('GET /auth/.well-known/jwks.json', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns 404 when RS256 mode is not enabled', async () => {
    process.env.JWT_SECRET = 'x'.repeat(32);
    delete process.env.AUTH_JWT_SIGN_ALG;

    vi.resetModules();
    const { default: router } = await import('./authSession');
    const app = express();
    app.use('/auth', router);

    const res = await request(app).get('/auth/.well-known/jwks.json');
    expect(res.status).toBe(404);
  });

  it('returns JWKS when RS256 mode is enabled', async () => {
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.AUTH_JWT_SIGN_ALG = 'RS256';
    process.env.AUTH_JWT_KID = 'kid-rs256-route';
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.JWT_PUBLIC_KEY = publicKey;

    vi.resetModules();
    const { default: router } = await import('./authSession');
    const app = express();
    app.use('/auth', router);

    const res = await request(app).get('/auth/.well-known/jwks.json');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.keys)).toBe(true);
    expect(res.body.keys).toHaveLength(1);
    expect(res.body.keys[0]?.kid).toBe('kid-rs256-route');
    expect(res.body.keys[0]?.alg).toBe('RS256');
  });

  it('returns active and additional verify keys in JWKS during rotation', async () => {
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.AUTH_JWT_SIGN_ALG = 'RS256';
    process.env.AUTH_JWT_KID = 'kid-active-route';
    const active = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const previous = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.JWT_PRIVATE_KEY = active.privateKey;
    process.env.JWT_PUBLIC_KEY = active.publicKey;
    process.env.AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON = JSON.stringify({
      'kid-previous-route': previous.publicKey,
    });

    vi.resetModules();
    const { default: router } = await import('./authSession');
    const app = express();
    app.use('/auth', router);

    const res = await request(app).get('/auth/.well-known/jwks.json');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.keys)).toBe(true);
    expect(res.body.keys.map((k: { kid?: string }) => k.kid)).toEqual([
      'kid-active-route',
      'kid-previous-route',
    ]);
  });
});

