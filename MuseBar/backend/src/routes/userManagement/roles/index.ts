/**
 * Role Management Module Entry Point
 * Exports all role management components and maintains backward compatibility
 */

export { RoleController } from './RoleController';
export { RoleValidator } from './RoleValidator';
export { RoleAuditLogger } from './RoleAuditLogger';
export { roleRoutes, initializeRoleRoutes } from './RoleRoutes';
export * from './types';

// Default export for backward compatibility
export { roleRoutes as default } from './RoleRoutes';