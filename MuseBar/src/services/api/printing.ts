import { apiConfig } from '../../config/api';
import { getToken } from './core';

async function downloadAuthenticatedFile(endpoint: string, fallbackFilename: string): Promise<void> {
  if (!apiConfig.isReady()) {
    await apiConfig.initialize();
  }

  const url = apiConfig.getEndpoint(`/api${endpoint}`);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  if (!res.ok) {
    let message = `HTTP error! status: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = String(body.message);
      else if (body?.error) message = String(body.error);
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/i);
  const filename = match?.[1] ?? fallbackFilename;
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(objectUrl);
}

export async function exportReceiptPdf(orderId: number, type: 'detailed' | 'summary' = 'detailed'): Promise<void> {
  await downloadAuthenticatedFile(`/printing/receipt/${orderId}/export-pdf?type=${type}`, `ticket-${orderId}.pdf`);
}

export async function exportInvoicePdf(invoiceId: number): Promise<void> {
  await downloadAuthenticatedFile(`/printing/invoice/${invoiceId}/export-pdf`, `invoice-${invoiceId}.pdf`);
}

export async function exportClosureBulletinPdf(bulletinId: number): Promise<void> {
  await downloadAuthenticatedFile(`/printing/closure/${bulletinId}/export-pdf`, `closure-bulletin-${bulletinId}.pdf`);
}

export async function exportClosureBulletinXlsx(bulletinId: number): Promise<void> {
  await downloadAuthenticatedFile(`/printing/closure/${bulletinId}/export-xlsx`, `closure-recap-${bulletinId}.xlsx`);
}

export async function emailReceipt(
  orderId: number,
  to: string,
  type: 'detailed' | 'summary' = 'detailed'
): Promise<{ trackingId: string; message: string }> {
  const { request } = await import('./core');
  return request<{ success: boolean; trackingId: string; message: string }>(
    `/printing/receipt/${orderId}/email?type=${type}`,
    { method: 'POST', body: JSON.stringify({ to }) }
  );
}

export async function emailInvoice(
  invoiceId: number,
  to: string
): Promise<{ trackingId: string; message: string }> {
  const { request } = await import('./core');
  return request<{ success: boolean; trackingId: string; message: string }>(
    `/printing/invoice/${invoiceId}/email`,
    { method: 'POST', body: JSON.stringify({ to }) }
  );
}

export async function emailClosureBulletin(
  bulletinId: number,
  to: string
): Promise<{ trackingId: string; message: string; attachments: string[] }> {
  const { request } = await import('./core');
  return request<{ success: boolean; trackingId: string; message: string; attachments: string[] }>(
    `/printing/closure/${bulletinId}/email`,
    { method: 'POST', body: JSON.stringify({ to }) }
  );
}
