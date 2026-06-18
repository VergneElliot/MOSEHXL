import { request } from './core';
import type { ClosureBulletin, LiveMonthlyStats } from '../../types/api';

export async function getBusinessInfo() {
  return request<{ name?: string; address?: string; phone?: string; email?: string; siret?: string; tax_identification?: string }>('/legal/business-info');
}

export async function updateBusinessInfo(data: Record<string, unknown>) {
  return request('/legal/business-info', { method: 'PUT', body: JSON.stringify(data) });
}

export async function getLatestMonthlyClosureBulletin() {
  return request<ClosureBulletin>('/legal/closure/monthly-latest');
}

export async function getLiveMonthlyStats() {
  return request<LiveMonthlyStats>('/legal/stats/monthly-live');
}

/** Live business-day stats for the History tab (closure-aligned totals). */
export interface BusinessDayStatsResponse {
  stats: {
    total_ttc: number;
    total_sales: number;
    top_products: Array<{ name: string; qty: number }>;
    card_total: number;
    cash_total: number;
  };
  business_day_period: { start: string; end: string; closure_time: string; timezone: string } | null;
}

export async function getBusinessDayStats() {
  return request<BusinessDayStatsResponse>('/legal/business-day-stats');
}


