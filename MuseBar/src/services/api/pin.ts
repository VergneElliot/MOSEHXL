import { request } from './core';

/** PIN credentials and badge sessions. Floor/POS calls live in `floor.ts`. */

export interface PinVerifyResult {
  user_id: number;
  email: string;
  role: string;
  display_name: string;
  permissions: string[];
  pin_actor_token: string;
  /** Server-side badge session; null when the session record could not be opened. */
  pin_session_id?: string | null;
}

export async function verifyPin(pin: string): Promise<PinVerifyResult> {
  return request<PinVerifyResult>('/auth/pin/verify', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export async function setPin(
  pin: string,
  userId?: number
): Promise<{ success: boolean; user_id: number }> {
  return request('/auth/pin/set', {
    method: 'POST',
    body: JSON.stringify({ pin, ...(userId != null ? { user_id: userId } : {}) }),
  });
}

export async function clearPin(userId: number): Promise<{ success: boolean; user_id: number }> {
  return request(`/auth/pin/${userId}`, { method: 'DELETE' });
}

export async function getPinStatus(userId: number): Promise<{
  user_id: number;
  has_pin: boolean;
  pin_kind?: 'basic' | 'elevated';
  min_length?: number;
  max_length?: number;
}> {
  return request(`/auth/pin/status/${userId}`);
}

/** A badge currently open somewhere in the establishment. */
export interface ActivePinSessionDto {
  id: string;
  user_id: number;
  display_name: string;
  email: string;
  opened_by_user_id: number;
  opened_by_email: string;
  opened_at: string;
  last_seen_at: string;
  expires_at: string;
}

export async function listActivePinSessions(): Promise<ActivePinSessionDto[]> {
  const response = await request<{ success: boolean; data: ActivePinSessionDto[] }>(
    '/auth/pin/sessions'
  );
  return response.data ?? [];
}

export interface PinPortalOwnedTableDto {
  dining_table_id: number;
  label: string;
  open_ticket_id: number;
}

export interface PinPortalCardDto {
  user_id: number;
  display_name: string;
  email: string;
  badge: 'open' | 'closed';
  session_id: string | null;
  opened_at: string | null;
  last_seen_at: string | null;
  pointage: 'open' | 'closed';
  clock_in_at: string | null;
  owned_tables: PinPortalOwnedTableDto[];
  owned_table_count: number;
}

export interface PinPortalDto {
  on_venue_network: boolean;
  client_ip: string | null;
  cards: PinPortalCardDto[];
}

export async function getPinPortal(): Promise<PinPortalDto> {
  const response = await request<{ success: boolean; data: PinPortalDto }>(
    '/auth/pin/sessions/portal'
  );
  return (
    response.data ?? {
      on_venue_network: false,
      client_ip: null,
      cards: [],
    }
  );
}

export async function listOwnedTablesForSession(
  sessionId: string
): Promise<PinPortalOwnedTableDto[]> {
  const response = await request<{ success: boolean; data: PinPortalOwnedTableDto[] }>(
    `/auth/pin/sessions/${encodeURIComponent(sessionId)}/owned-tables`
  );
  return response.data ?? [];
}

export type PointageCloseReason =
  | 'ok'
  | 'off_network'
  | 'no_open_entry'
  | 'error'
  | 'blocked_tables';

export interface PointageCloseDto {
  recorded: boolean;
  reason: PointageCloseReason;
  time_entry_id?: number;
  clock_out_at?: string;
  client_ip: string | null;
  on_venue: boolean;
}

export interface ClosePinSessionResult {
  success: boolean;
  session_id: string;
  close_reason: string;
  already_closed?: boolean;
  closed?: boolean;
  pointage: PointageCloseDto;
}

/** Closing a badge revokes its token server-side; pointage may or may not record. */
export async function closePinSession(
  sessionId: string,
  pinActorToken?: string
): Promise<ClosePinSessionResult> {
  return request<ClosePinSessionResult>(
    `/auth/pin/sessions/${encodeURIComponent(sessionId)}/close`,
    {
      method: 'POST',
      headers: pinActorToken ? { 'x-pin-actor-token': pinActorToken } : undefined,
    }
  );
}
