/**
 * Conversation aggregation for Boîte mail (one row per reservation thread).
 */

import { pool } from '../db/pool';

export type InboxConversationRow = {
  conversation_key: string;
  reservation_id: number | null;
  latest_message_id: number;
  last_activity_at: string;
  message_count: number;
  unread_count: number;
  latest_subject: string;
  latest_snippet: string | null;
  latest_direction: 'inbound' | 'outbound';
  counterpart_name: string | null;
  counterpart_email: string | null;
  reservation_status: string | null;
  reservation_starts_at: string | null;
  reservation_party_size: number | null;
};

function extractEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = String(raw).match(/[\w.+-]+@[\w.-]+\.\w+/);
  return match?.[0] ?? null;
}

export async function listInboxConversations(
  establishmentId: string,
  opts: { archived?: boolean; limit?: number; offset?: number } = {}
): Promise<{ conversations: InboxConversationRow[]; total: number }> {
  const archived = opts.archived === true;
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const result = await pool.query(
    `WITH msgs AS (
       SELECT
         im.*,
         CASE
           WHEN im.reservation_id IS NOT NULL THEN 'r:' || im.reservation_id::text
           ELSE 'm:' || im.id::text
         END AS conversation_key
       FROM inbox_messages im
       WHERE im.establishment_id = $1
     ),
     agg AS (
       SELECT
         conversation_key,
         MAX(reservation_id) AS reservation_id,
         MAX(received_at) AS last_activity_at,
         COUNT(*)::int AS message_count,
         COUNT(*) FILTER (
           WHERE direction = 'inbound' AND NOT is_read
         )::int AS unread_count,
         bool_and(is_archived) AS all_archived,
         (ARRAY_AGG(id ORDER BY received_at DESC, id DESC))[1] AS latest_message_id,
         (ARRAY_AGG(subject ORDER BY received_at DESC, id DESC))[1] AS latest_subject,
         (ARRAY_AGG(text_body ORDER BY received_at DESC, id DESC))[1] AS latest_snippet,
         (ARRAY_AGG(direction ORDER BY received_at DESC, id DESC))[1] AS latest_direction,
         (ARRAY_AGG(from_address ORDER BY received_at ASC, id ASC)
           FILTER (WHERE direction = 'inbound'))[1] AS first_inbound_from,
         (ARRAY_AGG(to_address ORDER BY received_at DESC, id DESC)
           FILTER (WHERE direction = 'outbound'))[1] AS latest_outbound_to
       FROM msgs
       GROUP BY conversation_key
     )
     SELECT
       a.conversation_key,
       a.reservation_id,
       a.latest_message_id,
       a.last_activity_at,
       a.message_count,
       a.unread_count,
       a.latest_subject,
       a.latest_snippet,
       a.latest_direction,
       a.first_inbound_from,
       a.latest_outbound_to,
       a.all_archived,
       r.customer_name,
       r.customer_email,
       r.status AS reservation_status,
       r.starts_at AS reservation_starts_at,
       r.party_size AS reservation_party_size,
       COUNT(*) OVER()::int AS total_count
     FROM agg a
     LEFT JOIN reservations r
       ON r.id = a.reservation_id AND r.establishment_id = $1
     WHERE a.all_archived = $2
     ORDER BY a.last_activity_at DESC, a.latest_message_id DESC
     LIMIT $3 OFFSET $4`,
    [establishmentId, archived, limit, offset]
  );

  const total = result.rows[0]?.total_count ?? 0;
  const conversations: InboxConversationRow[] = result.rows.map((row) => {
    const counterpartEmail =
      (row.customer_email as string | null) ||
      extractEmail(row.first_inbound_from as string | null) ||
      extractEmail(row.latest_outbound_to as string | null);
    const counterpartName = (row.customer_name as string | null) || null;
    return {
      conversation_key: row.conversation_key as string,
      reservation_id: row.reservation_id != null ? Number(row.reservation_id) : null,
      latest_message_id: Number(row.latest_message_id),
      last_activity_at: String(row.last_activity_at),
      message_count: Number(row.message_count),
      unread_count: Number(row.unread_count),
      latest_subject: String(row.latest_subject || '(sans objet)'),
      latest_snippet: row.latest_snippet != null ? String(row.latest_snippet) : null,
      latest_direction: row.latest_direction === 'outbound' ? 'outbound' : 'inbound',
      counterpart_name: counterpartName,
      counterpart_email: counterpartEmail,
      reservation_status: row.reservation_status != null ? String(row.reservation_status) : null,
      reservation_starts_at:
        row.reservation_starts_at != null ? String(row.reservation_starts_at) : null,
      reservation_party_size:
        row.reservation_party_size != null ? Number(row.reservation_party_size) : null,
    };
  });

  return { conversations, total };
}
