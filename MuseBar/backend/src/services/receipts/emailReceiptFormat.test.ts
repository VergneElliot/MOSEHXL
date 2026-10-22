import { describe, expect, it } from 'vitest';
import { formatClosureType, formatPaymentMethod } from './emailReceiptFormat';

describe('emailReceiptFormat', () => {
  it('maps known payment methods to French labels', () => {
    expect(formatPaymentMethod('cash')).toBe('Espèces');
    expect(formatPaymentMethod('card')).toBe('Carte');
    expect(formatPaymentMethod('split')).toBe('Mixte');
    expect(formatPaymentMethod('check')).toBe('Chèque');
    expect(formatPaymentMethod('transfer')).toBe('Virement');
    expect(formatPaymentMethod('crypto')).toBe('crypto');
  });

  it('maps known closure types to French labels', () => {
    expect(formatClosureType('DAILY')).toBe('Journalière');
    expect(formatClosureType('WEEKLY')).toBe('Hebdomadaire');
    expect(formatClosureType('MONTHLY')).toBe('Mensuelle');
    expect(formatClosureType('ANNUAL')).toBe('Annuelle');
    expect(formatClosureType('OTHER')).toBe('OTHER');
  });
});
