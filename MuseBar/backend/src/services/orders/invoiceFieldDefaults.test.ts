import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INVOICE_CUSTOMER_NAME,
  DEFAULT_PAYMENT_TERMS,
  resolveInvoiceCustomerFields,
  resolveInvoiceLegalFields,
  todayYmdUtc,
} from './invoiceFieldDefaults';

describe('invoiceFieldDefaults', () => {
  it('todayYmdUtc returns YYYY-MM-DD', () => {
    expect(todayYmdUtc(new Date('2026-10-22T15:30:00.000Z'))).toBe('2026-10-22');
  });

  it('resolveInvoiceCustomerFields falls back to Client', () => {
    expect(resolveInvoiceCustomerFields(undefined)).toEqual({
      name: DEFAULT_INVOICE_CUSTOMER_NAME,
      address: '',
      email: '',
      taxIdentification: '',
    });
    expect(resolveInvoiceCustomerFields({ name: '  Ada  ', email: 'a@b.c' }).name).toBe('Ada');
    expect(
      resolveInvoiceCustomerFields({ tax_identification: 'FR123' }).taxIdentification
    ).toBe('FR123');
  });

  it('resolveInvoiceLegalFields applies French commercial defaults', () => {
    const empty = resolveInvoiceLegalFields(undefined);
    expect(empty.paymentTerms).toBe(DEFAULT_PAYMENT_TERMS);
    expect(empty.paymentDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(empty.latePenaltyTerms).toMatch(/BCE/);
    expect(empty.recoveryFeeNote).toMatch(/40 EUR/);

    const custom = resolveInvoiceLegalFields({
      payment_due_date: '2026-11-01',
      payment_terms: '30 jours',
      seller_legal_form: 'SAS',
      seller_share_capital_eur: 1000,
    });
    expect(custom.paymentDueDate).toBe('2026-11-01');
    expect(custom.paymentTerms).toBe('30 jours');
    expect(custom.sellerLegalForm).toBe('SAS');
    expect(custom.sellerShareCapitalEur).toBe(1000);
  });
});
