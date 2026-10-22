import { describe, expect, it } from 'vitest';
import {
  isPinLengthValid,
  PIN_BASIC_LENGTH,
  PIN_ELEVATED_MAX_LENGTH,
  PIN_ELEVATED_MIN_LENGTH,
  resolvePinLengthRules,
} from './pinRules';

describe('pinRules (re-export path)', () => {
  it('resolvePinLengthRules returns basic for staff without elevated perms', () => {
    expect(resolvePinLengthRules({ role: 'staff', permissions: [] })).toEqual({
      kind: 'basic',
      min_length: PIN_BASIC_LENGTH,
      max_length: PIN_BASIC_LENGTH,
    });
  });

  it('resolvePinLengthRules elevates admins and specific permissions', () => {
    expect(resolvePinLengthRules({ role: 'establishment_admin', permissions: [] })).toEqual({
      kind: 'elevated',
      min_length: PIN_ELEVATED_MIN_LENGTH,
      max_length: PIN_ELEVATED_MAX_LENGTH,
    });
    expect(
      resolvePinLengthRules({ role: 'staff', permissions: ['access_user_management'] })
    ).toMatchObject({ kind: 'elevated' });
  });

  it('isPinLengthValid enforces digit length for rules', () => {
    const basic = resolvePinLengthRules({ role: 'staff', permissions: [] });
    expect(isPinLengthValid('12', basic)).toBe(true);
    expect(isPinLengthValid('1', basic)).toBe(false);
    expect(isPinLengthValid('1234', basic)).toBe(false);
    expect(isPinLengthValid('ab', basic)).toBe(false);

    const elevated = resolvePinLengthRules({ role: 'system_admin', permissions: [] });
    expect(isPinLengthValid('1234', elevated)).toBe(true);
    expect(isPinLengthValid('12345678', elevated)).toBe(true);
    expect(isPinLengthValid('123', elevated)).toBe(false);
    expect(isPinLengthValid('123456789', elevated)).toBe(false);
  });
});
