import express from 'express';
import { pool } from '../../db/pool';
import { getEstablishmentId, requireAuth, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import { AppError, asyncHandler, ConflictError, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { buildReceiptDataForOrder } from '../../printing/printDataRepo';

const router = express.Router();

type InvoiceMode = 'detailed' | 'summary';

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function parseInvoiceMode(mode: unknown): InvoiceMode {
  if (mode === 'summary') return 'summary';
  return 'detailed';
}

function formatInvoiceNumber(year: number, sequence: number): string {
  return `FAC-${year}-${String(sequence).padStart(6, '0')}`;
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

  const customer = (req.body as { customer?: Record<string, unknown> })?.customer ?? {};
  const customerName = String(customer.name ?? '').trim();
  const customerAddress = String(customer.address ?? '').trim();
  const customerEmail = String(customer.email ?? '').trim();
  const customerTaxIdentification = String(customer.tax_identification ?? customer.taxIdentification ?? '').trim();
  const invoiceMode = parseInvoiceMode((req.body as { mode?: unknown })?.mode);

  if (!customerName) throw new ValidationError('Customer name is required');
  if (!customerAddress) throw new ValidationError('Customer address is required');

  const user = req.user as { id?: number; username?: string } | undefined;
  const printingUser = {
    establishment_id: establishmentId,
    id: typeof user?.id === 'number' ? user.id : 0,
    username: typeof user?.username === 'string' ? user.username : undefined,
  };

  const receiptData = await buildReceiptDataForOrder(pool, establishmentId, printingUser, orderId, invoiceMode);

  const currentYear = new Date().getFullYear();
  const subtotalHt = toNumber(receiptData.total_amount) - toNumber(receiptData.total_tax);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, invoice_number FROM legal_invoices
       WHERE establishment_id = $1 AND order_id = $2
       LIMIT 1`,
      [establishmentId, orderId]
    );
    if ((existing.rowCount ?? 0) > 0) {
      throw new ConflictError(`Invoice already exists for order ${orderId}`);
    }

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

    await client.query(
      `UPDATE legal_invoice_counters
       SET next_sequence = $3, updated_at = CURRENT_TIMESTAMP
       WHERE establishment_id = $1 AND invoice_year = $2`,
      [establishmentId, currentYear, nextSequence + 1]
    );

    const insertRes = await client.query(
      `INSERT INTO legal_invoices (
         establishment_id, order_id, invoice_number, invoice_year, invoice_sequence, invoice_mode,
         customer_name, customer_address, customer_email, customer_tax_identification,
         business_info, line_items, vat_breakdown, subtotal_ht, total_vat, total_ttc,
         source_receipt_sequence, source_receipt_hash, created_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, NULLIF($9, ''), NULLIF($10, ''),
         $11::jsonb, $12::jsonb, $13::jsonb, $14, $15, $16,
         $17, $18, $19
       )
       RETURNING *`,
      [
        establishmentId,
        orderId,
        invoiceNumber,
        currentYear,
        nextSequence,
        invoiceMode,
        customerName,
        customerAddress,
        customerEmail,
        customerTaxIdentification,
        JSON.stringify(receiptData.business_info ?? {}),
        JSON.stringify(receiptData.items ?? []),
        JSON.stringify(receiptData.vat_breakdown ?? []),
        subtotalHt.toFixed(2),
        toNumber(receiptData.total_tax).toFixed(2),
        toNumber(receiptData.total_amount).toFixed(2),
        receiptData.sequence_number ?? null,
        receiptData.compliance_info?.receipt_hash ?? null,
        typeof user?.id === 'number' ? user.id : null,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ invoice: insertRes.rows[0] });
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
