import { describe, expect, it } from 'vitest';
import { __testComputeReconciliation } from './closureOperations';

describe('computeReconciliation VAT tolerance', () => {
  it('passes when VAT differs by less than one cent (C-RECON shape)', () => {
    const result = __testComputeReconciliation(
      { transactions: 10, amount: 100, vat: 12.3456 },
      { count: 10, amount: 100, vat: 12.3451 }
    );
    expect(result.ok).toBe(true);
    expect(result.details.vat_tolerance_eur).toBe(0.01);
  });

  it('fails when VAT differs by more than one cent', () => {
    const result = __testComputeReconciliation(
      { transactions: 10, amount: 100, vat: 12.5 },
      { count: 10, amount: 100, vat: 12.48 }
    );
    expect(result.ok).toBe(false);
  });

  it('still fails on transaction count mismatch', () => {
    const result = __testComputeReconciliation(
      { transactions: 10, amount: 100, vat: 12.34 },
      { count: 9, amount: 100, vat: 12.34 }
    );
    expect(result.ok).toBe(false);
  });
});
