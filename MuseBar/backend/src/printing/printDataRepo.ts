import type { Pool } from 'pg';

import type {
  PrintResult,
  ReceiptData as PrintingReceiptData,
  ClosureBulletinData as PrintingClosureBulletinData,
} from '../services/printing/types';

export type PrintingUser = {
  establishment_id: number;
  id: number;
  username?: string;
};

export async function buildTestReceiptData(pool: Pool, user: PrintingUser): Promise<PrintingReceiptData> {
  const estResult = await pool.query(
    `SELECT name, address, phone, email, siret, tax_identification
     FROM establishments
     WHERE id = $1
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
    receipt_type: 'summary',
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
      cash_register_id: `CR-${user.establishment_id}`,
      operator_id: user.username,
    },
  };
}

export async function buildReceiptDataForOrder(
  pool: Pool,
  establishmentId: number,
  user: PrintingUser,
  orderId: number,
  type: string
): Promise<PrintingReceiptData> {
  const receiptResult = await pool.query(
    `SELECT 
      o.id as order_id,
      o.receipt_number as sequence_number,
      o.total_amount,
      o.tax_amount as total_tax,
      o.payment_method,
      o.created_at,
      o.tips,
      o.change AS change,
      o.receipt_hash,
      json_agg(
        json_build_object(
          'product_name', oi.product_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'tax_rate', p.tax_rate
        )
      ) as items,
      e.name as business_name,
      e.address as business_address,
      e.phone as business_phone,
      e.email as business_email,
      e.siret,
      e.tax_identification
    FROM orders o
    JOIN establishments e ON e.id = $2
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.id = $1 AND o.establishment_id = $2
    GROUP BY o.id, e.id`,
    [orderId, establishmentId]
  );

  if (receiptResult.rows.length === 0) {
    const err = Object.assign(new Error('Receipt not found'), { statusCode: 404 });
    throw err;
  }

  const receiptRow = receiptResult.rows[0];
  const receiptData: PrintingReceiptData = {
    order_id: Number(receiptRow.order_id),
    sequence_number: Number(receiptRow.sequence_number),
    total_amount: parseFloat(receiptRow.total_amount),
    total_tax: parseFloat(receiptRow.total_tax),
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
      cash_register_id: `CR-${user.establishment_id}`,
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

export async function buildClosureBulletinData(
  pool: Pool,
  user: PrintingUser,
  bulletinId: number
): Promise<PrintingClosureBulletinData> {
  const bulletinResult = await pool.query(
    `SELECT 
      cb.*,
      e.name as business_name,
      e.address as business_address,
      e.phone as business_phone,
      e.email as business_email,
      e.siret,
      e.tax_identification
    FROM closure_bulletins cb
    JOIN establishments e ON cb.establishment_id = e.id
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
      cash_register_id: `CR-${user.establishment_id}`,
      operator_id: user.username,
    },
  };

  return bulletinData;
}

export async function logPrintingHistory(
  pool: Pool,
  establishmentId: number,
  printType: 'receipt' | 'closure_bulletin',
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

