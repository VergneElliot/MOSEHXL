import express from 'express';
import { pool } from '../../db/pool';
import { getEstablishmentId, requireAuth, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import { asyncHandler, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import {
  assertPersistedInvoiceCompliance,
  createLegalInvoiceFromOrder,
  findExistingLegalInvoice,
  parseInvoiceMode,
  parseOptionalSubBillId,
} from '../../services/orders/createLegalInvoiceFromOrder';

const router = express.Router();

router.use(requireAuth, requirePermission(P.access_pos));

// POST /api/legal/invoices/from-order/:orderId
router.post('/from-order/:orderId', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  const orderId = parseInt(req.params.orderId ?? '', 10);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new ValidationError('Invalid order id');
  }

  const body = (req.body ?? {}) as {
    mode?: unknown;
    customer?: Record<string, unknown>;
    legal?: Record<string, unknown>;
    sub_bill_id?: unknown;
  };
  const invoiceMode = parseInvoiceMode(body.mode);
  const subBillId = parseOptionalSubBillId(body.sub_bill_id);

  const existingInvoice = await findExistingLegalInvoice(establishmentId, orderId, subBillId);
  if (existingInvoice) {
    assertPersistedInvoiceCompliance(existingInvoice);
    res.status(200).json({
      invoice: { ...existingInvoice, requested_mode: invoiceMode },
      already_exists: true,
    });
    return;
  }

  const user = req.user as { id?: number; username?: string } | undefined;
  const invoice = await createLegalInvoiceFromOrder({
    establishmentId,
    orderId,
    mode: invoiceMode,
    customer: body.customer,
    legal: body.legal,
    subBillId,
    userId: typeof user?.id === 'number' ? user.id : null,
    username: typeof user?.username === 'string' ? user.username : undefined,
  });

  res.status(201).json({
    invoice: { ...invoice, requested_mode: invoiceMode },
    already_exists: false,
  });
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
