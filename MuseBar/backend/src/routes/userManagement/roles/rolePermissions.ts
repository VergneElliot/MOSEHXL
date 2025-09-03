import { Role, RolePermissions } from '../types';

// System role definitions used across the application
export const DEFAULT_ROLES: Record<string, Role> = {
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
  return DEFAULT_ROLES[roleId] || null;
}

export function isSystemRoleId(roleId: string): boolean {
  return Boolean(DEFAULT_ROLES[roleId]);
}

export function getRolePermissionsForRoleId(roleId: string): RolePermissions | null {
  const role = getSystemRoleById(roleId);
  return role ? role.permissions : null;
}


