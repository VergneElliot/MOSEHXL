/**
 * Administration space API client — staff planning (shifts, series, ICS).
 */

import { request } from '../core';

export interface StaffShiftDto {
  id: number;
  user_id: number;
  starts_at: string;
  ends_at: string;
  label: string | null;
  note: string | null;
  series_id?: string | null;
  recurrence?: string;
  approval_status?: string;
}

export async function listPlanningStaff() {
  return request<{
    staff: Array<{
      id: number;
      email: string;
      first_name: string | null;
      last_name: string | null;
      role: string;
      calendar_color?: string;
    }>;
  }>('/admin/planning/staff');
}

export async function listShifts(from: string, to: string) {
  const qs = new URLSearchParams({ from, to });
  return request<{ shifts: StaffShiftDto[] }>(`/admin/planning/shifts?${qs}`);
}

export async function createShift(payload: {
  user_id: number;
  starts_at: string;
  ends_at: string;
  label?: string;
  note?: string;
  recurrence?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}) {
  return request<{
    shift: StaffShiftDto;
    shifts: StaffShiftDto[];
    created_count: number;
    series_id: string | null;
    confirmation_pending: boolean;
  }>('/admin/planning/shifts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateShift(
  id: number,
  payload: Partial<StaffShiftDto> & { apply_to?: 'one' | 'series' }
) {
  return request<{
    shift: StaffShiftDto;
    updated_count?: number;
    apply_to?: 'one' | 'series';
    series_id?: string;
  }>(`/admin/planning/shifts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteShift(id: number, applyTo: 'one' | 'series' = 'one') {
  const qs = applyTo === 'series' ? '?apply_to=series' : '';
  return request<{
    success: boolean;
    deleted?: number;
    apply_to?: 'one' | 'series';
    series_id?: string;
  }>(`/admin/planning/shifts/${id}${qs}`, { method: 'DELETE' });
}

export async function commitPlanningShifts(payload: {
  creates?: Array<{
    user_id: number;
    starts_at: string;
    ends_at: string;
    label?: string;
    note?: string;
    recurrence?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  }>;
  updates?: Array<{
    id: number;
    apply_to?: 'one' | 'series';
    user_id?: number;
    starts_at?: string;
    ends_at?: string;
    label?: string | null;
    note?: string | null;
  }>;
  deletes?: Array<{ id: number; apply_to?: 'one' | 'series' }>;
}) {
  return request<{
    success: boolean;
    created_count: number;
    updated_count: number;
    deleted_count: number;
    emails_queued: number;
    message?: string;
  }>('/admin/planning/shifts/commit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resetAllShifts() {
  return request<{ success: boolean; deleted: number }>('/admin/planning/shifts/reset', {
    method: 'POST',
    body: JSON.stringify({ confirm: true }),
  });
}

export async function duplicatePlanningWeek(payload: {
  source_from: string;
  source_to: string;
  target_from: string;
}) {
  return request<{ created: number }>('/admin/planning/shifts/duplicate-week', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getStaffIcs(userId: number) {
  return request<{ token: string; url: string }>(`/admin/planning/ics/token/${userId}`);
}
