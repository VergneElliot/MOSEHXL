import { describe, expect, it } from 'vitest';
import {
  BASIC_PERMISSIONS,
  ELEVATED_PIN_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_TIERS,
  SPECIFIC_PERMISSIONS,
  resolvePinLengthRules,
} from '@mosehxl/types';
import {
  ALL_PERMISSION_NAMES,
  requiresPinResetAfterGrantChange,
  resolveEffectivePermissions,
} from './resolve';

describe('permission tiers', () => {
  it('partitions every registry key into exactly one tier', () => {
    const registryKeys = Object.values(PERMISSIONS).sort();
    expect([...ALL_PERMISSION_NAMES].sort()).toEqual(registryKeys);
    expect(
      BASIC_PERMISSIONS.filter((name) => SPECIFIC_PERMISSIONS.includes(name))
    ).toEqual([]);
    expect(BASIC_PERMISSIONS.length + SPECIFIC_PERMISSIONS.length).toBe(
      registryKeys.length
    );
  });

  it('keeps the basic tier limited to what any staff member may do', () => {
    expect(BASIC_PERMISSIONS).toEqual([PERMISSIONS.access_pos]);
  });

  it('requires an elevated PIN for exactly the specific tier', () => {
    expect([...ELEVATED_PIN_PERMISSIONS].sort()).toEqual([...SPECIFIC_PERMISSIONS].sort());
  });

  it('classifies cancelling a paid order and reassigning a waiter as specific', () => {
    expect(PERMISSION_TIERS[PERMISSIONS.orders_cancel]).toBe('specific');
    expect(PERMISSION_TIERS[PERMISSIONS.pos_reassign_waiter]).toBe('specific');
  });
});

describe('resolveEffectivePermissions', () => {
  it('grants the basic tier to any active membership', () => {
    const result = resolveEffectivePermissions({
      role: 'staff',
      grantedNames: [],
      hasEstablishmentContext: true,
    });
    expect(result).toEqual([PERMISSIONS.access_pos]);
  });

  it('adds explicit specific grants on top of the basic tier', () => {
    const result = resolveEffectivePermissions({
      role: 'staff',
      grantedNames: [PERMISSIONS.orders_cancel],
      hasEstablishmentContext: true,
    });
    expect(result).toContain(PERMISSIONS.access_pos);
    expect(result).toContain(PERMISSIONS.orders_cancel);
    expect(result).not.toContain(PERMISSIONS.access_settings);
  });

  it('gives establishment admins every permission implicitly', () => {
    const result = resolveEffectivePermissions({
      role: 'establishment_admin',
      grantedNames: [],
      hasEstablishmentContext: true,
    });
    expect([...result].sort()).toEqual([...ALL_PERMISSION_NAMES].sort());
    expect(result).toContain(PERMISSIONS.access_compliance);
  });

  it('ignores grants that are no longer in the registry', () => {
    const result = resolveEffectivePermissions({
      role: 'staff',
      grantedNames: ['access_history', 'access_happy_hour'],
      hasEstablishmentContext: true,
    });
    expect(result).toEqual([PERMISSIONS.access_pos]);
  });

  it('returns nothing without an establishment context', () => {
    expect(
      resolveEffectivePermissions({
        role: 'establishment_admin',
        grantedNames: [],
        hasEstablishmentContext: false,
      })
    ).toEqual([]);
  });
});

describe('PIN strength follows granted rights', () => {
  it('keeps a 2-digit PIN for staff holding only basic access', () => {
    const rules = resolvePinLengthRules({
      role: 'staff',
      permissions: [PERMISSIONS.access_pos],
    });
    expect(rules).toEqual({ kind: 'basic', min_length: 2, max_length: 2 });
  });

  it('requires 4–8 digits as soon as one specific permission is held', () => {
    const rules = resolvePinLengthRules({
      role: 'staff',
      permissions: [PERMISSIONS.access_pos, PERMISSIONS.orders_cancel],
    });
    expect(rules).toEqual({ kind: 'elevated', min_length: 4, max_length: 8 });
  });

  it('clears the PIN when a basic account gains a specific permission', () => {
    expect(
      requiresPinResetAfterGrantChange({
        hasPin: true,
        role: 'staff',
        permissionsBefore: [PERMISSIONS.access_pos],
        permissionsAfter: [PERMISSIONS.access_pos, PERMISSIONS.access_planning],
      })
    ).toBe(true);
  });

  it('leaves an already elevated PIN alone', () => {
    expect(
      requiresPinResetAfterGrantChange({
        hasPin: true,
        role: 'staff',
        permissionsBefore: [PERMISSIONS.access_pos, PERMISSIONS.access_planning],
        permissionsAfter: [PERMISSIONS.access_pos, PERMISSIONS.access_documents],
      })
    ).toBe(false);
  });

  it('does not ask for a reset when losing specific permissions', () => {
    expect(
      requiresPinResetAfterGrantChange({
        hasPin: true,
        role: 'staff',
        permissionsBefore: [PERMISSIONS.access_pos, PERMISSIONS.access_planning],
        permissionsAfter: [PERMISSIONS.access_pos],
      })
    ).toBe(false);
  });

  it('does nothing when the account has no PIN yet', () => {
    expect(
      requiresPinResetAfterGrantChange({
        hasPin: false,
        role: 'staff',
        permissionsBefore: [PERMISSIONS.access_pos],
        permissionsAfter: [PERMISSIONS.access_pos, PERMISSIONS.access_closure],
      })
    ).toBe(false);
  });
});
