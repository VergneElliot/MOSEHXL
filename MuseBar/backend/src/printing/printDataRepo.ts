import type { Pool } from 'pg';
import { getRegisterIdForEstablishment } from '../utils/registerId';

import type {
  PrintResult,
  ReceiptData as PrintingReceiptData,
  ClosureBulletinData as PrintingClosureBulletinData,
} from '../services/printing/types';

export type PrintingUser = {
  establishment_id: string;
  id: number;
  username?: string;
};

export async function buildTestReceiptData(pool: Pool, user: PrintingUser): Promise<PrintingReceiptData> {
  const estResult = await pool.query(
    `SELECT
       COALESCE(bs.name, e.name) AS name,
       COALESCE(bs.address, e.address) AS address,
       COALESCE(bs.phone, e.phone) AS phone,
       COALESCE(bs.email, e.email) AS email,
       bs.siret AS siret,
       bs.tax_identification AS tax_identification
     FROM establishments e
     LEFT JOIN LATERAL (
       SELECT name, address, phone, email, siret, tax_identification
       FROM business_settings
       WHERE establishment_id = e.id
       ORDER BY updated_at DESC
       LIMIT 1
     ) bs ON true
     WHERE e.id = $1
     LIMIT 1`,
    [user.establishment_id]
  );

  const est = estResult.rows[0] ?? {};

  return {
    order_id: 0,
    sequence_number: 0,
    total_amount: 10.0,
    total_tax: 2.0,
    payment_method: 'TEST',
    created_at: new Date().toISOString(),
    receipt_type: 'detailed',
    items: [
      {
        product_name: 'Test Item',
        quantity: 1,
        unit_price: 8.0,
        total_price: 8.0,
        tax_rate: 20,
      },
    ],
    business_info: {
      name: String(est.name ?? ''),
      address: String(est.address ?? ''),
      phone: String(est.phone ?? ''),
      email: String(est.email ?? ''),
      siret: est.siret ? String(est.siret) : undefined,
      tax_identification: est.tax_identification ? String(est.tax_identification) : undefined,
    },
    compliance_info: {
      cash_register_id: getRegisterIdForEstablishment(user.establishment_id),
      operator_id: user.username,
    },
  };
}

export async function buildReceiptDataForOrder(
  pool: Pool,
  establishmentId: string,
  user: PrintingUser,
  orderId: number,
  type: string
): Promise<PrintingReceiptData> {
  const receiptResult = await pool.query(
    `SELECT 
      o.id as order_id,
      COALESCE(lj.sequence_number, o.id) as sequence_number,
      o.total_amount,
      o.total_tax as total_tax,
      o.payment_method,
      o.created_at,
      o.tips,
      o.change AS change,
      lj.current_hash as receipt_hash,
      json_agg(
        json_build_object(
          'product_name', oi.product_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'tax_rate', p.tax_rate
        )
      ) as items,
      MAX(COALESCE(bs.name, e.name)) as business_name,
      MAX(COALESCE(bs.address, e.address)) as business_address,
      MAX(COALESCE(bs.phone, e.phone)) as business_phone,
      MAX(COALESCE(bs.email, e.email)) as business_email,
      MAX(bs.siret) as siret,
      MAX(bs.tax_identification) as tax_identification
    FROM public.orders o
    LEFT JOIN LATERAL (
      SELECT sequence_number, current_hash
      FROM public.legal_journal
      WHERE order_id = o.id
        AND establishment_id = o.establishment_id
        AND transaction_type = 'SALE'
      ORDER BY sequence_number DESC
      LIMIT 1
    ) lj ON true
    JOIN public.establishments e ON e.id = $2
    LEFT JOIN LATERAL (
      SELECT name, address, phone, email, siret, tax_identification
      FROM public.business_settings
      WHERE establishment_id = e.id
      ORDER BY updated_at DESC
      LIMIT 1
    ) bs ON true
    LEFT JOIN public.order_items oi ON o.id = oi.order_id
    LEFT JOIN public.products p ON oi.product_id = p.id
    WHERE o.id = $1 AND o.establishment_id = $2
    GROUP BY o.id, e.id, lj.sequence_number, lj.current_hash`,
    [orderId, establishmentId]
  );

  if (receiptResult.rows.length === 0) {
    const err = Object.assign(new Error('Receipt not found'), { statusCode: 404 });
    throw err;
  }

  const receiptRow = receiptResult.rows[0];
  const parsedSequence = Number(receiptRow.sequence_number);
  const parsedTotalTax =
    typeof receiptRow.total_tax === 'number'
      ? receiptRow.total_tax
      : parseFloat(String(receiptRow.total_tax ?? '0'));
  const safeSequenceNumber = Number.isFinite(parsedSequence) && parsedSequence > 0 ? parsedSequence : Number(receiptRow.order_id);
  const safeTotalTax = Number.isFinite(parsedTotalTax) ? parsedTotalTax : 0;

  const receiptData: PrintingReceiptData = {
    order_id: Number(receiptRow.order_id),
    sequence_number: safeSequenceNumber,
    document_kind: 'ticket',
    document_number: String(safeSequenceNumber).padStart(6, '0'),
    total_amount: parseFloat(receiptRow.total_amount),
    total_tax: safeTotalTax,
    payment_method: String(receiptRow.payment_method ?? ''),
    created_at: new Date(receiptRow.created_at).toISOString(),
    items: Array.isArray(receiptRow.items) ? receiptRow.items : [],
    business_info: {
      name: String(receiptRow.business_name ?? ''),
      address: String(receiptRow.business_address ?? ''),
      phone: String(receiptRow.business_phone ?? ''),
      email: String(receiptRow.business_email ?? ''),
      siret: receiptRow.siret ? String(receiptRow.siret) : undefined,
      tax_identification: receiptRow.tax_identification ? String(receiptRow.tax_identification) : undefined,
    },
    receipt_type: type as 'detailed' | 'summary',
    tips: receiptRow.tips ? parseFloat(receiptRow.tips) : undefined,
    change: receiptRow.change ? parseFloat(receiptRow.change) : undefined,
    compliance_info: {
      receipt_hash: receiptRow.receipt_hash ? String(receiptRow.receipt_hash) : undefined,
      cash_register_id: getRegisterIdForEstablishment(user.establishment_id),
      operator_id: user.username,
    },
  };

  const toNumber = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const items: Array<{ tax_rate?: number; total_price?: string | number }> = Array.isArray(receiptRow.items)
    ? (receiptRow.items as Array<{ tax_rate?: number; total_price?: string | number }>)
    : [];

  const vatBreakdown: Array<{ rate: number; subtotal_ht: number; vat: number }> = [];
  const vat10Items = items.filter((item) => item.tax_rate === 10);
  const vat20Items = items.filter((item) => item.tax_rate === 20);
  if (vat10Items.length > 0) {
    const subtotal = vat10Items.reduce((sum, item) => sum + toNumber(item.total_price), 0);
    const vat = (subtotal * 0.1) / 1.1;
    vatBreakdown.push({ rate: 10, subtotal_ht: subtotal - vat, vat });
  }
  if (vat20Items.length > 0) {
    const subtotal = vat20Items.reduce((sum, item) => sum + toNumber(item.total_price), 0);
    const vat = (subtotal * 0.2) / 1.2;
    vatBreakdown.push({ rate: 20, subtotal_ht: subtotal - vat, vat });
  }
  receiptData.vat_breakdown = vatBreakdown;

  return receiptData;
}

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
      cash_register_id: getRegisterIdForEstablishment(user.establishment_id),
      operator_id: user.username,
    },
  };
}

export async function buildClosureBulletinData(
  pool: Pool,
  user: PrintingUser,
  bulletinId: number
): Promise<PrintingClosureBulletinData> {
  const bulletinResult = await pool.query(
    `SELECT 
      cb.*,
      COALESCE(bs.name, e.name) as business_name,
      COALESCE(bs.address, e.address) as business_address,
      COALESCE(bs.phone, e.phone) as business_phone,
      COALESCE(bs.email, e.email) as business_email,
      bs.siret,
      bs.tax_identification
    FROM closure_bulletins cb
    JOIN establishments e ON cb.establishment_id = e.id
    LEFT JOIN LATERAL (
      SELECT name, address, phone, email, siret, tax_identification
      FROM business_settings
      WHERE establishment_id = e.id
      ORDER BY updated_at DESC
      LIMIT 1
    ) bs ON true
    WHERE cb.id = $1 AND cb.establishment_id = $2`,
    [bulletinId, user.establishment_id]
  );

  if (bulletinResult.rows.length === 0) {
    const err = Object.assign(new Error('Closure bulletin not found'), { statusCode: 404 });
    throw err;
  }

  const bulletin = bulletinResult.rows[0];
  const bulletinData: PrintingClosureBulletinData = {
    id: Number(bulletin.id),
    closure_type: bulletin.closure_type,
    period_start: new Date(bulletin.period_start).toISOString(),
    period_end: new Date(bulletin.period_end).toISOString(),
    total_transactions: Number(bulletin.total_transactions),
    fond_de_caisse: bulletin.fond_de_caisse ? parseFloat(bulletin.fond_de_caisse) : 0,
    total_amount: parseFloat(bulletin.total_amount),
    total_vat: parseFloat(bulletin.total_vat),
    vat_breakdown: bulletin.vat_breakdown,
    payment_methods_breakdown: bulletin.payment_methods_breakdown,
    first_sequence: Number(bulletin.first_sequence),
    last_sequence: Number(bulletin.last_sequence),
    closure_hash: String(bulletin.closure_hash),
    is_closed: Boolean(bulletin.is_closed),
    closed_at: bulletin.closed_at,
    created_at: bulletin.created_at,
    tips_total: bulletin.tips_total ? parseFloat(bulletin.tips_total) : undefined,
    change_total: bulletin.change_total ? parseFloat(bulletin.change_total) : undefined,
    business_info: {
      name: String(bulletin.business_name ?? ''),
      address: String(bulletin.business_address ?? ''),
      phone: String(bulletin.business_phone ?? ''),
      email: String(bulletin.business_email ?? ''),
      siret: bulletin.siret ? String(bulletin.siret) : undefined,
      tax_identification: bulletin.tax_identification ? String(bulletin.tax_identification) : undefined,
    },
    compliance_info: {
      cash_register_id: getRegisterIdForEstablishment(user.establishment_id),
      operator_id: user.username,
    },
  };

  return bulletinData;
}

export async function logPrintingHistory(
  pool: Pool,
  establishmentId: string,
  printType: 'receipt' | 'closure_bulletin' | 'invoice',
  result: PrintResult,
  metadata: Record<string, unknown>
) {
  await pool.query(
    `INSERT INTO printing_history 
     (establishment_id, print_type, provider, status, metadata) 
     VALUES ($1, $2, $3, $4, $5)`,
    [
      establishmentId,
      printType,
      result.provider || 'unknown',
      result.success ? 'success' : 'failed',
      JSON.stringify({ ...metadata, ...result.metadata }),
    ]
  );
}

