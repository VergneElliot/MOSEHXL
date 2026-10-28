import { pool } from '../db/pool';
import type {
  NotificationAudience,
  NotificationSeverity,
  NotificationType,
} from '../services/notifications/notificationTypes';

export type NotificationRow = {
  id: number;
  establishment_id: string;
  type: string;
  severity: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  audience: string;
  permission_key: string | null;
  target_user_id: number | null;
  created_at: Date;
  expires_at: Date | null;
  is_read?: boolean;
};

export type EmitNotificationInput = {
  establishmentId: string;
  type: NotificationType | string;
  title: string;
  body?: string | null;
  payload?: Record<string, unknown>;
  severity?: NotificationSeverity;
  audience?: NotificationAudience;
  permissionKey?: string | null;
  targetUserId?: number | null;
  expiresAt?: Date | null;
  /** When set, skip insert if this establishment already emitted the key. */
  dedupeKey?: string | null;
};

export class NotificationModel {
  /**
   * Insert a notification. With `dedupeKey`, returns existing id if already emitted
   * (no duplicate row). Returns null when a concurrent emit won the race without a row.
   */
  static async emit(input: EmitNotificationInput): Promise<number | null> {
    const audience = input.audience ?? 'permission';
    const severity = input.severity ?? 'info';
    const payload = JSON.stringify(input.payload ?? {});

    if (input.dedupeKey) {
      const existing = await pool.query(
        `SELECT notification_id FROM notification_emissions
         WHERE establishment_id = $1 AND dedupe_key = $2`,
        [input.establishmentId, input.dedupeKey]
      );
      const prior = existing.rows[0] as { notification_id: number | null } | undefined;
      if (prior?.notification_id != null) return Number(prior.notification_id);
    }

    const inserted = await pool.query(
      `INSERT INTO notifications
         (establishment_id, type, severity, title, body, payload, audience, permission_key, target_user_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
       RETURNING id`,
      [
        input.establishmentId,
        input.type,
        severity,
        input.title,
        input.body ?? null,
        payload,
        audience,
        input.permissionKey ?? null,
        input.targetUserId ?? null,
        input.expiresAt ?? null,
      ]
    );
    const id = Number((inserted.rows[0] as { id: number }).id);

    if (input.dedupeKey) {
      await pool.query(
        `INSERT INTO notification_emissions (establishment_id, dedupe_key, notification_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (establishment_id, dedupe_key) DO NOTHING`,
        [input.establishmentId, input.dedupeKey, id]
      );
    }
    return id;
  }

  static async listForUser(input: {
    establishmentId: string;
    userId: number;
    permissions: string[];
    isEstablishmentAdmin: boolean;
    limit?: number;
  }): Promise<NotificationRow[]> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
    const result = await pool.query(
      `SELECT n.*,
              (r.notification_id IS NOT NULL) AS is_read
       FROM notifications n
       LEFT JOIN notification_reads r
         ON r.notification_id = n.id AND r.user_id = $2
       WHERE n.establishment_id = $1
         AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
         AND (
           n.audience = 'all_members'
           OR (n.audience = 'user' AND n.target_user_id = $2)
           OR (
             n.audience = 'permission'
             AND (
               $3::boolean
               OR n.permission_key IS NULL
               OR n.permission_key = ANY($4::text[])
             )
           )
         )
       ORDER BY n.created_at DESC
       LIMIT $5`,
      [
        input.establishmentId,
        input.userId,
        input.isEstablishmentAdmin,
        input.permissions,
        limit,
      ]
    );
    return result.rows.map(mapRow);
  }

  static async unreadCount(input: {
    establishmentId: string;
    userId: number;
    permissions: string[];
    isEstablishmentAdmin: boolean;
  }): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS c
       FROM notifications n
       LEFT JOIN notification_reads r
         ON r.notification_id = n.id AND r.user_id = $2
       WHERE n.establishment_id = $1
         AND r.notification_id IS NULL
         AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
         AND (
           n.audience = 'all_members'
           OR (n.audience = 'user' AND n.target_user_id = $2)
           OR (
             n.audience = 'permission'
             AND (
               $3::boolean
               OR n.permission_key IS NULL
               OR n.permission_key = ANY($4::text[])
             )
           )
         )`,
      [
        input.establishmentId,
        input.userId,
        input.isEstablishmentAdmin,
        input.permissions,
      ]
    );
    return Number((result.rows[0] as { c: number } | undefined)?.c ?? 0);
  }

  static async markRead(
    establishmentId: string,
    userId: number,
    notificationId: number
  ): Promise<boolean> {
    const owned = await pool.query(
      `SELECT id FROM notifications WHERE id = $1 AND establishment_id = $2`,
      [notificationId, establishmentId]
    );
    if (owned.rowCount === 0) return false;
    await pool.query(
      `INSERT INTO notification_reads (notification_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (notification_id, user_id) DO NOTHING`,
      [notificationId, userId]
    );
    return true;
  }

  static async markAllRead(input: {
    establishmentId: string;
    userId: number;
    permissions: string[];
    isEstablishmentAdmin: boolean;
  }): Promise<number> {
    const result = await pool.query(
      `INSERT INTO notification_reads (notification_id, user_id)
       SELECT n.id, $2
       FROM notifications n
       LEFT JOIN notification_reads r
         ON r.notification_id = n.id AND r.user_id = $2
       WHERE n.establishment_id = $1
         AND r.notification_id IS NULL
         AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
         AND (
           n.audience = 'all_members'
           OR (n.audience = 'user' AND n.target_user_id = $2)
           OR (
             n.audience = 'permission'
             AND (
               $3::boolean
               OR n.permission_key IS NULL
               OR n.permission_key = ANY($4::text[])
             )
           )
         )
       ON CONFLICT DO NOTHING`,
      [
        input.establishmentId,
        input.userId,
        input.isEstablishmentAdmin,
        input.permissions,
      ]
    );
    return result.rowCount ?? 0;
  }
}

function mapRow(row: Record<string, unknown>): NotificationRow {
  const payload =
    typeof row.payload === 'string'
      ? (JSON.parse(row.payload) as Record<string, unknown>)
      : ((row.payload as Record<string, unknown>) ?? {});
  return {
    id: Number(row.id),
    establishment_id: String(row.establishment_id),
    type: String(row.type),
    severity: String(row.severity),
    title: String(row.title),
    body: row.body == null ? null : String(row.body),
    payload,
    audience: String(row.audience),
    permission_key: row.permission_key == null ? null : String(row.permission_key),
    target_user_id: row.target_user_id == null ? null : Number(row.target_user_id),
    created_at: row.created_at as Date,
    expires_at: (row.expires_at as Date | null) ?? null,
    is_read: Boolean(row.is_read),
  };
}
