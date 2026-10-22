import { describe, expect, it } from 'vitest';
import { normalizeReceiptForPreview } from './printAfterSalePreview';

describe('normalizeReceiptForPreview', () => {
  it('returns null for non-objects', () => {
    expect(normalizeReceiptForPreview(null)).toBeNull();
    expect(normalizeReceiptForPreview('x')).toBeNull();
  });

  it('normalizes items, tax rates, and business info', () => {
    const result = normalizeReceiptForPreview({
      order_id: '42',
      total_amount: '12.5',
      total_tax: '1.25',
      payment_method: 'card',
      created_at: '2026-10-14T12:00:00.000Z',
      items: [
        {
          name: 'Café',
          quantity: '2',
          unit_price: '2.5',
          total_price: '5',
          tax_rate: 0.1,
        },
        {
          product_name: 'Eau',
          total_price: 3,
          tax_rate: 5.5,
          tax_amount: 0.16,
        },
      ],
      vat_breakdown: [{ tax_rate: 10, vat: 0.45 }],
      business_info: {
        name: 'Bar',
        address: '1 rue',
        phone: '01',
        email: 'a@b.c',
        siret: '123',
        tax_identification: 'FR1',
      },
    });
    expect(result).not.toBeNull();
    expect(result!.order.id).toBe(42);
    expect(result!.order.items[0]).toMatchObject({
      name: 'Café',
      quantity: 2,
      tax_rate: 10,
    });
    expect(result!.order.items[1]).toMatchObject({
      product_name: 'Eau',
      tax_rate: 5.5,
      tax_amount: 0.16,
    });
    expect(result!.businessInfo).toEqual({
      name: 'Bar',
      address: '1 rue',
      phone: '01',
      email: 'a@b.c',
      siret: '123',
      taxIdentification: 'FR1',
    });
  });
});
