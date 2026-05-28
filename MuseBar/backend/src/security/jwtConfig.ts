import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export type JwtSigningAlgorithm = 'HS256' | 'RS256';

type VerifyPayload = jwt.JwtPayload | string;

type JwtRuntimeConfig = {
  signingAlgorithm: JwtSigningAlgorithm;
  allowLegacyHs256Verify: boolean;
  jwtSecret: string;
  privateKey?: string;
  publicKey?: string;
  keyId?: string;
};

function normalizePem(raw: string): string {
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

function getSigningAlgorithm(): JwtSigningAlgorithm {
  const raw = process.env.AUTH_JWT_SIGN_ALG?.trim().toUpperCase();
  if (raw === 'RS256') return 'RS256';
  return 'HS256';
}

function getAllowLegacyHs256Verify(): boolean {
  const raw = process.env.AUTH_JWT_ALLOW_LEGACY_HS256_VERIFY?.trim().toLowerCase();
  if (raw === 'false') return false;
  return true;
}

function resolveRuntimeConfig(): JwtRuntimeConfig {
  const signingAlgorithm = getSigningAlgorithm();
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable is required and must be at least 32 characters.'
    );
  }

  if (signingAlgorithm === 'HS256') {
    return {
      signingAlgorithm,
      allowLegacyHs256Verify: getAllowLegacyHs256Verify(),
      jwtSecret,
    };
  }

  const rawPrivateKey = process.env.JWT_PRIVATE_KEY;
  const rawPublicKey = process.env.JWT_PUBLIC_KEY;
  if (!rawPrivateKey || !rawPublicKey) {
    throw new Error(
      'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required when AUTH_JWT_SIGN_ALG=RS256.'
    );
  }

  return {
    signingAlgorithm,
    allowLegacyHs256Verify: getAllowLegacyHs256Verify(),
    jwtSecret,
    privateKey: normalizePem(rawPrivateKey),
    publicKey: normalizePem(rawPublicKey),
    keyId: process.env.AUTH_JWT_KID?.trim() || 'mosehxl-rs256-1',
  };
}

function decodeTokenHeader(token: string): { alg?: string } {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded !== 'object') {
    return {};
  }
  const header = (decoded as { header?: { alg?: string } }).header;
  return header ?? {};
}

export function getJwtSigningAlgorithm(): JwtSigningAlgorithm {
  return resolveRuntimeConfig().signingAlgorithm;
}

export function signJwtToken(
  payload: object,
  expiresIn: jwt.SignOptions['expiresIn']
): string {
  const config = resolveRuntimeConfig();
  if (config.signingAlgorithm === 'RS256') {
    return jwt.sign(payload, config.privateKey!, {
      algorithm: 'RS256',
      expiresIn,
      keyid: config.keyId,
    });
  }

  return jwt.sign(payload, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn,
  });
}

export function verifyJwtToken(token: string): VerifyPayload {
  const config = resolveRuntimeConfig();
  const header = decodeTokenHeader(token);

  if (header.alg === 'RS256' || (header.alg == null && config.signingAlgorithm === 'RS256')) {
    if (!config.publicKey) {
      throw new Error('RS256 verification key is not configured');
    }
    return jwt.verify(token, config.publicKey, { algorithms: ['RS256'] });
  }

  if (header.alg === 'HS256' || header.alg == null) {
    if (!config.allowLegacyHs256Verify && config.signingAlgorithm === 'RS256') {
      throw new Error('HS256 verification is disabled in RS256 mode');
    }
    return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  }

  throw new Error(`Unsupported JWT algorithm: ${header.alg ?? 'unknown'}`);
}

export function getJwtJwks(): { keys: Array<Record<string, string>> } {
  const config = resolveRuntimeConfig();
  if (config.signingAlgorithm !== 'RS256' || !config.publicKey) {
    return { keys: [] };
  }

  const jwk = crypto.createPublicKey(config.publicKey).export({ format: 'jwk' }) as JsonWebKey;
  if (!jwk.n || !jwk.e || !jwk.kty) {
    throw new Error('Failed to derive RSA JWK from JWT_PUBLIC_KEY');
  }

  return {
    keys: [{
      kty: String(jwk.kty),
      use: 'sig',
      kid: config.keyId ?? 'mosehxl-rs256-1',
      alg: 'RS256',
      n: String(jwk.n),
      e: String(jwk.e),
    }],
  };
}

