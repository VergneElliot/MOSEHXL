import { pool } from '../db/pool';
import { logError } from '../utils/logger';

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
  private static async resolveFallbackEstablishmentId(): Promise<string | null> {
    const result = await pool.query(
      `
        SELECT id
        FROM establishments
        ORDER BY created_at ASC NULLS LAST, id ASC
        LIMIT 1
      `
    );
    const row = result.rows[0] as { id?: string } | undefined;
    return row?.id ?? null;
  }

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
    if (est == null) {
      est = await this.resolveFallbackEstablishmentId();
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
      logError('[AUDIT LOG] Error logging action', err instanceof Error ? err : new Error(String(err)));
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

  static async getEstablishmentAuditTrail(
    establishmentId: string,
    opts: {
      user_id?: string;
      action_type?: string;
      resource_type?: string;
      start?: string;
      end?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ entries: AuditEntry[]; total: number }> {
    const conditions = ['establishment_id = $1'];
    const values: unknown[] = [establishmentId];

    if (opts.user_id) {
      values.push(opts.user_id);
      conditions.push(`user_id = $${values.length}`);
    }
    if (opts.action_type) {
      values.push(opts.action_type);
      conditions.push(`action_type = $${values.length}`);
    }
    if (opts.resource_type) {
      values.push(opts.resource_type);
      conditions.push(`resource_type = $${values.length}`);
    }
    if (opts.start) {
      values.push(opts.start);
      conditions.push(`"timestamp" >= $${values.length}::date`);
    }
    if (opts.end) {
      values.push(opts.end);
      conditions.push(`"timestamp" < ($${values.length}::date + interval '1 day')`);
    }

    const where = conditions.join(' AND ');
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM audit_trail WHERE ${where}`,
      values
    );
    const total = countResult.rows[0]?.total ?? 0;

    const limit = opts.limit != null && opts.limit > 0 ? opts.limit : 25;
    const offset = opts.offset != null && opts.offset >= 0 ? opts.offset : 0;
    const pageValues = [...values, limit, offset];

    const result = await pool.query(
      `SELECT id, establishment_id, user_id, action_type, resource_type, resource_id,
              action_details, ip_address, user_agent, session_id, "timestamp"
       FROM audit_trail
       WHERE ${where}
       ORDER BY "timestamp" DESC, id DESC
       LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
      pageValues
    );

    return { entries: result.rows as AuditEntry[], total };
  }
}