/**
 * Admin Boîte mail list/detail API (kept out of adminSpace.ts — baselined).
 */

import { request } from './core';
import type {
  InboxAttachmentDto,
  InboxMessageDto as BaseInboxMessageDto,
  ReservationDto,
} from './adminSpace';

export type InboxMessageDto = BaseInboxMessageDto & {
  reservation_id?: number | null;
  direction?: 'inbound' | 'outbound';
};

export interface InboxConversationDto {
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
}

export type ListInboxResult = {
  conversations: InboxConversationDto[];
  total: number;
  inbox_address: string | null;
  autoforward: boolean;
  owner_email?: string | null;
  contact_email?: string | null;
};

export type GuestEmailDelivery = {
  sent: boolean;
  to: string | null;
  error?: string;
};

export async function listInbox(params?: { archived?: boolean }): Promise<ListInboxResult> {
  const qs = new URLSearchParams();
  if (params?.archived) qs.set('archived', 'true');
  const suffix = qs.toString() ? `?${qs}` : '';
  return request<ListInboxResult>(`/admin/inbox${suffix}`);
}

export async function getInboxMessage(id: number) {
  return request<{
    message: InboxMessageDto & { attachments: InboxAttachmentDto[] };
    thread: InboxMessageDto[];
    reservation: ReservationDto | null;
  }>(`/admin/inbox/${id}`);
}

export async function replyInboxMessage(id: number, body: string) {
  return request<{ success: boolean; to: string; from: string; reply_to: string }>(
    `/admin/inbox/${id}/reply`,
    {
      method: 'POST',
      body: JSON.stringify({ body }),
    }
  );
}

export async function patchReservationStatus(
  id: number,
  payload: { status: string; status_reason?: string | null }
) {
  return request<{
    reservation: ReservationDto;
    guest_email_delivery?: GuestEmailDelivery | null;
  }>(`/admin/reservations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function resolveInboxByReservation(reservationId: number) {
  return request<{
    message_id: number;
    is_archived: boolean;
    reservation_id: number;
  }>(`/admin/inbox/by-reservation/${reservationId}`);
}
