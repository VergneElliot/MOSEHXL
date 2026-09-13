/**
 * Admin Boîte mail list API (kept out of adminSpace.ts — baselined).
 */

import { request } from './core';
import type { InboxMessageDto } from './adminSpace';

export type ListInboxResult = {
  messages: InboxMessageDto[];
  total: number;
  inbox_address: string | null;
  autoforward: boolean;
  owner_email?: string | null;
  contact_email?: string | null;
};

export async function listInbox(params?: { archived?: boolean }): Promise<ListInboxResult> {
  const qs = new URLSearchParams();
  if (params?.archived) qs.set('archived', 'true');
  const suffix = qs.toString() ? `?${qs}` : '';
  return request<ListInboxResult>(`/admin/inbox${suffix}`);
}
