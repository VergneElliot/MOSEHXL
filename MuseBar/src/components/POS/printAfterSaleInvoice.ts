/** Shared defaults + helpers for PrintAfterSaleDialog invoice create. */

export const DEFAULT_INVOICE_CUSTOMER_NAME = 'Client';
export const DEFAULT_PAYMENT_TERMS = 'Comptant — réglé à l’encaissement';
export const DEFAULT_LATE_PENALTY_TERMS =
  'Pénalités de retard exigibles selon la loi (taux BCE + 10 points)';
export const DEFAULT_RECOVERY_FEE_NOTE =
  'Indemnité forfaitaire de recouvrement: 40 EUR (C. com. art. L441-10)';

export function todayYmdLocal(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type InvoiceFormState = {
  customerName: string;
  customerAddress: string;
  customerTaxId: string;
  email: string;
  paymentDueDate: string;
  paymentTerms: string;
  latePenaltyTerms: string;
  recoveryFeeNote: string;
  sellerLegalForm: string;
  sellerShareCapitalEur: string;
};

export function initialInvoiceFormState(): InvoiceFormState {
  return {
    customerName: DEFAULT_INVOICE_CUSTOMER_NAME,
    customerAddress: '',
    customerTaxId: '',
    email: '',
    paymentDueDate: todayYmdLocal(),
    paymentTerms: DEFAULT_PAYMENT_TERMS,
    latePenaltyTerms: DEFAULT_LATE_PENALTY_TERMS,
    recoveryFeeNote: DEFAULT_RECOVERY_FEE_NOTE,
    sellerLegalForm: '',
    sellerShareCapitalEur: '',
  };
}

export function buildInvoiceCreateBody(
  form: InvoiceFormState,
  mode: 'detailed' | 'summary',
  subBillId: number | null
): Record<string, unknown> {
  return {
    mode,
    ...(subBillId != null ? { sub_bill_id: subBillId } : {}),
    customer: {
      name: form.customerName.trim() || DEFAULT_INVOICE_CUSTOMER_NAME,
      address: form.customerAddress.trim(),
      email: form.email.trim(),
      tax_identification: form.customerTaxId.trim(),
    },
    legal: {
      payment_due_date: form.paymentDueDate.trim() || todayYmdLocal(),
      payment_terms: form.paymentTerms.trim() || DEFAULT_PAYMENT_TERMS,
      late_penalty_terms: form.latePenaltyTerms.trim() || DEFAULT_LATE_PENALTY_TERMS,
      recovery_fee_note: form.recoveryFeeNote.trim() || DEFAULT_RECOVERY_FEE_NOTE,
      seller_legal_form: form.sellerLegalForm.trim(),
      seller_share_capital_eur: form.sellerShareCapitalEur.trim(),
    },
  };
}
