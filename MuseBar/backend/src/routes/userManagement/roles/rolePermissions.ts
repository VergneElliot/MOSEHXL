import { Role, RolePermissions } from '../types';
import { UserManagementTemplateRoleId } from '../../../auth/roleVocabulary';

// Legacy user-management role templates used by role-management UI endpoints.
// These are not JWT/runtime auth roles (see auth/roleVocabulary.ts for canonical roles).
export const DEFAULT_ROLES: Record<UserManagementTemplateRoleId, Role> = {
  admin: {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: {
      canManageUsers: true,
      canManageEstablishment: true,
      canViewReports: true,
      canManageInventory: true,
      canProcessOrders: true,
      canManageSettings: true
    },
    isSystemRole: true
  },
  manager: {
    id: 'manager',
    name: 'Manager',
    description: 'Management access with most permissions',
    permissions: {
      canManageUsers: true,
      canManageEstablishment: false,
      canViewReports: true,
      canManageInventory: true,
      canProcessOrders: true,
      canManageSettings: false
    },
    isSystemRole: true
  },
  staff: {
    id: 'staff',
    name: 'Staff',
    description: 'Standard staff member with operational access',
    permissions: {
      canManageUsers: false,
      canManageEstablishment: false,
      canViewReports: false,
      canManageInventory: true,
      canProcessOrders: true,
      canManageSettings: false
    },
    isSystemRole: true
  },
  cashier: {
    id: 'cashier',
    name: 'Cashier',
    description: 'Point of sale operations only',
    permissions: {
      canManageUsers: false,
      canManageEstablishment: false,
      canViewReports: false,
      canManageInventory: false,
      canProcessOrders: true,
      canManageSettings: false
    },
    isSystemRole: true
  }
};


export function getSystemRoles(): Role[] {
  return Object.values(DEFAULT_ROLES);
}

export function getSystemRoleById(roleId: string): Role | null {
  if (roleId in DEFAULT_ROLES) {
    return DEFAULT_ROLES[roleId as UserManagementTemplateRoleId];
  }
  return null;
}

export function getRolePermissionsForRoleId(roleId: string): RolePermissions | null {
  const role = getSystemRoleById(roleId);
  return role ? role.permissions : null;
}


