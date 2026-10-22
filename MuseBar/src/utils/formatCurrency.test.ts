import { describe, expect, it } from 'vitest';
import { formatCurrency } from './formatCurrency';

describe('formatCurrency', () => {
  it('formats EUR in fr-FR', () => {
    const formatted = formatCurrency(12.5);
    expect(formatted).toContain('12');
    expect(formatted).toContain('50');
    expect(formatted.replace(/\s/g, ' ')).toMatch(/12[,.]50/);
    expect(formatted).toMatch(/€/);
  });

  it('handles zero and negatives', () => {
    expect(formatCurrency(0)).toMatch(/0/);
    expect(formatCurrency(-3.2)).toMatch(/-/);
  });
});
