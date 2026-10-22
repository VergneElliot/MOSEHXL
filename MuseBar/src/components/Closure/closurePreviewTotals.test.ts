import { describe, expect, it } from 'vitest';
import { computeClosurePreviewTotals, type ClosurePreviewData } from './closurePreviewTotals';

function preview(partial: Partial<ClosurePreviewData> = {}): ClosurePreviewData {
  return {
    id: 1,
    closure_type: 'daily',
    period_start: '2026-10-01',
    period_end: '2026-10-01',
    total_transactions: 1,
    fond_de_caisse: 50,
    total_amount: 120,
    total_vat: 20,
    vat_breakdown: {
      vat_10: { amount: 50, vat: 5, ttc: 55 },
      vat_20: { amount: 50, vat: 10, ttc: 60 },
    },
    payment_methods_breakdown: { card: 70, cash: 50 },
    tips_total: 3,
    change_total: 1,
    ...partial,
  };
}

describe('closurePreviewTotals', () => {
  it('computes HT/VAT from integer cents so they add up', () => {
    const totals = computeClosurePreviewTotals(preview());
    expect(totals.totalTtc).toBe(120);
    expect(totals.totalVat).toBe(15);
    expect(totals.totalHt).toBe(105);
    expect(totals.totalHt + totals.totalVat).toBeCloseTo(totals.totalTtc, 10);
    expect(totals.cardTotal).toBe(70);
    expect(totals.cashTotal).toBe(50);
    expect(totals.tipsTotal).toBe(3);
    expect(totals.changeTotal).toBe(1);
    expect(totals.fondDeCaisse).toBe(50);
    expect(totals.vat10Ttc).toBe(55);
    expect(totals.vat20Ttc).toBe(60);
    expect(totals.vat10Amount).toBe(5);
    expect(totals.vat20Amount).toBe(10);
  });

  it('derives ttc from base+vat when ttc missing', () => {
    const totals = computeClosurePreviewTotals(
      preview({
        vat_breakdown: {
          vat_10: { amount: 10, vat: 1 },
          vat_20: { amount: 20, vat: 4 },
        },
      })
    );
    expect(totals.vat10Ttc).toBe(11);
    expect(totals.vat20Ttc).toBe(24);
  });

  it('coerces bad numeric strings and empties to 0', () => {
    const totals = computeClosurePreviewTotals(
      preview({
        total_amount: '12.345' as unknown as number,
        fond_de_caisse: 'nope' as unknown as number,
        tips_total: undefined,
        payment_methods_breakdown: {},
        vat_breakdown: {},
      })
    );
    expect(totals.totalTtc).toBe(12.345);
    expect(totals.fondDeCaisse).toBe(0);
    expect(totals.tipsTotal).toBe(0);
    expect(totals.cardTotal).toBe(0);
    expect(totals.totalVat).toBe(0);
    expect(totals.totalHt).toBe(12.35);
  });
});
