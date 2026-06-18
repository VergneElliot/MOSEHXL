/**
 * Role vocabulary boundary and mapping helpers.
 *
 * Why this exists:
 * - Authentication / authorization tokens use canonical auth roles only.
 * - User-management screens still expose legacy role templates for UX compatibility.
 * - Invitation flows carry invitation labels that are normalized at acceptance time.
 */

export const CANONICAL_AUTH_ROLES = [
  'system_admin',
  'establishment_admin',
  'staff',
] as const;

export type CanonicalAuthRole = (typeof CANONICAL_AUTH_ROLES)[number];

/**
 * Legacy role template ids used by user-management role editor endpoints.
 * They are not JWT/runtime auth roles.
 */
export const USER_MANAGEMENT_TEMPLATE_ROLE_IDS = [
  'admin',
  'manager',
  'staff',
  'cashier',
] as const;

export type UserManagementTemplateRoleId = (typeof USER_MANAGEMENT_TEMPLATE_ROLE_IDS)[number];

/**
 * Invitation labels accepted by invitation endpoints.
 * They normalize to canonical auth roles when accounts are created.
 */
export const INVITATION_ROLE_LABELS = [
  'establishment_admin',
  'establishment_manager',
  'establishment_staff',
] as const;

export type InvitationRoleLabel = (typeof INVITATION_ROLE_LABELS)[number];

export function normalizeCanonicalRole(raw: unknown): CanonicalAuthRole | null {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (!v) return null;

  // Canonical roles
  if (v === 'system_admin' || v === 'establishment_admin' || v === 'staff') return v;

  // Legacy / transitional role values
  if (v === 'system_operator') return 'system_admin';
  if (v === 'admin') return 'establishment_admin';
  if (v === 'cashier' || v === 'manager') return 'staff';

  // Unknown role string: fail-safe to least privilege.
  return 'staff';
}

export function deriveCanonicalRole(opts: {
  roleFromDb: unknown;
  isAdminFlag: boolean;
  establishmentId: string | null;
}): CanonicalAuthRole {
  const normalized = normalizeCanonicalRole(opts.roleFromDb);
  if (normalized) return normalized;

  if (opts.isAdminFlag) return 'system_admin';
  if (opts.establishmentId) return 'staff';
  return 'staff';
}

export function mapInvitationRoleLabelToCanonicalRole(role: string): Exclude<CanonicalAuthRole, 'system_admin'> {
  return role === 'establishment_admin' ? 'establishment_admin' : 'staff';
}
