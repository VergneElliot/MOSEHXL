import { pool } from '../db/pool';

export type MembershipRole = 'establishment_admin' | 'staff';

export interface EstablishmentMembership {
  user_id: number;
  establishment_id: string;
  role: MembershipRole;
  is_active: boolean;
  establishment_name?: string;
  created_at?: string;
  updated_at?: string;
}

export class MembershipModel {
  static toApiList(memberships: EstablishmentMembership[]): Array<{
    establishment_id: string;
    name: string;
    role: MembershipRole;
  }> {
    return memberships.map((m) => ({
      establishment_id: m.establishment_id,
      name: m.establishment_name || '',
      role: m.role,
    }));
  }

  static async listForUser(userId: number): Promise<EstablishmentMembership[]> {
    const result = await pool.query(
      `SELECT m.user_id, m.establishment_id, m.role, m.is_active,
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
      `SELECT m.user_id, m.establishment_id, m.role, m.is_active,
              e.name AS establishment_name
       FROM user_establishment_memberships m
       JOIN establishments e ON e.id = m.establishment_id
       WHERE m.user_id = $1 AND m.establishment_id = $2 AND m.is_active = TRUE`,
      [userId, establishmentId]
    );
    return (result.rows[0] as EstablishmentMembership) ?? null;
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
  }): Promise<EstablishmentMembership> {
    const result = await pool.query(
      `INSERT INTO user_establishment_memberships (user_id, establishment_id, role, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, establishment_id) DO UPDATE
       SET role = EXCLUDED.role,
           is_active = EXCLUDED.is_active,
           updated_at = CURRENT_TIMESTAMP
       RETURNING user_id, establishment_id, role, is_active, created_at, updated_at`,
      [input.user_id, input.establishment_id, input.role, input.is_active !== false]
    );
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

  static async listUsersForEstablishment(establishmentId: string): Promise<
    Array<{
      id: number;
      email: string;
      is_admin: boolean;
      role: string;
      establishment_id: string;
      first_name: string | null;
      last_name: string | null;
      created_at: Date;
    }>
  > {
    const result = await pool.query(
      `SELECT u.id, u.email, u.is_admin, m.role, m.establishment_id,
              u.first_name, u.last_name, u.created_at
       FROM user_establishment_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.establishment_id = $1 AND m.is_active = TRUE
       ORDER BY u.id`,
      [establishmentId]
    );
    return result.rows;
  }
}
