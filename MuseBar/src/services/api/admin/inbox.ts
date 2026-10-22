/**
 * Administration space API client — inbox messages and attachments.
 */

import { request } from '../core';
import type { AdminDocumentDto } from './documents';
import type { ReservationDto } from './reservations';

export interface InboxMessageDto {
  id: number;
  from_address: string;
  to_address: string;
  subject: string;
  text_body: string | null;
  html_body: string | null;
  received_at: string;
  is_read: boolean;
  is_archived: boolean;
}

export interface InboxAttachmentDto {
  id: number;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  imported_document_id: number | null;
}

export async function getInboxMessage(id: number) {
  return request<{
    message: InboxMessageDto & { attachments: InboxAttachmentDto[] };
    reservation: ReservationDto | null;
  }>(`/admin/inbox/${id}`);
}

export async function archiveInboxMessage(id: number, archived = true) {
  return request(`/admin/inbox/${id}/archive`, {
    method: 'POST',
    body: JSON.stringify({ archived }),
  });
}

export async function replyInboxMessage(id: number, body: string) {
  return request(`/admin/inbox/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function importInboxAttachment(
  attachmentId: number,
  payload: { title?: string; category?: string; expires_at?: string | null }
) {
  return request<{ document: AdminDocumentDto }>(
    `/admin/inbox/attachments/${attachmentId}/import`,
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

export async function updateInboxSettings(autoforward: boolean) {
  return request(`/admin/inbox/settings`, {
    method: 'PUT',
    body: JSON.stringify({ autoforward }),
  });
}
