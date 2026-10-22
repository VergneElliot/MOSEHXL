/**
 * Administration space API client — time clock (pointage) entries and network.
 */

import { request } from '../core';

export interface TimeEntryDto {
  id: number;
  establishment_id: string;
  user_id: number;
  clock_in_at: string;
  clock_out_at: string | null;
  clock_in_ip: string | null;
  clock_out_ip: string | null;
  source: string;
  note: string | null;
  adjusted_by: number | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string;
}

export interface TimeClockStatusDto {
  open_entry: TimeEntryDto | null;
  on_venue_network: boolean;
  client_ip: string | null;
  allowed_ips_configured: boolean;
}

export interface TimeClockStaffDto {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  open_entry: TimeEntryDto | null;
}

export interface TimeHoursTotalDto {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  total_ms: number;
  entry_count: number;
}

export async function getTimeClockStatus() {
  return request<TimeClockStatusDto>('/admin/time-clock/status');
}

export async function clockIn() {
  return request<{ entry: TimeEntryDto }>('/admin/time-clock/clock-in', { method: 'POST' });
}

export async function clockOut() {
  return request<{ entry: TimeEntryDto }>('/admin/time-clock/clock-out', { method: 'POST' });
}

export async function listTimeClockStaff() {
  return request<{ staff: TimeClockStaffDto[] }>('/admin/time-clock/staff');
}

export async function punchTimeClock(userId: number, password: string) {
  return request<{
    action: 'clock_in' | 'clock_out';
    entry: TimeEntryDto;
    leave_warning?: string;
  }>(
    '/admin/time-clock/punch',
    {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, password }),
    }
  );
}

export async function listTimeEntries(from: string, to: string, userId?: number) {
  const qs = new URLSearchParams({ from, to });
  if (userId != null) qs.set('user_id', String(userId));
  return request<{ entries: TimeEntryDto[]; totals: TimeHoursTotalDto[] }>(
    `/admin/time-clock/entries?${qs}`
  );
}

export async function updateTimeEntry(
  id: number,
  payload: { clock_in_at?: string; clock_out_at?: string | null; note?: string }
) {
  return request<{ entry: TimeEntryDto }>(`/admin/time-clock/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteTimeEntry(id: number) {
  return request(`/admin/time-clock/entries/${id}`, { method: 'DELETE' });
}

export async function getTimeClockNetwork() {
  return request<{ allowed_ips: string[]; client_ip: string | null }>(
    '/admin/time-clock/network'
  );
}

export async function updateTimeClockNetwork(payload: {
  allowed_ips?: string[];
  capture_current?: boolean;
}) {
  return request<{ allowed_ips: string[]; client_ip: string | null }>(
    '/admin/time-clock/network',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}
