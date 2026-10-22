import { describe, expect, it } from 'vitest';
import {
  buildInvoiceCreateBody,
  DEFAULT_INVOICE_CUSTOMER_NAME,
  initialInvoiceFormState,
  todayYmdLocal,
} from './printAfterSaleInvoice';
import { parseOrderId } from './usePrintAfterSaleDialog';

describe('todayYmdLocal / parseOrderId', () => {
  it('formats local YMD', () => {
    expect(todayYmdLocal(new Date(2026, 8, 5))).toBe('2026-09-05');
  });

  it('parses positive numeric order ids only', () => {
    expect(parseOrderId(42)).toBe(42);
    expect(parseOrderId(' 99 ')).toBe(99);
    expect(parseOrderId(0)).toBeNull();
    expect(parseOrderId(-1)).toBeNull();
    expect(parseOrderId('x')).toBeNull();
    expect(parseOrderId(null)).toBeNull();
  });
});

describe('buildInvoiceCreateBody', () => {
  it('includes sub_bill_id and trims customer/legal fields', () => {
    const form = {
      ...initialInvoiceFormState(),
      customerName: '  Alice  ',
      customerAddress: ' 1 rue ',
      email: ' a@b.c ',
      customerTaxId: ' FR1 ',
      paymentDueDate: '2026-10-01',
      sellerLegalForm: ' SARL ',
      sellerShareCapitalEur: ' 1000 ',
    };
    expect(buildInvoiceCreateBody(form, 'detailed', 7)).toEqual({
      mode: 'detailed',
      sub_bill_id: 7,
      customer: {
        name: 'Alice',
        address: '1 rue',
        email: 'a@b.c',
        tax_identification: 'FR1',
      },
      legal: {
        payment_due_date: '2026-10-01',
        payment_terms: form.paymentTerms,
        late_penalty_terms: form.latePenaltyTerms,
        recovery_fee_note: form.recoveryFeeNote,
        seller_legal_form: 'SARL',
        seller_share_capital_eur: '1000',
      },
    });
  });

  it('falls back to default customer name and omits null sub-bill', () => {
    const form = { ...initialInvoiceFormState(), customerName: '   ' };
    const body = buildInvoiceCreateBody(form, 'summary', null);
    expect(body.sub_bill_id).toBeUndefined();
    expect((body.customer as { name: string }).name).toBe(DEFAULT_INVOICE_CUSTOMER_NAME);
  });
});
