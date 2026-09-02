/**
 * Lightweight API client for the establishment Administration space.
 */

import { getToken, request } from './core';
import { apiConfig } from '../../config/api';

export async function listDocuments(params?: { category?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.q) qs.set('q', params.q);
  const suffix = qs.toString() ? `?${qs}` : '';
  return request<{
    documents: AdminDocumentDto[];
    storageConfigured: boolean;
  }>(`/admin/documents${suffix}`);
}

export async function getDocumentCategories() {
  return request<{ categories: Array<{ id: string; label: string }> }>(
    '/admin/documents/categories'
  );
}

export async function uploadDocument(form: FormData) {
  if (!apiConfig.isReady()) await apiConfig.initialize();
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiConfig.getEndpoint('/api/admin/documents'), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Upload failed (${res.status})`);
  }
  return res.json() as Promise<{ document: AdminDocumentDto }>;
}

export async function updateDocument(
  id: number,
  patch: Partial<{ title: string; category: string; tags: string[]; expires_at: string | null }>
) {
  return request<{ document: AdminDocumentDto }>(`/admin/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteDocument(id: number) {
  return request<{ success: boolean }>(`/admin/documents/${id}`, { method: 'DELETE' });
}

export async function getDocumentDownloadUrl(id: number) {
  return request<{ url: string; file_name: string }>(`/admin/documents/${id}/download-url`);
}

export async function listInbox(params?: { archived?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.archived) qs.set('archived', 'true');
  const suffix = qs.toString() ? `?${qs}` : '';
  return request<{
    messages: InboxMessageDto[];
    total: number;
    inbox_address: string | null;
    autoforward: boolean;
  }>(`/admin/inbox${suffix}`);
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

export async function listReservations(params?: { from?: string; to?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  return request<{ reservations: ReservationDto[] }>(`/admin/reservations${suffix}`);
}

export async function createReservation(payload: Partial<ReservationDto> & {
  customer_name: string;
  starts_at: string;
  party_size: number;
}) {
  return request<{ reservation: ReservationDto }>('/admin/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateReservation(id: number, payload: Partial<ReservationDto>) {
  return request<{ reservation: ReservationDto }>(`/admin/reservations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteReservation(id: number) {
  return request(`/admin/reservations/${id}`, { method: 'DELETE' });
}

export async function getReservationsIcs() {
  return request<{ token: string; url: string }>('/admin/reservations/ics/token');
}

export async function getReservationsPublicLink() {
  return request<{
    slug: string | null;
    url: string | null;
    opening_hours_configured: boolean;
    establishment_name: string | null;
  }>('/admin/reservations/public-link');
}

export async function getReservationClosedDates() {
  return request<{ dates: string[] }>('/admin/reservations/closed-dates');
}

export async function setReservationDayClosed(date: string, closed: boolean) {
  return request<{ dates: string[] }>(`/admin/reservations/closed-dates/${date}`, {
    method: 'PUT',
    body: JSON.stringify({ closed }),
  });
}

export async function listPlanningStaff() {
  return request<{
    staff: Array<{ id: number; email: string; first_name: string | null; last_name: string | null; role: string }>;
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

export async function updateShift(id: number, payload: Partial<StaffShiftDto>) {
  return request<{ shift: StaffShiftDto }>(`/admin/planning/shifts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteShift(id: number) {
  return request(`/admin/planning/shifts/${id}`, { method: 'DELETE' });
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

// --- Time clock (pointage) ---

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

export interface LaborViolationDto {
  code: string;
  severity: 'info' | 'warning' | 'error';
  user_id: number;
  message: string;
  at?: string;
  details?: Record<string, unknown>;
}

export interface ReconciliationRowDto {
  user_id: number;
  day: string;
  planned_minutes: number;
  actual_minutes: number;
  delta_minutes: number;
}

export async function getPayrollSummary(from: string, to: string) {
  const qs = new URLSearchParams({ from, to });
  return request<PayrollSummaryDto>(`/admin/time-clock/payroll-summary?${qs}`);
}

export interface PayrollLeaveLineDto {
  leave_id: number;
  leave_type: string;
  requested_from: string;
  requested_to: string;
  counted_days: number;
  count_from: string;
  count_through: string;
  return_on: string;
}

export interface PayrollEmployeeRowDto {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  total_minutes: number;
  hours_decimal: number;
  hours_formatted: string;
  meals: number;
  paid_leave_days: number;
  rtt_days: number;
  other_leave_days: number;
  entry_count: number;
  leave_lines: PayrollLeaveLineDto[];
}

export interface PayrollSummaryDto {
  from: string;
  to: string;
  payroll_settings: Record<string, unknown>;
  employees: PayrollEmployeeRowDto[];
  notes: string[];
}

export async function downloadAccountantExport(from: string, to: string): Promise<void> {
  if (!apiConfig.isReady()) await apiConfig.initialize();
  const qs = new URLSearchParams({ from, to, format: 'accountant' });
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiConfig.getEndpoint(`/api/admin/time-clock/export?${qs}`), {
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paie-${from.slice(0, 10)}-${to.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function getTimeClockCompliance(from: string, to: string) {
  const qs = new URLSearchParams({ from, to });
  return request<{
    violations: LaborViolationDto[];
    reconciliation: ReconciliationRowDto[];
    settings: Record<string, unknown>;
  }>(`/admin/time-clock/compliance?${qs}`);
}

export async function downloadTimeClockExport(from: string, to: string): Promise<void> {
  if (!apiConfig.isReady()) await apiConfig.initialize();
  const qs = new URLSearchParams({ from, to });
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiConfig.getEndpoint(`/api/admin/time-clock/export?${qs}`), {
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pointage-${from.slice(0, 10)}-${to.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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

export interface LeaveCountPreviewDto {
  counted_days: number;
  count_from: string;
  count_through: string;
  return_on: string;
  mode: string;
  excluded_public_holidays: Array<{ date: string; name: string }>;
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

export interface AdminDocumentDto {
  id: number;
  title: string;
  category: string;
  tags: string[];
  file_name: string;
  mime_type: string;
  size_bytes: number;
  expires_at: string | null;
  source: string;
  created_at: string;
}

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

export interface GuestReliabilityDto {
  flagged: boolean;
  flag_count: number;
  first_flagged_at: string | null;
  last_flagged_at: string | null;
  matched_on: Array<'email' | 'phone'>;
}

export interface ReservationDto {
  id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  party_size: number;
  starts_at: string;
  ends_at: string | null;
  status: string;
  status_reason?: string | null;
  notes: string | null;
  source: string;
  inbox_message_id: number | null;
  guest_reliability?: GuestReliabilityDto | null;
}

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
