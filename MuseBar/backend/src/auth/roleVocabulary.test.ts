import { describe, expect, it } from 'vitest';
import {
  deriveCanonicalRole,
  mapInvitationRoleLabelToCanonicalRole,
  normalizeCanonicalRole,
} from './roleVocabulary';

describe('roleVocabulary', () => {
  it('normalizes legacy auth role aliases to canonical auth roles', () => {
    expect(normalizeCanonicalRole('system_operator')).toBe('system_admin');
    expect(normalizeCanonicalRole('admin')).toBe('establishment_admin');
    expect(normalizeCanonicalRole('cashier')).toBe('staff');
    expect(normalizeCanonicalRole('manager')).toBe('staff');
  });

  it('derives least-privilege fallback role for unknown/empty values', () => {
    expect(deriveCanonicalRole({ roleFromDb: '', isAdminFlag: false, establishmentId: 'est-1' })).toBe('staff');
    expect(deriveCanonicalRole({ roleFromDb: null, isAdminFlag: false, establishmentId: null })).toBe('staff');
    expect(deriveCanonicalRole({ roleFromDb: null, isAdminFlag: true, establishmentId: null })).toBe('system_admin');
  });

  it('maps invitation labels to canonical account roles', () => {
    expect(mapInvitationRoleLabelToCanonicalRole('establishment_admin')).toBe('establishment_admin');
    expect(mapInvitationRoleLabelToCanonicalRole('establishment_manager')).toBe('staff');
    expect(mapInvitationRoleLabelToCanonicalRole('establishment_staff')).toBe('staff');
  });
});
