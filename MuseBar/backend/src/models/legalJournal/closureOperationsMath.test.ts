import { describe, expect, it, vi } from 'vitest';
import {
  roundTo4,
  isVat10Rate,
  vatFromTtc,
  computeReconciliation,
  getExactVatBreakdownFromOrderItems,
} from './closureOperationsMath';

describe('roundTo4', () => {
  it('rounds to four decimal places', () => {
    expect(roundTo4(1.23456)).toBe(1.2346);
    expect(roundTo4(1.23454)).toBe(1.2345);
    expect(roundTo4(0)).toBe(0);
  });
});

describe('isVat10Rate', () => {
  it('treats decimal 0.10 and percentage 10 as 10%', () => {
    expect(isVat10Rate(0.1)).toBe(true);
    expect(isVat10Rate(0.10)).toBe(true);
    expect(isVat10Rate(10)).toBe(true);
    expect(isVat10Rate(9)).toBe(true);
    expect(isVat10Rate(11)).toBe(true);
  });

  it('treats 20% forms as not 10%', () => {
    expect(isVat10Rate(0.2)).toBe(false);
    expect(isVat10Rate(20)).toBe(false);
    expect(isVat10Rate(0.16)).toBe(false);
  });
});

describe('vatFromTtc', () => {
  it('extracts 10% VAT as TTC/11', () => {
    expect(vatFromTtc(11, 0.1)).toBe(1);
    expect(vatFromTtc(110, 0.1)).toBe(10);
  });

  it('extracts 20% VAT as TTC/6', () => {
    expect(vatFromTtc(6, 0.2)).toBe(1);
    expect(vatFromTtc(120, 0.2)).toBe(20);
  });
});

describe('computeReconciliation', () => {
  it('passes when counts match and VAT is within €0.01', () => {
    const result = computeReconciliation(
      { transactions: 10, amount: 100, vat: 12.3456 },
      { count: 10, amount: 100, vat: 12.3451 }
    );
    expect(result.ok).toBe(true);
    expect(result.details.vat_tolerance_eur).toBe(0.01);
    expect(result.details.transaction_delta).toBe(0);
    expect(typeof result.details.compared_at).toBe('string');
  });

  it('fails when VAT differs by more than one cent', () => {
    const result = computeReconciliation(
      { transactions: 10, amount: 100, vat: 12.5 },
      { count: 10, amount: 100, vat: 12.48 }
    );
    expect(result.ok).toBe(false);
  });

  it('fails on transaction count mismatch', () => {
    const result = computeReconciliation(
      { transactions: 10, amount: 100, vat: 12.34 },
      { count: 9, amount: 100, vat: 12.34 }
    );
    expect(result.ok).toBe(false);
    expect(result.details.transaction_delta).toBe(1);
  });

  it('fails on amount mismatch beyond sub-cent', () => {
    const result = computeReconciliation(
      { transactions: 5, amount: 50.01, vat: 5 },
      { count: 5, amount: 50, vat: 5 }
    );
    expect(result.ok).toBe(false);
    expect(result.details.amount_delta).toBe(0.01);
  });
});

describe('getExactVatBreakdownFromOrderItems', () => {
  it('returns zero buckets when orderIds is empty (no query)', async () => {
    const query = vi.fn();
    const result = await getExactVatBreakdownFromOrderItems({ query }, []);
    expect(query).not.toHaveBeenCalled();
    expect(result).toEqual({
      vat_10: { amount: 0, vat: 0, ttc: 0 },
      vat_20: { amount: 0, vat: 0, ttc: 0 },
    });
  });

  it('buckets by 10% vs 20% and computes HT/VAT from TTC totals', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        { total_price: '11', tax_rate: '0.10' },
        { total_price: 22, tax_rate: 10 },
        { total_price: '120', tax_rate: '0.20' },
        { total_price: 6, tax_rate: 20 },
      ],
    });

    const result = await getExactVatBreakdownFromOrderItems({ query }, [1, 2]);

    expect(query).toHaveBeenCalledWith(
      'SELECT total_price, tax_rate FROM order_items WHERE order_id = ANY($1)',
      [[1, 2]]
    );

    // TTC 10%: 11 + 22 = 33 → VAT 33/11 = 3, HT 30
    expect(result.vat_10).toEqual({ ttc: 33, vat: 3, amount: 30 });
    // TTC 20%: 120 + 6 = 126 → VAT 126/6 = 21, HT 105
    expect(result.vat_20).toEqual({ ttc: 126, vat: 21, amount: 105 });
  });

  it('defaults missing tax_rate to 20% bucket', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ total_price: 6, tax_rate: null }],
    });
    const result = await getExactVatBreakdownFromOrderItems({ query }, [9]);
    expect(result.vat_20.ttc).toBe(6);
    expect(result.vat_20.vat).toBe(1);
    expect(result.vat_10.ttc).toBe(0);
  });
});
