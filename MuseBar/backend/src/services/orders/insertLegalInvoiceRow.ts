import crypto from 'crypto';
import type { PoolClient } from 'pg';
import type { resolveInvoiceCustomerFields } from './invoiceFieldDefaults';

type InvoiceMode = 'detailed' | 'summary';

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function formatInvoiceNumber(year: number, sequence: number): string {
  return `FAC-${year}-${String(sequence).padStart(6, '0')}`;
}

function normalizeSummaryLineItems(items: unknown): unknown[] {
  if (!Array.isArray(items)) return [];
  return items.map((line) => {
    if (!line || typeof line !== 'object') return {};
    const row = line as Record<string, unknown>;
    return {
      product_name: row.product_name,
      quantity: row.quantity,
      total_price: row.total_price,
      tax_rate: row.tax_rate,
    };
  });
}

function buildInvoiceHash(payload: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
}

export type InsertLegalInvoiceParams = {
  establishmentId: string;
  orderId: number;
  subBillId: number | null;
  mode: InvoiceMode;
  currentYear: number;
  customerFields: ReturnType<typeof resolveInvoiceCustomerFields>;
  paymentDueDate: string;
  paymentTerms: string;
  latePenaltyTerms: string;
  recoveryFeeNote: string;
  sellerLegalForm: string;
  sellerShareCapitalEur: number | null;
  receiptData: {
    total_amount: number;
    total_tax: number;
    business_info?: unknown;
    items?: unknown;
    vat_breakdown?: unknown;
    sequence_number?: number | null;
    compliance_info?: { receipt_hash?: string | null } | null;
  };
  subtotalHt: number;
  userId: number | null;
};

export async function insertLegalInvoiceRow(
  client: PoolClient,
  p: InsertLegalInvoiceParams
): Promise<Record<string, unknown>> {
  await client.query(
    `INSERT INTO legal_invoice_counters (establishment_id, invoice_year, next_sequence)
     VALUES ($1, $2, 1)
     ON CONFLICT (establishment_id, invoice_year) DO NOTHING`,
    [p.establishmentId, p.currentYear]
  );

  const counterRes = await client.query(
    `SELECT next_sequence
     FROM legal_invoice_counters
     WHERE establishment_id = $1 AND invoice_year = $2
     FOR UPDATE`,
    [p.establishmentId, p.currentYear]
  );
  const nextSequence = Number(counterRes.rows[0]?.next_sequence ?? 1);
  const invoiceNumber = formatInvoiceNumber(p.currentYear, nextSequence);
  const issuedAt = new Date().toISOString();

  const previousHashRes = await client.query(
    `SELECT invoice_hash
     FROM legal_invoices
     WHERE establishment_id = $1 AND invoice_year = $2
     ORDER BY invoice_sequence DESC
     LIMIT 1`,
    [p.establishmentId, p.currentYear]
  );
  const previousInvoiceHash = String(previousHashRes.rows[0]?.invoice_hash ?? '');

  const normalizedLineItems =
    p.mode === 'summary'
      ? normalizeSummaryLineItems(p.receiptData.items)
      : (p.receiptData.items ?? []);
  const normalizedVatBreakdown = Array.isArray(p.receiptData.vat_breakdown)
    ? p.receiptData.vat_breakdown
    : [];

  const hashPayload = {
    establishment_id: p.establishmentId,
    order_id: p.orderId,
    sub_bill_id: p.subBillId,
    invoice_number: invoiceNumber,
    invoice_year: p.currentYear,
    invoice_sequence: nextSequence,
    invoice_mode: p.mode,
    issued_at: issuedAt,
    customer_name: p.customerFields.name,
    customer_address: p.customerFields.address,
    customer_email: p.customerFields.email || null,
    customer_tax_identification: p.customerFields.taxIdentification || null,
    payment_due_date: p.paymentDueDate,
    payment_terms: p.paymentTerms,
    late_penalty_terms: p.latePenaltyTerms,
    recovery_fee_note: p.recoveryFeeNote,
    seller_legal_form: p.sellerLegalForm || null,
    seller_share_capital_eur: p.sellerShareCapitalEur,
    subtotal_ht: Number(p.subtotalHt.toFixed(2)),
    total_vat: Number(toNumber(p.receiptData.total_tax).toFixed(2)),
    total_ttc: Number(toNumber(p.receiptData.total_amount).toFixed(2)),
    source_receipt_sequence: p.receiptData.sequence_number ?? null,
    source_receipt_hash: p.receiptData.compliance_info?.receipt_hash ?? null,
    previous_invoice_hash: previousInvoiceHash || null,
    line_items: normalizedLineItems,
    vat_breakdown: normalizedVatBreakdown,
  };
  const invoiceHash = buildInvoiceHash(hashPayload);

  await client.query(
    `UPDATE legal_invoice_counters
     SET next_sequence = $3, updated_at = CURRENT_TIMESTAMP
     WHERE establishment_id = $1 AND invoice_year = $2`,
    [p.establishmentId, p.currentYear, nextSequence + 1]
  );

  const insertRes = await client.query(
    `INSERT INTO legal_invoices (
       establishment_id, order_id, sub_bill_id, invoice_number, invoice_year, invoice_sequence, invoice_mode,
       issued_at,
       customer_name, customer_address, customer_email, customer_tax_identification,
       payment_due_date, payment_terms, late_penalty_terms, recovery_fee_note, seller_legal_form, seller_share_capital_eur,
       business_info, line_items, vat_breakdown, subtotal_ht, total_vat, total_ttc,
       source_receipt_sequence, source_receipt_hash, previous_invoice_hash, invoice_hash, created_by
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8,
       $9, $10, NULLIF($11, ''), NULLIF($12, ''),
       $13, $14, $15, $16, NULLIF($17, ''), $18,
       $19::jsonb, $20::jsonb, $21::jsonb, $22, $23, $24,
       $25, $26, NULLIF($27, ''), $28, $29
     )
     RETURNING *`,
    [
      p.establishmentId,
      p.orderId,
      p.subBillId,
      invoiceNumber,
      p.currentYear,
      nextSequence,
      p.mode,
      issuedAt,
      p.customerFields.name,
      p.customerFields.address,
      p.customerFields.email,
      p.customerFields.taxIdentification,
      p.paymentDueDate,
      p.paymentTerms,
      p.latePenaltyTerms,
      p.recoveryFeeNote,
      p.sellerLegalForm,
      p.sellerShareCapitalEur,
      JSON.stringify(p.receiptData.business_info ?? {}),
      JSON.stringify(normalizedLineItems),
      JSON.stringify(normalizedVatBreakdown),
      p.subtotalHt.toFixed(2),
      toNumber(p.receiptData.total_tax).toFixed(2),
      toNumber(p.receiptData.total_amount).toFixed(2),
      p.receiptData.sequence_number ?? null,
      p.receiptData.compliance_info?.receipt_hash ?? null,
      previousInvoiceHash,
      invoiceHash,
      p.userId,
    ]
  );

  return insertRes.rows[0] as Record<string, unknown>;
}
