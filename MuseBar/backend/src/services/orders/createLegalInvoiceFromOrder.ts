import { pool } from '../../db/pool';
import { AppError, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { buildReceiptDataForOrder } from '../../printing/printDataRepo';
import { buildReceiptDataForSubBill } from '../../printing/printDataSubBill';
import {
  resolveInvoiceCustomerFields,
  resolveInvoiceLegalFields,
} from './invoiceFieldDefaults';
import { insertLegalInvoiceRow } from './insertLegalInvoiceRow';

export type InvoiceMode = 'detailed' | 'summary';

const SETTINGS_GUIDANCE =
  'Complete Settings > Establishment legal identity fields before generating invoices.';

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function parseIsoDateOnly(value: string): string {
  const trimmed = value.trim();
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
  const info =
    businessInfo && typeof businessInfo === 'object'
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

export function parseInvoiceMode(mode: unknown): InvoiceMode {
  if (mode === 'summary') return 'summary';
  return 'detailed';
}

/** Optional body/query `sub_bill_id`; null means whole-order invoice/receipt. */
export function parseOptionalSubBillId(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new ValidationError('Invalid sub_bill_id');
  }
  return n;
}

export function assertPersistedInvoiceCompliance(row: Record<string, unknown>): void {
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

export async function findExistingLegalInvoice(
  establishmentId: string,
  orderId: number,
  subBillId: number | null
): Promise<Record<string, unknown> | null> {
  const result = await pool.query(
    `SELECT *
     FROM legal_invoices
     WHERE establishment_id = $1
       AND order_id = $2
       AND (
         ($3::bigint IS NULL AND sub_bill_id IS NULL)
         OR sub_bill_id = $3
       )
     LIMIT 1`,
    [establishmentId, orderId, subBillId]
  );
  if ((result.rowCount ?? 0) === 0) return null;
  return result.rows[0] as Record<string, unknown>;
}

async function assertSubBillBelongsToOrder(
  establishmentId: string,
  orderId: number,
  subBillId: number
): Promise<void> {
  const result = await pool.query(
    `SELECT sb.id
     FROM sub_bills sb
     JOIN orders o ON o.id = sb.order_id
     WHERE sb.id = $1 AND sb.order_id = $2 AND o.establishment_id = $3
     LIMIT 1`,
    [subBillId, orderId, establishmentId]
  );
  if ((result.rowCount ?? 0) === 0) {
    throw new NotFoundError('Split payment part');
  }
}

export type CreateLegalInvoiceParams = {
  establishmentId: string;
  orderId: number;
  mode: InvoiceMode;
  customer?: Record<string, unknown>;
  legal?: Record<string, unknown>;
  subBillId: number | null;
  userId: number | null;
  username?: string;
};

export async function createLegalInvoiceFromOrder(
  params: CreateLegalInvoiceParams
): Promise<Record<string, unknown>> {
  const { establishmentId, orderId, mode, subBillId, userId, username } = params;
  const customerFields = resolveInvoiceCustomerFields(params.customer);
  const legalFields = resolveInvoiceLegalFields(params.legal);
  const paymentDueDate = parseIsoDateOnly(legalFields.paymentDueDate);
  const sellerShareCapitalEur = parseOptionalNonNegativeDecimal(
    legalFields.sellerShareCapitalEur,
    'seller_share_capital_eur'
  );

  if (subBillId != null) {
    await assertSubBillBelongsToOrder(establishmentId, orderId, subBillId);
  }

  const printingUser = {
    establishment_id: establishmentId,
    id: typeof userId === 'number' ? userId : 0,
    username,
  };
  const receiptType = mode === 'summary' ? 'summary' : 'detailed';
  const receiptData =
    subBillId != null
      ? await buildReceiptDataForSubBill(
          pool,
          establishmentId,
          printingUser,
          orderId,
          subBillId,
          receiptType
        )
      : await buildReceiptDataForOrder(
          pool,
          establishmentId,
          printingUser,
          orderId,
          receiptType
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
    const invoice = await insertLegalInvoiceRow(client, {
      establishmentId,
      orderId,
      subBillId,
      mode,
      currentYear,
      customerFields,
      paymentDueDate,
      paymentTerms: legalFields.paymentTerms,
      latePenaltyTerms: legalFields.latePenaltyTerms,
      recoveryFeeNote: legalFields.recoveryFeeNote,
      sellerLegalForm: legalFields.sellerLegalForm,
      sellerShareCapitalEur,
      receiptData,
      subtotalHt,
      userId,
    });
    await client.query('COMMIT');
    return invoice;
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
}
