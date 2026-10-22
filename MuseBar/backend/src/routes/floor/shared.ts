import express from 'express';
import {
  requireEstablishmentAdminOrPermission,
  requireAnyPermission,
} from '../auth';
import { P } from '../../permissions/registry';
import { ValidationError } from '../../middleware/errorHandler';
import { pool } from '../../db/pool';

export function formatUserDisplayName(input: {
  first_name: string | null;
  last_name: string | null;
  email: string;
}): string {
  const parts = [input.first_name, input.last_name].filter((p) => p && String(p).trim());
  return parts.length > 0 ? parts.join(' ') : input.email;
}

export async function resolveWaiterDisplayName(userId: number | null): Promise<string | null> {
  if (userId == null) return null;
  const result = await pool.query(
    `SELECT first_name, last_name, email FROM users WHERE id = $1`,
    [userId]
  );
  const row = result.rows[0] as
    | { first_name: string | null; last_name: string | null; email: string }
    | undefined;
  return row ? formatUserDisplayName(row) : null;
}

/** Establishment admins always; otherwise explicit manage_floor_plan (staff). */
export const manageFloor = requireEstablishmentAdminOrPermission(P.manage_floor_plan);

/**
 * Plan/table catalog reads: POS (`access_pos`) or floor editors.
 * Establishment admins always pass (Admin canvas without relying on POS perm).
 */
export const readFloorCatalog = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (req.user?.role === 'establishment_admin') return next();
  return requireAnyPermission([P.access_pos, P.manage_floor_plan])(req, res, next);
};

export function parseShape(value: unknown): 'rectangle' | 'circle' | 'square' {
  if (value === 'rectangle' || value === 'circle' || value === 'square') return value;
  throw new ValidationError('shape must be rectangle, circle, or square');
}
