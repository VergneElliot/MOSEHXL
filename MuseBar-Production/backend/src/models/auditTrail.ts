import { pool } from '../app';

export interface AuditEntry {
  id: number;
  user_id?: string;
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  action_details?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  timestamp: Date;
}

export class AuditTrailModel {
  static async logAction({
    user_id,
    action_type,
    resource_type,
    resource_id,
    action_details,
    ip_address,
    user_agent,
    session_id
  }: Partial<AuditEntry>): Promise<AuditEntry> {
    const query = `
      INSERT INTO audit_trail (
        user_id, action_type, resource_type, resource_id, 
        action_details, ip_address, user_agent, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
      session_id || null
    ];
    console.log('[AUDIT LOG] Attempting to log action:', { values });
    try {
      const result = await pool.query(query, values);
      console.log('[AUDIT LOG] Success:', result.rows[0]);
      return result.rows[0];
    } catch (err) {
      console.error('[AUDIT LOG] Error logging action:', err);
      throw err;
    }
  }
} 