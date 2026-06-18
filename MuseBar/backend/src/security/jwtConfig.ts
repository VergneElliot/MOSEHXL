import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export type JwtSigningAlgorithm = 'HS256' | 'RS256';

type VerifyPayload = jwt.JwtPayload | string;

type Rs256KeyRing = {
  activeKid: string;
  privateKey: string;
  verifyPublicKeysByKid: Record<string, string>;
};

type JwtRuntimeConfig = {
  signingAlgorithm: JwtSigningAlgorithm;
  allowLegacyHs256Verify: boolean;
  jwtSecret: string;
  rs256?: Rs256KeyRing;
};

function normalizePem(raw: string): string {
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

function getSigningAlgorithm(): JwtSigningAlgorithm {
  const raw = process.env.AUTH_JWT_SIGN_ALG?.trim().toUpperCase();
  if (raw === 'RS256') return 'RS256';
  return 'HS256';
}

function getAllowLegacyHs256Verify(signingAlgorithm: JwtSigningAlgorithm): boolean {
  const raw = process.env.AUTH_JWT_ALLOW_LEGACY_HS256_VERIFY?.trim().toLowerCase();
  if (raw === 'false') return false;
  if (raw === 'true') return true;

  // In RS256 production mode, default to strict verification:
  // do not accept legacy HS256 tokens unless explicitly enabled.
  if (signingAlgorithm === 'RS256' && process.env.NODE_ENV === 'production') {
    return false;
  }

  return true;
}

function parseAdditionalRs256VerifyPublicKeys(): Record<string, string> {
  const raw = process.env.AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON?.trim();
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON must be valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON must be a JSON object of { "<kid>": "<pem>" }');
  }

  const normalized: Record<string, string> = {};
  for (const [kidRaw, pemRaw] of Object.entries(parsed as Record<string, unknown>)) {
    const kid = kidRaw.trim();
    if (!kid) {
      throw new Error('AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON contains an empty key id');
    }
    if (typeof pemRaw !== 'string' || pemRaw.trim().length === 0) {
      throw new Error(`AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON key "${kid}" must map to a non-empty PEM string`);
    }
    normalized[kid] = normalizePem(pemRaw);
  }

  return normalized;
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
      allowLegacyHs256Verify: getAllowLegacyHs256Verify(signingAlgorithm),
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
  const activeKid = process.env.AUTH_JWT_KID?.trim() || 'mosehxl-rs256-1';
  const additionalVerifyKeys = parseAdditionalRs256VerifyPublicKeys();
  if (Object.prototype.hasOwnProperty.call(additionalVerifyKeys, activeKid)) {
    throw new Error('AUTH_JWT_ADDITIONAL_PUBLIC_KEYS_JSON must not redefine AUTH_JWT_KID');
  }

  return {
    signingAlgorithm,
    allowLegacyHs256Verify: getAllowLegacyHs256Verify(signingAlgorithm),
    jwtSecret,
    rs256: {
      activeKid,
      privateKey: normalizePem(rawPrivateKey),
      verifyPublicKeysByKid: {
        [activeKid]: normalizePem(rawPublicKey),
        ...additionalVerifyKeys,
      },
    },
  };
}

function decodeTokenHeader(token: string): { alg?: string; kid?: string } {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded !== 'object') {
    return {};
  }
  const header = (decoded as { header?: { alg?: string; kid?: string } }).header;
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
    return jwt.sign(payload, config.rs256!.privateKey, {
      algorithm: 'RS256',
      expiresIn,
      keyid: config.rs256!.activeKid,
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
    const rs256Config = config.rs256;
    if (!rs256Config) {
      throw new Error('RS256 verification key ring is not configured');
    }
    const tokenKid = typeof header.kid === 'string' ? header.kid.trim() : '';
    if (!tokenKid) {
      throw new Error('RS256 token is missing kid header');
    }
    const publicKey = rs256Config.verifyPublicKeysByKid[tokenKid];
    if (!publicKey) {
      throw new Error(`Unknown JWT key id: ${tokenKid}`);
    }
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
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
  const rs256Config = config.rs256;
  if (config.signingAlgorithm !== 'RS256' || !rs256Config) {
    return { keys: [] };
  }

  const orderedKids = Object.keys(rs256Config.verifyPublicKeysByKid).sort((a, b) => {
    if (a === rs256Config.activeKid) return -1;
    if (b === rs256Config.activeKid) return 1;
    return a.localeCompare(b);
  });

  const keys = orderedKids.map((kid) => {
    const pem = rs256Config.verifyPublicKeysByKid[kid];
    if (!pem) {
      throw new Error(`Missing RS256 public key material for kid "${kid}"`);
    }
    const jwk = crypto.createPublicKey(pem).export({ format: 'jwk' }) as JsonWebKey;
    if (!jwk.n || !jwk.e || !jwk.kty) {
      throw new Error(`Failed to derive RSA JWK for kid "${kid}"`);
    }
    return {
      kty: String(jwk.kty),
      use: 'sig',
      kid,
      alg: 'RS256',
      n: String(jwk.n),
      e: String(jwk.e),
    };
  });

  return { keys };
}

