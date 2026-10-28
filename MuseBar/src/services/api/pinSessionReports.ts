import { request } from './core';

export type PinSessionReportSnapshot = {
  informational: true;
  pin_session_id: string;
  staff_user_id: number;
  staff_display_name: string;
  period_start: string;
  period_end: string;
  session_closed: boolean;
  order_count: number;
  total_amount: number;
  payment_breakdown: Record<string, number>;
  vat_breakdown: {
    vat_10: { amount: number; vat: number; ttc: number };
    vat_20: { amount: number; vat: number; ttc: number };
  };
  order_ids: number[];
};

export type PinSessionDayRow = {
  id: string;
  user_id: number;
  display_name: string;
  opened_at: string;
  closed_at: string | null;
  close_reason: string | null;
};

export type PinSessionReportDto = {
  id: string;
  pin_session_id: string;
  generated_at: string;
  snapshot: PinSessionReportSnapshot;
};

export async function listPinSessionsByDay(date: string): Promise<{
  sessions: PinSessionDayRow[];
  period_start: string;
  period_end: string;
}> {
  const res = await request<{
    success: boolean;
    sessions: PinSessionDayRow[];
    period_start: string;
    period_end: string;
  }>(`/auth/pin/sessions/by-day?date=${encodeURIComponent(date)}`);
  return {
    sessions: res.sessions ?? [],
    period_start: res.period_start,
    period_end: res.period_end,
  };
}

export async function previewPinSessionReport(
  sessionId: string
): Promise<PinSessionReportSnapshot> {
  const res = await request<{ success: boolean; data: PinSessionReportSnapshot }>(
    `/auth/pin/sessions/${encodeURIComponent(sessionId)}/report-preview`
  );
  return res.data;
}

export async function generatePinSessionReport(
  sessionId: string
): Promise<PinSessionReportDto> {
  const res = await request<{ success: boolean; data: PinSessionReportDto }>(
    `/auth/pin/sessions/${encodeURIComponent(sessionId)}/reports`,
    { method: 'POST' }
  );
  return res.data;
}
