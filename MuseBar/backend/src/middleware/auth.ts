/**
 * Authentication & authorization middleware.
 * Canonical location — all other files should import from here
 * (or from routes/auth.ts which re-exports these).
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user';

// No fallback: if JWT_SECRET is missing, fail fast so we never run with a default secret.
const rawSecret = process.env.JWT_SECRET;
if (!rawSecret || rawSecret.length < 32) {
  throw new Error(
    'JWT_SECRET environment variable is required and must be at least 32 characters. ' +
    'Set it in your .env file and restart the server.'
  );
}
const JWT_SECRET: string = rawSecret;

export interface JwtPayload {
  id: number;
  email: string;
  is_admin: boolean;
  role: string;
  establishment_id: string | null;
}

export function generateToken(payload: JwtPayload, rememberMe: boolean = false): string {
  const expiration = rememberMe ? '7d' : '12h';
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiration });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
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
    const payload = verifyToken(auth.slice(7));
    req.user = {
      id: payload.id,
      email: payload.email,
      is_admin: payload.is_admin,
      role: payload.role,
      establishment_id: payload.establishment_id ?? null,
    };
    next();
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
  if (!req.user?.is_admin) {
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

/** Gate: user must hold the named permission (admins bypass). */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.is_admin) return next();
    const perms = await UserModel.getUserPermissions(Number(req.user?.id));
    if (!perms.includes(permission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}

/** @deprecated Use requireAuth instead. Kept for printing routes backward compat. */
export const authenticateToken = requireAuth;
