/**
 * Role Routes - Legacy Entry Point
 * Re-exports modular role management components for backward compatibility
 */

// Re-export all components from the modular roles package
export { 
  RoleController,
  RoleValidator,
  RoleAuditLogger,
  roleRoutes,
  initializeRoleRoutes
} from './roles';

// Re-export types for backward compatibility
export type {
  RoleRequest,
  RoleOperationContext,
  RoleCreationData,
  RoleUpdateData,
  RoleValidationResult,
  RoleRouteHandler,
  RoleResponseData,
  RolesListResponse,
  SingleRoleResponse,
  RolePermissionsResponse,
  RoleOperationResponse,
  RoleAuditLogData
} from './roles/types';

// Default export for backward compatibility
export { roleRoutes as default } from './roles';

