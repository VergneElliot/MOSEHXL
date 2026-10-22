import { describe, expect, it, vi } from 'vitest';
import { BusinessInfoValidator } from './BusinessInfoValidator';
import type { BusinessInfo } from '../../routes/establishmentAccountCreation/types';

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

const valid: BusinessInfo = {
  taxId: 'FR123',
  siretNumber: '12345678901234',
  businessType: 'Bar',
  address: '12 rue de la Paix',
  city: 'Paris',
  postalCode: '75001',
  country: 'France',
  companyName: 'Café Demo',
};

describe('BusinessInfoValidator', () => {
  it('accepts valid French business info', () => {
    const v = new BusinessInfoValidator(logger() as never);
    const result = v.validateBusinessInfo(valid);
    expect(result.isValid).toBe(true);
    expect(result.validatedData).toEqual(valid);
  });

  it('requires address, city, postal code and business type', () => {
    const v = new BusinessInfoValidator(logger() as never);
    const result = v.validateBusinessInfo({
      ...valid,
      address: '',
      city: '',
      postalCode: '',
      businessType: '',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('rejects non-5-digit postal codes and short address/city', () => {
    const v = new BusinessInfoValidator(logger() as never);
    const result = v.validateBusinessInfo({
      ...valid,
      postalCode: '75',
      address: 'short',
      city: 'A',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Postal code'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Address'))).toBe(true);
    expect(result.errors.some((e) => e.includes('City'))).toBe(true);
  });

  it('sanitizeBusinessInfo trims fields', () => {
    const v = new BusinessInfoValidator(logger() as never);
    expect(
      v.sanitizeBusinessInfo({
        ...valid,
        city: '  Lyon  ',
        postalCode: ' 69001 ',
      })
    ).toMatchObject({ city: 'Lyon', postalCode: '69001' });
  });
});
