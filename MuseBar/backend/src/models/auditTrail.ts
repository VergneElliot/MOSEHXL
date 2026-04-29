import { pool } from '../app';

export interface AuditEntry {
  id: number;
  establishment_id?: string | null;
  user_id?: string;
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  action_details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  timestamp: Date;
}

export class AuditTrailModel {
  static async logAction({
    establishment_id,
    user_id,
    action_type,
    resource_type,
    resource_id,
    action_details,
    ip_address,
    user_agent,
    session_id
  }: Partial<AuditEntry>): Promise<AuditEntry> {
    let est = establishment_id ?? null;
    if (est == null && user_id && /^[0-9]+$/.test(String(user_id))) {
      const uid = parseInt(String(user_id), 10);
      if (Number.isFinite(uid)) {
        const r = await pool.query('SELECT establishment_id FROM users WHERE id = $1', [uid]);
        const row = r.rows[0] as { establishment_id?: string } | undefined;
        est = row?.establishment_id ?? null;
      }
    }

    const query = `
      INSERT INTO audit_trail (
        user_id, action_type, resource_type, resource_id,
        action_details, ip_address, user_agent, session_id, establishment_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      user_id || null,
      action_type,
      resource_type || null,
      resource_id || null,
      action_details ? JSON.stringify(action_details) : null,
      ip_address || null,
      user_agent || null,
      session_id || null,
      est
    ];

    try {
      const result = await pool.query(query, values);
      
      return result.rows[0];
    } catch (err) {
      process.stderr.write(`[AUDIT LOG] Error logging action: ${err instanceof Error ? err.message : String(err)}\n`);
      throw err;
    }
  }

  static async getOrderAuditEntries(establishmentId: string, orderId: number): Promise<AuditEntry[]> {
    const query = `
      SELECT id, establishment_id, user_id, action_type, resource_type, resource_id,
             action_details, ip_address, user_agent, session_id, "timestamp"
      FROM audit_trail
      WHERE establishment_id = $1
        AND resource_type = 'ORDER'
        AND resource_id = $2
      ORDER BY "timestamp" ASC
    `;
    const values = [establishmentId, String(orderId)];
    const result = await pool.query(query, values);
    return result.rows as AuditEntry[];
  }
}