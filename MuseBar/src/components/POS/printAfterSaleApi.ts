import { apiCore, printingApi } from '../../services/api';
import {
  buildInvoiceCreateBody,
  type InvoiceFormState,
} from './printAfterSaleInvoice';
import { normalizeReceiptForPreview, type PreviewPayload } from './printAfterSalePreview';
import type { SplitPartOption } from './PrintAfterSaleSplitPicker';

export async function loadOrderSplitParts(orderId: number): Promise<SplitPartOption[]> {
  const order = await apiCore.request<{
    payment_method?: string;
    sub_bills?: Array<{ id: number; payment_method: string; amount: number | string }>;
  }>(`/orders/${orderId}`, { method: 'GET' });
  const parts =
    order.payment_method === 'split' && Array.isArray(order.sub_bills)
      ? order.sub_bills.map((b) => ({
          id: Number(b.id),
          payment_method: String(b.payment_method),
          amount: typeof b.amount === 'number' ? b.amount : parseFloat(String(b.amount)),
        }))
      : [];
  return parts.filter((p) => Number.isFinite(p.id) && p.id > 0);
}

export async function loadReceiptPreview(
  orderId: number,
  receiptType: string,
  selectedSubBillId: number | null
): Promise<PreviewPayload> {
  const qs = new URLSearchParams({ type: receiptType });
  if (selectedSubBillId != null) qs.set('sub_bill_id', String(selectedSubBillId));
  const data = await apiCore.request<{ receipt_data: unknown }>(
    `/printing/receipt/${orderId}/preview?${qs.toString()}`,
    { method: 'GET' }
  );
  const normalized = normalizeReceiptForPreview(data.receipt_data);
  if (!normalized) throw new Error('Invalid preview payload');
  return normalized;
}

export async function createInvoiceFromOrder(
  orderId: number,
  form: InvoiceFormState,
  invoiceMode: 'detailed' | 'summary',
  selectedSubBillId: number | null
): Promise<{ invoiceId: number; invoice: Record<string, unknown>; alreadyExists: boolean }> {
  const result = await apiCore.request<{ invoice: Record<string, unknown>; already_exists?: boolean }>(
    `/legal/invoices/from-order/${orderId}`,
    {
      method: 'POST',
      body: JSON.stringify(buildInvoiceCreateBody(form, invoiceMode, selectedSubBillId)),
    }
  );
  const invoice = result.invoice;
  const invoiceId = Number(invoice.id ?? 0);
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new Error('Réponse facture invalide: id manquant');
  }
  return { invoiceId, invoice, alreadyExists: Boolean(result.already_exists) };
}

export async function queueInvoicePrint(invoiceId: number): Promise<void> {
  await apiCore.request(`/printing/invoice/${invoiceId}`, { method: 'POST' });
}

export async function queueReceiptPrint(
  orderId: number,
  receiptType: string,
  selectedSubBillId: number | null
): Promise<void> {
  const subBillQuery =
    selectedSubBillId != null
      ? `?type=${receiptType}&sub_bill_id=${selectedSubBillId}`
      : `?type=${receiptType}`;
  await apiCore.request(`/printing/receipt/${orderId}${subBillQuery}`, { method: 'POST' });
}

export async function exportAfterSalePdf(
  isInvoice: boolean,
  invoiceId: number | null,
  orderId: number,
  receiptType: 'detailed' | 'summary',
  selectedSubBillId: number | null
): Promise<void> {
  if (isInvoice && invoiceId != null) {
    await printingApi.exportInvoicePdf(invoiceId);
    return;
  }
  await printingApi.exportReceiptPdf(orderId, receiptType, selectedSubBillId ?? undefined);
}

export async function emailAfterSaleDocument(
  isInvoice: boolean,
  invoiceId: number | null,
  orderId: number,
  email: string,
  receiptType: 'detailed' | 'summary',
  selectedSubBillId: number | null
): Promise<string> {
  if (isInvoice && invoiceId != null) {
    const result = await printingApi.emailInvoice(invoiceId, email);
    return result.message;
  }
  const result = await printingApi.emailReceipt(
    orderId,
    email,
    receiptType,
    selectedSubBillId ?? undefined
  );
  return result.message;
}
