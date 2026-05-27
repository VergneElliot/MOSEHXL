/**
 * Authentication & authorization middleware.
 * Canonical location — all other files should import from here
 * (or from `routes/auth.ts` which re-exports these).
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user';
import { runWithTenantContext } from '../rls/tenantContext';

// No fallback: if JWT_SECRET is missing, fail fast so we never run with a default secret.
const rawSecret = process.env.JWT_SECRET;
if (!rawSecret || rawSecret.length < 32) {
  throw new Error(
    'JWT_SECRET environment variable is required and must be at least 32 characters. ' +
    'Set it in your .env file and restart the server.'
  );
}
const JWT_SECRET: string = rawSecret;
const JWT_VERIFY_OPTIONS: jwt.VerifyOptions = { algorithms: ['HS256'] };

export interface JwtPayload {
  id: number;
  email: string;
  is_admin?: boolean;
  role: string;
  establishment_id: string | null;
  jti?: string;
  support_impersonation?: {
    actor_user_id: number;
    reason: string;
    started_at: string;
    expires_at: string;
  };
}

export function generateToken(
  payload: JwtPayload,
  rememberMe: boolean = false,
  customExpiresIn?: jwt.SignOptions['expiresIn']
): string {
  const expiration: jwt.SignOptions['expiresIn'] = customExpiresIn ?? '15m';
  const payloadWithJti = payload.jti ? payload : { ...payload, jti: crypto.randomUUID() };
  // One-rollover migration: never emit legacy `is_admin` in new tokens.
  const { is_admin: _legacyIsAdmin, ...signablePayload } = payloadWithJti;
  return jwt.sign(signablePayload, JWT_SECRET, { expiresIn: expiration });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET, JWT_VERIFY_OPTIONS) as JwtPayload;
}

async function isTokenRevoked(token: string): Promise<boolean> {
  const { TokenBlocklistModel } = await import('../models/tokenBlocklist');
  return TokenBlocklistModel.isTokenRevoked(token);
}

/**
 * Decode JWT from the Authorization header and populate req.user.
 * No database round-trip -- everything comes from the token.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  try {
    const rawToken = auth.slice(7);
    const revoked = await isTokenRevoked(rawToken);
    if (revoked) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const payload = verifyToken(rawToken);
    const isAdminFromPayload =
      typeof payload.is_admin === 'boolean'
        ? payload.is_admin
        : payload.role === 'system_admin';
    if (payload.support_impersonation?.expires_at) {
      const expiresAt = new Date(payload.support_impersonation.expires_at);
      if (!Number.isNaN(expiresAt.getTime()) && Date.now() > expiresAt.getTime()) {
        return res.status(401).json({ error: 'Support impersonation token expired' });
      }
    }
    req.user = {
      id: payload.id,
      email: payload.email,
      is_admin: isAdminFromPayload,
      role: payload.role,
      establishment_id: payload.establishment_id ?? null,
      support_impersonation: payload.support_impersonation,
    };
    runWithTenantContext({ establishmentId: req.user.establishment_id ?? null }, () => next());
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Gate: system administrator only. */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // System admin is determined by role (single source of truth).
  if (req.user?.role !== 'system_admin') {
    return res.status(403).json({ error: 'System administrator access required' });
  }
  next();
}

/** Gate: establishment administrator only. */
export function requireEstablishmentAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'establishment_admin') {
    return res.status(403).json({ error: 'Establishment administrator access required' });
  }
  next();
}

/** Gate: user must hold the named permission. */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const perms = await UserModel.getUserPermissions(Number(req.user?.id));
    if (!perms.includes(permission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}

/** User must have at least one of the given permissions. */
export function requireAnyPermission(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const perms = await UserModel.getUserPermissions(Number(req.user?.id));
    if (permissions.some((p) => perms.includes(p))) return next();
    return res.status(403).json({ error: 'Permission denied' });
  };
}

/**
 * establishment_admin always passes; otherwise require the given permission
 * (used for "Gestion des utilisateurs" so trusted staff can manage users without being admin).
 */
export function requireEstablishmentAdminOrPermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === 'establishment_admin') return next();
    return requirePermission(permission)(req, res, next);
  };
}

/**
 * Extract establishment_id from the authenticated request.
 * Sends 403 and returns null if user has no establishment (e.g. system admin without context).
 * Use after requireAuth. Single source of truth for establishment-scoped routes.
 */
export function getEstablishmentId(req: Request, res: Response): string | null {
  const id = req.user?.establishment_id;
  if (!id) {
    res.status(403).json({ error: 'No establishment associated with this account' });
    return null;
  }
  return id;
}

/**
 * Gate: protects one-time bootstrap endpoints (e.g. POST /api/auth/setup).
 *
 * Requires:
 * - SETUP_SECRET env var (validated as required in production by config/environment.ts)
 * - X-Setup-Secret request header to match SETUP_SECRET
 */
export function requireSetupSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.SETUP_SECRET;
  if (!secret) {
    // Fail closed. If SETUP_SECRET is unset, bootstrap endpoints must be unusable.
    return res.status(403).json({ error: 'Forbidden' });
  }

  const provided = req.header('x-setup-secret') ?? '';
  if (!provided) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const a = Buffer.from(secret, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}

/** @deprecated Use requireAuth instead. Kept for printing routes backward compat. */
export const authenticateToken = requireAuth;
