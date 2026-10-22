import { describe, expect, it } from 'vitest';
import {
  validatePasswordStrength,
  validateUserAccountData,
} from './userAccountValidation';

const goodPassword = 'SecurePass1';

describe('validateUserAccountData', () => {
  it('accepts a complete valid payload', () => {
    expect(
      validateUserAccountData({
        email: 'a@b.com',
        password: goodPassword,
        establishmentId: 'est-1',
        role: 'establishment_staff',
      })
    ).toEqual({ isValid: true });
  });

  it('rejects missing/invalid email, password, establishment, role', () => {
    expect(validateUserAccountData({ email: '', password: goodPassword, establishmentId: 'e', role: 'establishment_staff' }).error).toMatch(/Email/);
    expect(
      validateUserAccountData({
        email: 'not-an-email',
        password: goodPassword,
        establishmentId: 'e',
        role: 'establishment_staff',
      }).error
    ).toMatch(/email format/i);
    expect(
      validateUserAccountData({
        email: 'a@b.com',
        password: 'short',
        establishmentId: 'e',
        role: 'establishment_staff',
      }).isValid
    ).toBe(false);
    expect(
      validateUserAccountData({
        email: 'a@b.com',
        password: goodPassword,
        establishmentId: '',
        role: 'establishment_staff',
      }).error
    ).toMatch(/Establishment/);
    expect(
      validateUserAccountData({
        email: 'a@b.com',
        password: goodPassword,
        establishmentId: 'e',
        role: 'superuser',
      }).error
    ).toMatch(/Invalid role/);
  });
});

describe('validatePasswordStrength', () => {
  it('scores stronger passwords higher', () => {
    const weak = validatePasswordStrength('Abcdefg1');
    const strong = validatePasswordStrength('Abcdefghijkl1');
    expect(weak.isValid).toBe(true);
    expect(strong.isValid).toBe(true);
    expect((strong.score ?? 0) >= (weak.score ?? 0)).toBe(true);
  });

  it('rejects invalid passwords', () => {
    expect(validatePasswordStrength('noupper1').isValid).toBe(false);
  });
});
