/**
 * Administration space API client — staff leaves (congés) and balances.
 */

import { request } from '../core';

export type LeaveType =
  | 'paid_leave'
  | 'rtt'
  | 'sick_leave'
  | 'unpaid_leave'
  | 'family_event'
  | 'other';

export interface StaffLeaveDto {
  id: number;
  user_id: number;
  leave_type: LeaveType;
  starts_on: string;
  ends_on: string;
  half_day_start: boolean;
  half_day_end: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  note: string | null;
  review_note: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string;
}

export interface LeaveBalanceDto {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  year: number;
  paid_leave_days: number;
  rtt_days: number;
  used_paid_leave: number;
  used_rtt: number;
  remaining_paid_leave: number;
  remaining_rtt: number;
}

export interface LeaveCountPreviewDto {
  counted_days: number;
  count_from: string;
  count_through: string;
  return_on: string;
  mode: string;
  excluded_public_holidays: Array<{ date: string; name: string }>;
}

export async function listLeaves(from: string, to: string, status?: string) {
  const qs = new URLSearchParams({ from, to });
  if (status) qs.set('status', status);
  return request<{ leaves: StaffLeaveDto[] }>(`/admin/leaves?${qs}`);
}

export async function createLeave(payload: {
  user_id: number;
  leave_type: LeaveType;
  starts_on: string;
  ends_on: string;
  half_day_start?: boolean;
  half_day_end?: boolean;
  note?: string;
  auto_approve?: boolean;
}) {
  return request<{ leave: StaffLeaveDto }>('/admin/leaves', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLeaveStatus(
  id: number,
  payload: { status: 'approved' | 'rejected' | 'cancelled'; review_note?: string }
) {
  return request<{ leave: StaffLeaveDto }>(`/admin/leaves/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getLeaveBalances(year: number) {
  return request<{ year: number; balances: LeaveBalanceDto[] }>(
    `/admin/leaves/balances?year=${year}`
  );
}

export async function previewLeaveCount(params: {
  starts_on: string;
  ends_on: string;
  half_day_start?: boolean;
  half_day_end?: boolean;
}) {
  const qs = new URLSearchParams({
    starts_on: params.starts_on,
    ends_on: params.ends_on,
  });
  if (params.half_day_start) qs.set('half_day_start', 'true');
  if (params.half_day_end) qs.set('half_day_end', 'true');
  return request<LeaveCountPreviewDto>(`/admin/leaves/preview-count?${qs}`);
}
