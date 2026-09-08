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

/** Closing a badge revokes its token server-side, ahead of the 8h expiry. */
export async function closePinSession(sessionId: string): Promise<void> {
  await request(`/auth/pin/sessions/${encodeURIComponent(sessionId)}/close`, { method: 'POST' });
}
