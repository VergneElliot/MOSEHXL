import express from 'express';
import crypto from 'crypto';
import { pool } from '../../db/pool';
import { getEstablishmentId, requireAuth, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import { AppError, asyncHandler, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { buildReceiptDataForOrder } from '../../printing/printDataRepo';

const router = express.Router();

type InvoiceMode = 'detailed' | 'summary';
type ReceiptPreviewType = 'detailed' | 'summary';
const DEFAULT_RECOVERY_FEE_NOTE = 'Indemnité forfaitaire de recouvrement: 40 EUR (C. com. art. L441-10)';
const SETTINGS_GUIDANCE = 'Complete Settings > Establishment legal identity fields before generating invoices.';

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function parseInvoiceMode(mode: unknown): InvoiceMode {
  if (mode === 'summary') return 'summary';
  return 'detailed';
}

function toReceiptPreviewType(mode: InvoiceMode): ReceiptPreviewType {
  return mode === 'summary' ? 'summary' : 'detailed';
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

function parseIsoDateOnly(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError('Legal field payment_due_date is required');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new ValidationError('Legal field payment_due_date must be YYYY-MM-DD');
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError('Legal field payment_due_date is invalid');
  }
  return trimmed;
}

function parseOptionalNonNegativeDecimal(value: unknown, fieldName: string): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) {
    throw new ValidationError(`Legal field ${fieldName} must be a valid number`);
  }
  if (n < 0) {
    throw new ValidationError(`Legal field ${fieldName} must be >= 0`);
  }
  return n;
}

function getMissingSellerIdentityFields(businessInfo: unknown): string[] {
  const info = businessInfo && typeof businessInfo === 'object'
    ? (businessInfo as Record<string, unknown>)
    : {};
  const missing: string[] = [];
  if (!String(info.name ?? '').trim()) missing.push('business_name');
  if (!String(info.address ?? '').trim()) missing.push('business_address');
  if (!String(info.siret ?? '').trim()) missing.push('business_siret');
  if (!String(info.tax_identification ?? '').trim()) missing.push('business_tax_identification');
  return missing;
}

function getMissingLegalInvoiceFields(row: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (!String(row.payment_due_date ?? '').trim()) missing.push('payment_due_date');
  if (!String(row.payment_terms ?? '').trim()) missing.push('payment_terms');
  if (!String(row.late_penalty_terms ?? '').trim()) missing.push('late_penalty_terms');
  if (!String(row.recovery_fee_note ?? '').trim()) missing.push('recovery_fee_note');
  return missing;
}

function assertPersistedInvoiceCompliance(row: Record<string, unknown>) {
  const missingLegal = getMissingLegalInvoiceFields(row);
  if (missingLegal.length > 0) {
    throw new ValidationError(
      `Invoice compliance blocked: missing legal fields (${missingLegal.join(', ')}). ` +
      'Update invoice legal metadata before export/print.'
    );
  }
  const missingSellerIdentity = getMissingSellerIdentityFields(row.business_info);
  if (missingSellerIdentity.length > 0) {
    throw new ValidationError(
      `Invoice compliance blocked: missing seller identity fields (${missingSellerIdentity.join(', ')}). ${SETTINGS_GUIDANCE}`
    );
  }
}

router.use(requireAuth, requirePermission(P.access_pos));

// POST /api/legal/invoices/from-order/:orderId
router.post('/from-order/:orderId', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  const orderId = parseInt(req.params.orderId ?? '', 10);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new ValidationError('Invalid order id');
  }

  const existingResult = await pool.query(
    `SELECT *
     FROM legal_invoices
     WHERE establishment_id = $1 AND order_id = $2
     LIMIT 1`,
    [establishmentId, orderId]
  );
  if ((existingResult.rowCount ?? 0) > 0) {
    const existingInvoice = existingResult.rows[0] as Record<string, unknown>;
    assertPersistedInvoiceCompliance(existingInvoice);
    const responseInvoice = {
      ...existingInvoice,
      requested_mode: parseInvoiceMode((req.body as { mode?: unknown })?.mode),
    };
    res.status(200).json({ invoice: responseInvoice, already_exists: true });
    return;
  }

  const customer = (req.body as { customer?: Record<string, unknown> })?.customer ?? {};
  const customerName = String(customer.name ?? '').trim();
  const customerAddress = String(customer.address ?? '').trim();
  const customerEmail = String(customer.email ?? '').trim();
  const customerTaxIdentification = String(customer.tax_identification ?? customer.taxIdentification ?? '').trim();
  const invoiceMode = parseInvoiceMode((req.body as { mode?: unknown })?.mode);
  const legal = (req.body as { legal?: Record<string, unknown> })?.legal ?? {};
  const paymentDueDate = parseIsoDateOnly(String(legal.payment_due_date ?? ''));
  const paymentTerms = String(legal.payment_terms ?? '').trim();
  const latePenaltyTerms = String(legal.late_penalty_terms ?? '').trim();
  const recoveryFeeNote = String(legal.recovery_fee_note ?? DEFAULT_RECOVERY_FEE_NOTE).trim() || DEFAULT_RECOVERY_FEE_NOTE;
  const sellerLegalForm = String(legal.seller_legal_form ?? '').trim();
  const sellerShareCapitalEur = parseOptionalNonNegativeDecimal(
    legal.seller_share_capital_eur,
    'seller_share_capital_eur'
  );

  if (!customerName) throw new ValidationError('Customer name is required');
  if (!customerAddress) throw new ValidationError('Customer address is required');
  if (!paymentTerms) throw new ValidationError('Legal field payment_terms is required');
  if (!latePenaltyTerms) throw new ValidationError('Legal field late_penalty_terms is required');

  const user = req.user as { id?: number; username?: string } | undefined;
  const printingUser = {
    establishment_id: establishmentId,
    id: typeof user?.id === 'number' ? user.id : 0,
    username: typeof user?.username === 'string' ? user.username : undefined,
  };

  const receiptData = await buildReceiptDataForOrder(
    pool,
    establishmentId,
    printingUser,
    orderId,
    toReceiptPreviewType(invoiceMode)
  );

  const currentYear = new Date().getFullYear();
  const subtotalHt = toNumber(receiptData.total_amount) - toNumber(receiptData.total_tax);
  const missingSellerIdentity = getMissingSellerIdentityFields(receiptData.business_info);
  if (missingSellerIdentity.length > 0) {
    throw new ValidationError(
      `Invoice compliance blocked: missing seller identity fields (${missingSellerIdentity.join(', ')}). ${SETTINGS_GUIDANCE}`
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO legal_invoice_counters (establishment_id, invoice_year, next_sequence)
       VALUES ($1, $2, 1)
       ON CONFLICT (establishment_id, invoice_year) DO NOTHING`,
      [establishmentId, currentYear]
    );

    const counterRes = await client.query(
      `SELECT next_sequence
       FROM legal_invoice_counters
       WHERE establishment_id = $1 AND invoice_year = $2
       FOR UPDATE`,
      [establishmentId, currentYear]
    );
    const nextSequence = Number(counterRes.rows[0]?.next_sequence ?? 1);
    const invoiceNumber = formatInvoiceNumber(currentYear, nextSequence);
    const issuedAt = new Date().toISOString();

    const previousHashRes = await client.query(
      `SELECT invoice_hash
       FROM legal_invoices
       WHERE establishment_id = $1 AND invoice_year = $2
       ORDER BY invoice_sequence DESC
       LIMIT 1`,
      [establishmentId, currentYear]
    );
    const previousInvoiceHash = String(previousHashRes.rows[0]?.invoice_hash ?? '');

    const normalizedLineItems = invoiceMode === 'summary'
      ? normalizeSummaryLineItems(receiptData.items)
      : (receiptData.items ?? []);
    const normalizedVatBreakdown = Array.isArray(receiptData.vat_breakdown) ? receiptData.vat_breakdown : [];

    const hashPayload = {
      establishment_id: establishmentId,
      order_id: orderId,
      invoice_number: invoiceNumber,
      invoice_year: currentYear,
      invoice_sequence: nextSequence,
      invoice_mode: invoiceMode,
      issued_at: issuedAt,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_email: customerEmail || null,
      customer_tax_identification: customerTaxIdentification || null,
      payment_due_date: paymentDueDate,
      payment_terms: paymentTerms,
      late_penalty_terms: latePenaltyTerms,
      recovery_fee_note: recoveryFeeNote,
      seller_legal_form: sellerLegalForm || null,
      seller_share_capital_eur: sellerShareCapitalEur,
      subtotal_ht: Number(subtotalHt.toFixed(2)),
      total_vat: Number(toNumber(receiptData.total_tax).toFixed(2)),
      total_ttc: Number(toNumber(receiptData.total_amount).toFixed(2)),
      source_receipt_sequence: receiptData.sequence_number ?? null,
      source_receipt_hash: receiptData.compliance_info?.receipt_hash ?? null,
      previous_invoice_hash: previousInvoiceHash || null,
      line_items: normalizedLineItems,
      vat_breakdown: normalizedVatBreakdown,
    };
    const invoiceHash = buildInvoiceHash(hashPayload);

    await client.query(
      `UPDATE legal_invoice_counters
       SET next_sequence = $3, updated_at = CURRENT_TIMESTAMP
       WHERE establishment_id = $1 AND invoice_year = $2`,
      [establishmentId, currentYear, nextSequence + 1]
    );

    const insertRes = await client.query(
      `INSERT INTO legal_invoices (
         establishment_id, order_id, invoice_number, invoice_year, invoice_sequence, invoice_mode,
         issued_at,
         customer_name, customer_address, customer_email, customer_tax_identification,
         payment_due_date, payment_terms, late_penalty_terms, recovery_fee_note, seller_legal_form, seller_share_capital_eur,
         business_info, line_items, vat_breakdown, subtotal_ht, total_vat, total_ttc,
         source_receipt_sequence, source_receipt_hash, previous_invoice_hash, invoice_hash, created_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7,
         $8, $9, NULLIF($10, ''), NULLIF($11, ''),
         $12, $13, $14, $15, NULLIF($16, ''), $17,
         $18::jsonb, $19::jsonb, $20::jsonb, $21, $22, $23,
         $24, $25, NULLIF($26, ''), $27, $28
       )
       RETURNING *`,
      [
        establishmentId,
        orderId,
        invoiceNumber,
        currentYear,
        nextSequence,
        invoiceMode,
        issuedAt,
        customerName,
        customerAddress,
        customerEmail,
        customerTaxIdentification,
        paymentDueDate,
        paymentTerms,
        latePenaltyTerms,
        recoveryFeeNote,
        sellerLegalForm,
        sellerShareCapitalEur,
        JSON.stringify(receiptData.business_info ?? {}),
        JSON.stringify(normalizedLineItems),
        JSON.stringify(normalizedVatBreakdown),
        subtotalHt.toFixed(2),
        toNumber(receiptData.total_tax).toFixed(2),
        toNumber(receiptData.total_amount).toFixed(2),
        receiptData.sequence_number ?? null,
        receiptData.compliance_info?.receipt_hash ?? null,
        previousInvoiceHash,
        invoiceHash,
        typeof user?.id === 'number' ? user.id : null,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({
      invoice: {
        ...insertRes.rows[0],
        requested_mode: invoiceMode,
      },
      already_exists: false,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to create invoice',
      500,
      'LEGAL_INVOICE_CREATE_FAILED'
    );
  } finally {
    client.release();
  }
}));

// GET /api/legal/invoices
router.get('/', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  const rawLimit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
  const rawOffset = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 50;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const listRes = await pool.query(
    `SELECT *
     FROM legal_invoices
     WHERE establishment_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [establishmentId, limit, offset]
  );
  const countRes = await pool.query(
    `SELECT COUNT(*) AS count
     FROM legal_invoices
     WHERE establishment_id = $1`,
    [establishmentId]
  );

  res.json({
    invoices: listRes.rows,
    total: parseInt(String(countRes.rows[0]?.count ?? '0'), 10),
    limit,
    offset,
  });
}));

// GET /api/legal/invoices/:invoiceId
router.get('/:invoiceId', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  const invoiceId = parseInt(req.params.invoiceId ?? '', 10);
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new ValidationError('Invalid invoice id');
  }

  const result = await pool.query(
    `SELECT *
     FROM legal_invoices
     WHERE id = $1 AND establishment_id = $2
     LIMIT 1`,
    [invoiceId, establishmentId]
  );
  if ((result.rowCount ?? 0) === 0) {
    throw new NotFoundError('Invoice');
  }
  res.json({ invoice: result.rows[0] });
}));

export default router;
