/**
 * Role Management Module Entry Point
 * UPDATED: Exports all role management components including new modular structure
 * Maintains backward compatibility while providing access to specialized modules
 */

export { RoleController } from './RoleController';
export { RoleOperations } from './roleOperations';
export { RoleMutations } from './roleMutations';
export { RolePermissionOperations } from './rolePermissionOperations';
export { RoleValidator } from './RoleValidator';
export { RoleAuditLogger } from './RoleAuditLogger';
export { roleRoutes, initializeRoleRoutes } from './RoleRoutes';
export * from './types';

// Export role query functions
export { 
  isSystemRoleId,
  checkRoleNameExists,
  fetchCustomRoleById,
  fetchCustomRoles,
  insertCustomRole,
  updateCustomRole,
  deactivateCustomRole,
  countUsersWithRole
} from './roleQueries';

// Default export for backward compatibility
export { roleRoutes as default } from './RoleRoutes';