import {
  BASIC_PERMISSIONS,
  SPECIFIC_PERMISSIONS,
  isPermissionName,
  userRequiresElevatedPin,
} from '@mosehxl/types';

/** Every permission key known to the product, basic first. */
export const ALL_PERMISSION_NAMES: readonly string[] = [
  ...BASIC_PERMISSIONS,
  ...SPECIFIC_PERMISSIONS,
];

/**
 * Effective permissions for one account in one establishment.
 *
 * - `establishment_admin` holds everything implicitly.
 * - Any active membership holds the basic tier implicitly.
 * - Specific permissions come from explicit `user_permissions` grants.
 *
 * Grants whose name is no longer in the registry are ignored, so a stale DB row
 * cannot widen or narrow access.
 */
export function resolveEffectivePermissions(input: {
  role: string;
  grantedNames: readonly string[];
  hasEstablishmentContext: boolean;
}): string[] {
  if (!input.hasEstablishmentContext) return [];

  if (input.role === 'establishment_admin') {
    return [...ALL_PERMISSION_NAMES];
  }

  const effective = new Set<string>(BASIC_PERMISSIONS);
  for (const granted of input.grantedNames) {
    if (isPermissionName(granted)) effective.add(granted);
  }
  return ALL_PERMISSION_NAMES.filter((name) => effective.has(name));
}

/**
 * True when a permission change turns a basic-PIN account into one that needs an
 * elevated PIN. Its existing 2-digit PIN must then be cleared and set again, since
 * the stored hash cannot be re-validated against the new length rules.
 */
export function requiresPinResetAfterGrantChange(input: {
  hasPin: boolean;
  role: string;
  permissionsBefore: string[];
  permissionsAfter: string[];
}): boolean {
  if (!input.hasPin) return false;
  const before = userRequiresElevatedPin({
    role: input.role,
    permissions: input.permissionsBefore,
  });
  const after = userRequiresElevatedPin({
    role: input.role,
    permissions: input.permissionsAfter,
  });
  return !before && after;
}
