import type { Pool } from 'pg';
import { getRegisterIdForEstablishment } from '../utils/registerId';
import type { ReceiptData as PrintingReceiptData } from '../services/printing/types';
import type { PrintingUser } from './printDataTypes';

export async function buildReceiptDataForInvoice(
  pool: Pool,
  user: PrintingUser,
  invoiceId: number
): Promise<PrintingReceiptData> {
  const invoiceResult = await pool.query(
    `SELECT
       i.*,
       o.payment_method
     FROM legal_invoices i
     JOIN orders o
       ON o.id = i.order_id
      AND o.establishment_id = i.establishment_id
     WHERE i.id = $1
       AND i.establishment_id = $2
     LIMIT 1`,
    [invoiceId, user.establishment_id]
  );

  if (invoiceResult.rows.length === 0) {
    const err = Object.assign(new Error('Invoice not found'), { statusCode: 404 });
    throw err;
  }

  const row = invoiceResult.rows[0] as Record<string, unknown>;
  const parseNumber = (v: unknown): number => {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
    return Number.isFinite(n) ? n : 0;
  };

  const lineItemsRaw = Array.isArray(row.line_items) ? (row.line_items as Array<Record<string, unknown>>) : [];
  const vatRaw = Array.isArray(row.vat_breakdown) ? (row.vat_breakdown as Array<Record<string, unknown>>) : [];
  const invoiceMode = String(row.invoice_mode ?? 'detailed') === 'summary' ? 'summary' : 'detailed';

  const items = lineItemsRaw.map((item) => ({
    product_name: String(item.product_name ?? item.name ?? ''),
    quantity: parseNumber(item.quantity) || 1,
    unit_price: parseNumber(item.unit_price),
    total_price: parseNumber(item.total_price),
    tax_rate: parseNumber(item.tax_rate),
  }));

  const vatBreakdown = vatRaw.map((vat) => ({
    rate: parseNumber(vat.rate),
    subtotal_ht: parseNumber(vat.subtotal_ht),
    vat: parseNumber(vat.vat),
  }));

  const businessInfoRaw =
    row.business_info && typeof row.business_info === 'object'
      ? (row.business_info as Record<string, unknown>)
      : {};
  const missingLegal: string[] = [];
  if (!String(row.payment_due_date ?? '').trim()) missingLegal.push('payment_due_date');
  if (!String(row.payment_terms ?? '').trim()) missingLegal.push('payment_terms');
  if (!String(row.late_penalty_terms ?? '').trim()) missingLegal.push('late_penalty_terms');
  if (!String(row.recovery_fee_note ?? '').trim()) missingLegal.push('recovery_fee_note');
  if (missingLegal.length > 0) {
    const err = Object.assign(
      new Error(
        `Invoice compliance blocked: missing legal fields (${missingLegal.join(', ')}). ` +
        'Update invoice legal metadata before print/export.'
      ),
      { statusCode: 422 }
    );
    throw err;
  }
  const missingSellerIdentity: string[] = [];
  if (!String(businessInfoRaw.name ?? '').trim()) missingSellerIdentity.push('business_name');
  if (!String(businessInfoRaw.address ?? '').trim()) missingSellerIdentity.push('business_address');
  if (!String(businessInfoRaw.siret ?? '').trim()) missingSellerIdentity.push('business_siret');
  if (!String(businessInfoRaw.tax_identification ?? '').trim()) missingSellerIdentity.push('business_tax_identification');
  if (missingSellerIdentity.length > 0) {
    const err = Object.assign(
      new Error(
        `Invoice compliance blocked: missing seller identity fields (${missingSellerIdentity.join(', ')}). ` +
        'Complete Settings > Establishment legal identity fields before print/export.'
      ),
      { statusCode: 422 }
    );
    throw err;
  }

  return {
    order_id: parseNumber(row.order_id),
    sequence_number: parseNumber(row.invoice_sequence),
    document_kind: 'invoice',
    document_number: String(row.invoice_number ?? ''),
    customer_info: {
      name: String(row.customer_name ?? ''),
      address: String(row.customer_address ?? ''),
      email: row.customer_email ? String(row.customer_email) : undefined,
      tax_identification: row.customer_tax_identification
        ? String(row.customer_tax_identification)
        : undefined,
    },
    total_amount: parseNumber(row.total_ttc),
    total_tax: parseNumber(row.total_vat),
    payment_method: String(row.payment_method ?? 'Facture'),
    created_at: new Date(String(row.issued_at ?? row.created_at ?? new Date().toISOString())).toISOString(),
    items,
    business_info: {
      name: String(businessInfoRaw.name ?? ''),
      address: String(businessInfoRaw.address ?? ''),
      phone: String(businessInfoRaw.phone ?? ''),
      email: String(businessInfoRaw.email ?? ''),
      siret: businessInfoRaw.siret ? String(businessInfoRaw.siret) : undefined,
      tax_identification: businessInfoRaw.tax_identification
        ? String(businessInfoRaw.tax_identification)
        : undefined,
    },
    vat_breakdown: vatBreakdown,
    receipt_type: invoiceMode,
    legal_info: {
      payment_due_date: row.payment_due_date ? String(row.payment_due_date) : undefined,
      payment_terms: row.payment_terms ? String(row.payment_terms) : undefined,
      late_penalty_terms: row.late_penalty_terms ? String(row.late_penalty_terms) : undefined,
      recovery_fee_note: row.recovery_fee_note ? String(row.recovery_fee_note) : undefined,
      seller_legal_form: row.seller_legal_form ? String(row.seller_legal_form) : undefined,
      seller_share_capital_eur:
        row.seller_share_capital_eur == null ? undefined : parseNumber(row.seller_share_capital_eur),
    },
    compliance_info: {
      invoice_hash: row.invoice_hash ? String(row.invoice_hash) : undefined,
      previous_invoice_hash: row.previous_invoice_hash ? String(row.previous_invoice_hash) : undefined,
      source_receipt_hash: row.source_receipt_hash ? String(row.source_receipt_hash) : undefined,
      source_receipt_sequence:
        row.source_receipt_sequence == null ? undefined : parseNumber(row.source_receipt_sequence),
      cash_register_id: getRegisterIdForEstablishment(user.establishment_id),
      operator_id: user.username,
    },
  };
}
