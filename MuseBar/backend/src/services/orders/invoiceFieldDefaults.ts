/** Defaults for POS invoices already paid at the counter (French commercial mentions). */

export const DEFAULT_INVOICE_CUSTOMER_NAME = 'Client';

export const DEFAULT_PAYMENT_TERMS = 'Comptant — réglé à l’encaissement';

export const DEFAULT_LATE_PENALTY_TERMS =
  'Pénalités de retard exigibles selon la loi (taux BCE + 10 points)';

export const DEFAULT_RECOVERY_FEE_NOTE =
  'Indemnité forfaitaire de recouvrement: 40 EUR (C. com. art. L441-10)';

export function todayYmdUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function resolveInvoiceCustomerFields(customer: Record<string, unknown> | undefined): {
  name: string;
  address: string;
  email: string;
  taxIdentification: string;
} {
  const name = String(customer?.name ?? '').trim() || DEFAULT_INVOICE_CUSTOMER_NAME;
  return {
    name,
    address: String(customer?.address ?? '').trim(),
    email: String(customer?.email ?? '').trim(),
    taxIdentification: String(
      customer?.tax_identification ?? customer?.taxIdentification ?? ''
    ).trim(),
  };
}

export function resolveInvoiceLegalFields(legal: Record<string, unknown> | undefined): {
  paymentDueDate: string;
  paymentTerms: string;
  latePenaltyTerms: string;
  recoveryFeeNote: string;
  sellerLegalForm: string;
  sellerShareCapitalEur: unknown;
} {
  const dueRaw = String(legal?.payment_due_date ?? '').trim();
  return {
    paymentDueDate: dueRaw || todayYmdUtc(),
    paymentTerms: String(legal?.payment_terms ?? '').trim() || DEFAULT_PAYMENT_TERMS,
    latePenaltyTerms:
      String(legal?.late_penalty_terms ?? '').trim() || DEFAULT_LATE_PENALTY_TERMS,
    recoveryFeeNote:
      String(legal?.recovery_fee_note ?? '').trim() || DEFAULT_RECOVERY_FEE_NOTE,
    sellerLegalForm: String(legal?.seller_legal_form ?? '').trim(),
    sellerShareCapitalEur: legal?.seller_share_capital_eur,
  };
}
