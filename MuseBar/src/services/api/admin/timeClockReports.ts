/**
 * Administration space API client — time clock reports: payroll summary,
 * labor compliance, CSV exports.
 */

import { getToken, request } from '../core';
import { apiConfig } from '../../../config/api';

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

export async function getPayrollSummary(from: string, to: string) {
  const qs = new URLSearchParams({ from, to });
  return request<PayrollSummaryDto>(`/admin/time-clock/payroll-summary?${qs}`);
}

export async function getTimeClockCompliance(from: string, to: string) {
  const qs = new URLSearchParams({ from, to });
  return request<{
    violations: LaborViolationDto[];
    reconciliation: ReconciliationRowDto[];
    settings: Record<string, unknown>;
  }>(`/admin/time-clock/compliance?${qs}`);
}

async function downloadTimeClockCsv(qs: URLSearchParams, fileName: string): Promise<void> {
  if (!apiConfig.isReady()) await apiConfig.initialize();
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
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAccountantExport(from: string, to: string): Promise<void> {
  const qs = new URLSearchParams({ from, to, format: 'accountant' });
  await downloadTimeClockCsv(qs, `paie-${from.slice(0, 10)}-${to.slice(0, 10)}.csv`);
}

export async function downloadTimeClockExport(from: string, to: string): Promise<void> {
  const qs = new URLSearchParams({ from, to });
  await downloadTimeClockCsv(qs, `pointage-${from.slice(0, 10)}-${to.slice(0, 10)}.csv`);
}
