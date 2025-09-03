import { request } from './core';

export async function getBusinessInfo() {
  return request<{ name?: string; address?: string; phone?: string; email?: string; siret?: string; tax_identification?: string }>('/legal/business-info');
}

export async function updateBusinessInfo(data: Record<string, unknown>) {
  return request('/legal/business-info', { method: 'PUT', body: JSON.stringify(data) });
}

export async function getLatestMonthlyClosureBulletin() {
  return request('/legal/closure/monthly-latest');
}

export async function getLiveMonthlyStats() {
  return request('/legal/stats/monthly-live');
}



