import { pool } from '../db/pool';

export interface InboxMessage {
  id: number;
  establishment_id: string;
  message_id: string | null;
  from_address: string;
  to_address: string;
  subject: string;
  text_body: string | null;
  html_body: string | null;
  received_at: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface InboxAttachment {
  id: number;
  establishment_id: string;
  message_id: number;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  imported_document_id: number | null;
  created_at: string;
}

export class InboxModel {
  static async list(
    establishmentId: string,
    opts: { archived?: boolean; limit?: number; offset?: number } = {}
  ): Promise<{ messages: InboxMessage[]; total: number }> {
    const archived = opts.archived === true;
    const limit = Math.min(opts.limit ?? 50, 200);
    const offset = opts.offset ?? 0;
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM inbox_messages
       WHERE establishment_id = $1 AND is_archived = $2`,
      [establishmentId, archived]
    );
    const result = await pool.query(
      `SELECT * FROM inbox_messages
       WHERE establishment_id = $1 AND is_archived = $2
       ORDER BY received_at DESC, id DESC
       LIMIT $3 OFFSET $4`,
      [establishmentId, archived, limit, offset]
    );
    return {
      messages: result.rows as InboxMessage[],
      total: count.rows[0]?.total ?? 0,
    };
  }

  static async getMessage(
    establishmentId: string,
    id: number
  ): Promise<(InboxMessage & { attachments: InboxAttachment[] }) | null> {
    const msg = await pool.query(
      `SELECT * FROM inbox_messages WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, id]
    );
    if (!msg.rows[0]) return null;
    const attachments = await pool.query(
      `SELECT * FROM inbox_attachments WHERE establishment_id = $1 AND message_id = $2 ORDER BY id`,
      [establishmentId, id]
    );
    return {
      ...(msg.rows[0] as InboxMessage),
      attachments: attachments.rows as InboxAttachment[],
    };
  }

  static async createMessage(input: {
    establishment_id: string;
    message_id?: string | null;
    from_address: string;
    to_address: string;
    subject: string;
    text_body?: string | null;
    html_body?: string | null;
  }): Promise<InboxMessage> {
    const result = await pool.query(
      `INSERT INTO inbox_messages (
         establishment_id, message_id, from_address, to_address, subject, text_body, html_body
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        input.establishment_id,
        input.message_id ?? null,
        input.from_address,
        input.to_address,
        input.subject || '(sans objet)',
        input.text_body ?? null,
        input.html_body ?? null,
      ]
    );
    return result.rows[0] as InboxMessage;
  }

  static async addAttachment(input: {
    establishment_id: string;
    message_id: number;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    storage_key: string;
  }): Promise<InboxAttachment> {
    const result = await pool.query(
      `INSERT INTO inbox_attachments (
         establishment_id, message_id, file_name, mime_type, size_bytes, storage_key
       ) VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        input.establishment_id,
        input.message_id,
        input.file_name,
        input.mime_type,
        input.size_bytes,
        input.storage_key,
      ]
    );
    return result.rows[0] as InboxAttachment;
  }

  static async markRead(establishmentId: string, id: number, isRead = true): Promise<boolean> {
    const result = await pool.query(
      `UPDATE inbox_messages SET is_read = $3 WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, id, isRead]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async setArchived(establishmentId: string, id: number, archived: boolean): Promise<boolean> {
    const result = await pool.query(
      `UPDATE inbox_messages SET is_archived = $3 WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, id, archived]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async getAttachment(
    establishmentId: string,
    attachmentId: number
  ): Promise<InboxAttachment | null> {
    const result = await pool.query(
      `SELECT * FROM inbox_attachments WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, attachmentId]
    );
    return (result.rows[0] as InboxAttachment) ?? null;
  }

  static async markAttachmentImported(
    establishmentId: string,
    attachmentId: number,
    documentId: number
  ): Promise<void> {
    await pool.query(
      `UPDATE inbox_attachments
       SET imported_document_id = $3
       WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, attachmentId, documentId]
    );
  }
}
