import { describe, expect, it } from 'vitest';
import { formatEuroAmount } from './formatCurrency';

describe('formatEuroAmount', () => {
  it('formats finite amounts with euro symbol by default', () => {
    expect(formatEuroAmount(12.5)).toBe('12.50 €');
    expect(formatEuroAmount(0)).toBe('0.00 €');
  });

  it('supports EUR label and coerces non-finite to 0', () => {
    expect(formatEuroAmount(3.1, 'EUR')).toBe('3.10 EUR');
    expect(formatEuroAmount(Number.NaN)).toBe('0.00 €');
    expect(formatEuroAmount(Number.POSITIVE_INFINITY, 'EUR')).toBe('0.00 EUR');
  });
});
