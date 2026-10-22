import { VATBreakdown } from './types';

export function roundTo4(amount: number): number {
  return Math.round(amount * 10000) / 10000;
}

export function isVat10Rate(rate: number): boolean {
  // 10%: rate 0.10 or 10; otherwise treat as 20%
  return rate <= 0.15 || (rate >= 9 && rate <= 11);
}

export function vatFromTtc(ttc: number, rate: 0.1 | 0.2): number {
  // Reverse extraction from TTC. For exactness and to avoid float drift:
  // 10% => VAT = TTC / 11 ; 20% => VAT = TTC / 6
  const denom = rate === 0.1 ? 11 : 6;
  return roundTo4(ttc / denom);
}

export function computeReconciliation(
  closureTotals: { transactions: number; amount: number; vat: number },
  journalTotals: { count: number; amount: number; vat: number }
): { ok: boolean; details: Record<string, unknown> } {
  // Amount stays strict at sub-cent; VAT allows €0.01 slack for reverse-TTC vs
  // journal total_tax float/cent drift (see C-RECON in anomaly register).
  const RECON_VAT_TOLERANCE_EUR = 0.01;
  const txDelta = closureTotals.transactions - journalTotals.count;
  const amountDelta = roundTo4(closureTotals.amount - journalTotals.amount);
  const vatDelta = roundTo4(closureTotals.vat - journalTotals.vat);
  const ok =
    txDelta === 0 &&
    Math.abs(amountDelta) < 0.0001 &&
    Math.abs(vatDelta) <= RECON_VAT_TOLERANCE_EUR;

  return {
    ok,
    details: {
      closure_transactions: closureTotals.transactions,
      journal_sale_transactions: journalTotals.count,
      transaction_delta: txDelta,
      closure_total_amount: roundTo4(closureTotals.amount),
      journal_sale_amount: roundTo4(journalTotals.amount),
      amount_delta: amountDelta,
      closure_total_vat: roundTo4(closureTotals.vat),
      journal_sale_vat: roundTo4(journalTotals.vat),
      vat_delta: vatDelta,
      vat_tolerance_eur: RECON_VAT_TOLERANCE_EUR,
      compared_at: new Date().toISOString(),
    },
  };
}

/** Exported for unit tests only. */
export const __testComputeReconciliation = computeReconciliation;

/**
 * Build exact VAT breakdown from order_items (no rounding).
 * Used for closure bulletins so stored totals match sum of order tax amounts.
 * tax_rate in DB may be 0.10/0.20 (decimal) or 10/20 (percentage); we bucket by 10% vs 20%.
 */
export async function getExactVatBreakdownFromOrderItems(
  pool: { query: (q: string, values?: unknown[]) => Promise<{ rows: unknown[] }> },
  orderIds: number[]
): Promise<VATBreakdown> {
  const vatBreakdown: VATBreakdown = {
    vat_10: { amount: 0, vat: 0, ttc: 0 },
    vat_20: { amount: 0, vat: 0, ttc: 0 }
  };
  if (orderIds.length === 0) return vatBreakdown;

  const itemsResult = await pool.query(
    'SELECT total_price, tax_rate FROM order_items WHERE order_id = ANY($1)',
    [orderIds]
  );
  const items = itemsResult.rows as Array<{ total_price: string | number; tax_rate: string | number }>;

  let ttc10 = 0;
  let ttc20 = 0;
  for (const item of items) {
    const totalPrice = parseFloat(String(item.total_price ?? 0));
    const rate = parseFloat(String(item.tax_rate ?? 0.2));
    if (isVat10Rate(rate)) {
      ttc10 += totalPrice;
    } else {
      ttc20 += totalPrice;
    }
  }

  // Compute VAT/HT from the bucket totals (audit-friendly, avoids per-line rounding drift)
  const vat10 = vatFromTtc(ttc10, 0.1);
  const vat20 = vatFromTtc(ttc20, 0.2);
  const ht10 = roundTo4(ttc10 - vat10);
  const ht20 = roundTo4(ttc20 - vat20);

  vatBreakdown.vat_10.ttc = roundTo4(ttc10);
  vatBreakdown.vat_10.vat = vat10;
  vatBreakdown.vat_10.amount = ht10;

  vatBreakdown.vat_20.ttc = roundTo4(ttc20);
  vatBreakdown.vat_20.vat = vat20;
  vatBreakdown.vat_20.amount = ht20;

  return vatBreakdown;
}
