import { describe, expect, it } from 'vitest';
import {
  isValidPinFormatForRules,
  resolvePinLengthRules,
  userRequiresElevatedPin,
} from './pinRules';

describe('pinRules', () => {
  it('treats establishment_admin as elevated', () => {
    expect(
      userRequiresElevatedPin({ role: 'establishment_admin', permissions: ['access_pos'] })
    ).toBe(true);
    const rules = resolvePinLengthRules({
      role: 'establishment_admin',
      permissions: [],
    });
    expect(rules).toEqual({ kind: 'elevated', min_length: 4, max_length: 8 });
  });

  it('treats access_pos-only staff as basic (2 digits)', () => {
    const rules = resolvePinLengthRules({
      role: 'staff',
      permissions: ['access_pos'],
    });
    expect(rules).toEqual({ kind: 'basic', min_length: 2, max_length: 2 });
    expect(isValidPinFormatForRules('42', rules)).toBe(true);
    expect(isValidPinFormatForRules('1234', rules)).toBe(false);
  });

  it('requires 4–8 digits when elevated permissions are present', () => {
    const rules = resolvePinLengthRules({
      role: 'staff',
      permissions: ['access_pos', 'orders_cancel'],
    });
    expect(rules.kind).toBe('elevated');
    expect(isValidPinFormatForRules('1234', rules)).toBe(true);
    expect(isValidPinFormatForRules('12', rules)).toBe(false);
    expect(isValidPinFormatForRules('12345678', rules)).toBe(true);
  });
});
