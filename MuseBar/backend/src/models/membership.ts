import { pool } from '../db/pool';
import type { Pool, PoolClient } from 'pg';
import {
  listAvailableCalendarColors,
  normalizeCalendarColor,
  pickNextCalendarColor,
} from '../utils/calendarColors';

export type MembershipRole = 'establishment_admin' | 'staff';

export interface EstablishmentMembership {
  user_id: number;
  establishment_id: string;
  role: MembershipRole;
  is_active: boolean;
  calendar_color: string;
  establishment_name?: string;
  created_at?: string;
  updated_at?: string;
}

type Queryable = {
  query: Pool['query'];
};

export class MembershipModel {
  static toApiList(memberships: EstablishmentMembership[]): Array<{
    establishment_id: string;
    name: string;
    role: MembershipRole;
    calendar_color: string;
  }> {
    return memberships.map((m) => ({
      establishment_id: m.establishment_id,
      name: m.establishment_name || '',
      role: m.role,
      calendar_color: m.calendar_color,
    }));
  }

  static async listUsedCalendarColors(
    establishmentId: string,
    excludeUserId?: number,
    db: Queryable = pool
  ): Promise<string[]> {
    const values: unknown[] = [establishmentId];
    let sql = `SELECT calendar_color FROM user_establishment_memberships
               WHERE establishment_id = $1 AND is_active = TRUE`;
    if (excludeUserId != null) {
      values.push(excludeUserId);
      sql += ` AND user_id <> $${values.length}`;
    }
    const result = await db.query(sql, values);
    return result.rows
      .map((r: { calendar_color: string }) => normalizeCalendarColor(r.calendar_color))
      .filter((c: string | null): c is string => Boolean(c));
  }

  static async allocateCalendarColor(
    establishmentId: string,
    excludeUserId?: number,
    db: Queryable = pool
  ): Promise<string> {
    const used = await this.listUsedCalendarColors(establishmentId, excludeUserId, db);
    return pickNextCalendarColor(used);
  }

  /** Ensure membership has a unique color (for raw INSERT paths). */
  static async ensureCalendarColor(
    userId: number,
    establishmentId: string,
    db: Queryable = pool
  ): Promise<string> {
    const existing = await db.query(
      `SELECT calendar_color FROM user_establishment_memberships
       WHERE user_id = $1 AND establishment_id = $2`,
      [userId, establishmentId]
    );
    const current = normalizeCalendarColor(String(existing.rows[0]?.calendar_color || ''));
    if (current) return current;
    const color = await this.allocateCalendarColor(establishmentId, userId, db);
    await db.query(
      `UPDATE user_establishment_memberships
       SET calendar_color = $3, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND establishment_id = $2`,
      [userId, establishmentId, color]
    );
    return color;
  }

  static async listForUser(userId: number): Promise<EstablishmentMembership[]> {
    const result = await pool.query(
      `SELECT m.user_id, m.establishment_id, m.role, m.is_active, m.calendar_color,
              e.name AS establishment_name, m.created_at, m.updated_at
       FROM user_establishment_memberships m
       JOIN establishments e ON e.id = m.establishment_id
       WHERE m.user_id = $1 AND m.is_active = TRUE
       ORDER BY e.name ASC`,
      [userId]
    );
    return result.rows as EstablishmentMembership[];
  }

  static async get(
    userId: number,
    establishmentId: string
  ): Promise<EstablishmentMembership | null> {
    const result = await pool.query(
      `SELECT m.user_id, m.establishment_id, m.role, m.is_active, m.calendar_color,
              e.name AS establishment_name
       FROM user_establishment_memberships m
       JOIN establishments e ON e.id = m.establishment_id
       WHERE m.user_id = $1 AND m.establishment_id = $2 AND m.is_active = TRUE`,
      [userId, establishmentId]
    );
    return (result.rows[0] as EstablishmentMembership) ?? null;
  }

  /** Includes deactivated memberships — needed to reactivate or inspect a disabled account. */
  static async getIncludingInactive(
    userId: number,
    establishmentId: string
  ): Promise<(EstablishmentMembership & { pin_hash: string | null }) | null> {
    const result = await pool.query(
      `SELECT m.user_id, m.establishment_id, m.role, m.is_active, m.calendar_color,
              m.pin_hash, e.name AS establishment_name
       FROM user_establishment_memberships m
       JOIN establishments e ON e.id = m.establishment_id
       WHERE m.user_id = $1 AND m.establishment_id = $2`,
      [userId, establishmentId]
    );
    return (
      (result.rows[0] as (EstablishmentMembership & { pin_hash: string | null }) | undefined) ??
      null
    );
  }

  static async resolveActive(
    userId: number,
    preferredEstablishmentId?: string | null
  ): Promise<EstablishmentMembership | null> {
    if (preferredEstablishmentId) {
      const preferred = await this.get(userId, preferredEstablishmentId);
      if (preferred) return preferred;
    }
    const list = await this.listForUser(userId);
    return list[0] ?? null;
  }

  static async upsert(input: {
    user_id: number;
    establishment_id: string;
    role: MembershipRole;
    is_active?: boolean;
    calendar_color?: string | null;
    client?: PoolClient;
  }): Promise<EstablishmentMembership> {
    const db: Queryable = input.client ?? pool;
    const existing = await db.query(
      `SELECT calendar_color FROM user_establishment_memberships
       WHERE user_id = $1 AND establishment_id = $2`,
      [input.user_id, input.establishment_id]
    );
    let color =
      normalizeCalendarColor(String(input.calendar_color || '')) ||
      normalizeCalendarColor(String(existing.rows[0]?.calendar_color || ''));
    if (!color) {
      color = await this.allocateCalendarColor(
        input.establishment_id,
        input.user_id,
        db
      );
    }

    const result = await db.query(
      `INSERT INTO user_establishment_memberships
         (user_id, establishment_id, role, is_active, calendar_color)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, establishment_id) DO UPDATE
       SET role = EXCLUDED.role,
           is_active = EXCLUDED.is_active,
           calendar_color = COALESCE(user_establishment_memberships.calendar_color, EXCLUDED.calendar_color),
           updated_at = CURRENT_TIMESTAMP
       RETURNING user_id, establishment_id, role, is_active, calendar_color, created_at, updated_at`,
      [
        input.user_id,
        input.establishment_id,
        input.role,
        input.is_active !== false,
        color,
      ]
    );
    return result.rows[0] as EstablishmentMembership;
  }

  static async setCalendarColor(
    userId: number,
    establishmentId: string,
    color: string
  ): Promise<EstablishmentMembership> {
    const normalized = normalizeCalendarColor(color);
    if (!normalized) {
      throw Object.assign(new Error('Couleur invalide (attendu #RRGGBB)'), {
        code: 'INVALID_COLOR',
      });
    }
    const used = await this.listUsedCalendarColors(establishmentId, userId);
    if (used.includes(normalized)) {
      throw Object.assign(new Error('Cette couleur est déjà utilisée dans l’établissement'), {
        code: 'COLOR_TAKEN',
      });
    }
    const result = await pool.query(
      `UPDATE user_establishment_memberships
       SET calendar_color = $3, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND establishment_id = $2 AND is_active = TRUE
       RETURNING user_id, establishment_id, role, is_active, calendar_color, created_at, updated_at`,
      [userId, establishmentId, normalized]
    );
    if (!result.rows[0]) {
      throw Object.assign(new Error('Membership not found'), { code: 'NOT_FOUND' });
    }
    return result.rows[0] as EstablishmentMembership;
  }

  static async remove(userId: number, establishmentId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM user_permissions WHERE user_id = $1 AND establishment_id = $2`,
        [userId, establishmentId]
      );
      const result = await client.query(
        `DELETE FROM user_establishment_memberships WHERE user_id = $1 AND establishment_id = $2`,
        [userId, establishmentId]
      );
      const remaining = await client.query(
        `SELECT establishment_id FROM user_establishment_memberships
         WHERE user_id = $1 AND is_active = TRUE
         ORDER BY updated_at DESC LIMIT 1`,
        [userId]
      );
      if (remaining.rows[0]) {
        await client.query(
          `UPDATE users SET establishment_id = $2, role = (
             SELECT role FROM user_establishment_memberships
             WHERE user_id = $1 AND establishment_id = $2
           ), updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND role <> 'system_admin'`,
          [userId, remaining.rows[0].establishment_id]
        );
      } else {
        await client.query(
          `UPDATE users SET establishment_id = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND role <> 'system_admin'`,
          [userId]
        );
      }
      await client.query('COMMIT');
      return (result.rowCount ?? 0) > 0;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async setActiveEstablishment(
    userId: number,
    establishmentId: string,
    role: MembershipRole
  ): Promise<void> {
    await pool.query(
      `UPDATE users
       SET establishment_id = $2, role = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND role <> 'system_admin'`,
      [userId, establishmentId, role]
    );
  }

  static async listUsersForEstablishment(
    establishmentId: string,
    options: { includeInactive?: boolean } = {}
  ): Promise<
    Array<{
      id: number;
      email: string;
      is_admin: boolean;
      role: string;
      establishment_id: string;
      first_name: string | null;
      last_name: string | null;
      calendar_color: string;
      phone: string | null;
      date_of_birth: string | null;
      is_active: boolean;
      created_at: Date;
    }>
  > {
    // Deactivated members are only listed for management screens: assigning service to someone
    // who no longer works here must stay impossible.
    const activeOnly = options.includeInactive === true ? '' : 'AND m.is_active = TRUE';
    const result = await pool.query(
      `SELECT u.id, u.email, u.is_admin, m.role, m.establishment_id,
              u.first_name, u.last_name, m.calendar_color, u.phone, u.date_of_birth,
              m.is_active, u.created_at
       FROM user_establishment_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.establishment_id = $1 ${activeOnly}
       ORDER BY m.is_active DESC, u.id`,
      [establishmentId]
    );
    return result.rows;
  }

  static availableColorsForUser(
    usedByOthers: string[],
    current: string | null | undefined
  ): string[] {
    return listAvailableCalendarColors(usedByOthers, current);
  }
}
