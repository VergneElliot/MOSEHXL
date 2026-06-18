import { afterEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ORIGINAL_ENV = { ...process.env };

async function loadJwtConfigModule() {
  vi.resetModules();
  return import('./jwtConfig');
}

describe('jwtConfig', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('signs and verifies HS256 tokens by default', async () => {
    process.env.JWT_SECRET = 'x'.repeat(32);
    delete process.env.AUTH_JWT_SIGN_ALG;

    const mod = await loadJwtConfigModule();
    const token = mod.signJwtToken({ id: 1, role: 'staff' }, '15m');
    const decoded = mod.verifyJwtToken(token) as { id?: number; role?: string };

    expect(decoded.id).toBe(1);
    expect(decoded.role).toBe('staff');
    expect(mod.getJwtSigningAlgorithm()).toBe('HS256');
    expect(mod.getJwtJwks().keys).toHaveLength(0);
  });

  it('signs RS256 tokens and exposes JWKS key', async () => {
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.AUTH_JWT_SIGN_ALG = 'RS256';
    process.env.AUTH_JWT_KID = 'kid-rs256-1';

    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.JWT_PRIVATE_KEY = privateKey;
    process.env.JWT_PUBLIC_KEY = publicKey;

    const mod = await loadJwtConfigModule();
    const token = mod.signJwtToken({ id: 42, role: 'system_admin' }, '15m');
    const header = jwt.decode(token, { complete: true }) as { header?: { alg?: string; kid?: string } };
    const decoded = mod.verifyJwtToken(token) as { id?: number; role?: string };
    const jwks = mod.getJwtJwks();

    expect(header.header?.alg).toBe('RS256');
    expect(header.header?.kid).toBe('kid-rs256-1');
    expect(decoded.id).toBe(42);
    expect(decoded.role).toBe('system_admin');
    expect(mod.getJwtSigningAlgorithm()).toBe('RS256');
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]?.kid).toBe('kid-rs256-1');
    expect(jwks.keys[0]?.alg).toBe('RS256');
    expect(typeof jwks.keys[0]?.n).toBe('string');
    expect(typeof jwks.keys[0]?.e).toBe('string');
  });

  it('verifies RS256 tokens using additional verify-only key ring entries', async () => {
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.AUTH_JWT_SIGN_ALG = 'RS256';
    process.env.AUTH_JWT_KID = 'kid-active';

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
      'kid-previous': previous.publicKey,
    });

    const mod = await loadJwtConfigModule();
    const previousToken = jwt.sign({ id: 77, role: 'staff' }, previous.privateKey, {
      algorithm: 'RS256',
      keyid: 'kid-previous',
      expiresIn: '15m',
    });
    const decoded = mod.verifyJwtToken(previousToken) as { id?: number };
    const jwks = mod.getJwtJwks();

    expect(decoded.id).toBe(77);
    expect(jwks.keys.map((k) => k.kid)).toEqual(['kid-active', 'kid-previous']);
  });

  it('rejects RS256 tokens with unknown kid', async () => {
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.AUTH_JWT_SIGN_ALG = 'RS256';
    process.env.AUTH_JWT_KID = 'kid-active';

    const active = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const unknown = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    process.env.JWT_PRIVATE_KEY = active.privateKey;
    process.env.JWT_PUBLIC_KEY = active.publicKey;

    const mod = await loadJwtConfigModule();
    const unknownKidToken = jwt.sign({ id: 88 }, unknown.privateKey, {
      algorithm: 'RS256',
      keyid: 'kid-unknown',
      expiresIn: '15m',
    });

    expect(() => mod.verifyJwtToken(unknownKidToken)).toThrow(/Unknown JWT key id/);
  });

  it('defaults legacy HS256 verify to false in RS256 production mode', async () => {
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.NODE_ENV = 'production';
    process.env.AUTH_JWT_SIGN_ALG = 'RS256';
    process.env.AUTH_JWT_KID = 'kid-active';

    const active = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.JWT_PRIVATE_KEY = active.privateKey;
    process.env.JWT_PUBLIC_KEY = active.publicKey;

    const hsToken = jwt.sign({ id: 1 }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '15m',
    });
    const mod = await loadJwtConfigModule();

    expect(() => mod.verifyJwtToken(hsToken)).toThrow(/HS256 verification is disabled/);
  });
});

