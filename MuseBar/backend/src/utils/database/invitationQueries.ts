/**
 * Invitation-related shared queries
 */

import { PoolClient } from 'pg';
import { pool } from '../../db/pool';

export class InvitationQueries {

  /**
   * Get invitations by establishment
   */
  static async getInvitationsByEstablishment(
    client: PoolClient | typeof pool,
    establishmentId: string,
    options: {
      status?: string;
      limit?: number;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ) {
    const { status, limit, sortOrder = 'DESC' } = options;

    let query = `
      SELECT email, role, status, created_at, expires_at
      FROM user_invitations 
      WHERE establishment_id = $1
    `;

    const queryParams: Array<string | number> = [establishmentId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }

    query += ` ORDER BY created_at ${sortOrder}`;

    if (limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      queryParams.push(limit);
    }

    const result = await client.query(query, queryParams);
    return result.rows;
  }

  /**
   * Get pending, non-expired invitation by token (single source of truth).
   * Use this wherever you need to validate an invitation for setup/acceptance.
   * Query: invitation_token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP.
   * Returns the invitation row with establishment_id, establishment_name, establishment_email, establishment_status, or null.
   */
  static async getInvitationByToken(
    client: PoolClient | typeof pool,
    token: string
  ) {
    const result = await client.query(`
      SELECT ui.*,
             e.id AS establishment_id,
             e.name AS establishment_name,
             e.email AS establishment_email,
             e.status AS establishment_status
      FROM user_invitations ui
      LEFT JOIN establishments e ON ui.establishment_id = e.id
      WHERE ui.invitation_token = $1
        AND ui.status = 'pending'
        AND ui.expires_at > CURRENT_TIMESTAMP
    `, [token]);

    return result.rows[0] || null;
  }
}
