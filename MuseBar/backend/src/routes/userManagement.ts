/**
 * Enhanced User Management Routes
 * REFACTORED: This service has been modularized into smaller, focused modules.
 * The original 566-line monolithic route file has been broken down into:
 * - invitationRoutes.ts (Invitation management)
 * - userRoutes.ts (Basic user CRUD)
 * - teamRoutes.ts (Team management)
 * - roleRoutes.ts (Role management)
 * - types.ts (Type definitions)
 * - index.ts (Main orchestrator)
 */

// Re-export the modular user management system for backward compatibility
export {
  default as createUserManagementRouter,
  initializeUserManagementRoutes,
  getUserManagementRouter,
  invitationRoutes,
  userRoutes,
  teamRoutes,
  roleRoutes,
  // Types
  type AuthenticatedRequest,
  type EstablishmentInvitationData,
  type UserInvitationData,
  type InvitationAcceptanceData,
  type ApiResponse,
  type PaginationParams,
  type UserFilterParams,
  type InvitationFilterParams,
  type UserUpdateData,
  type RolePermissions,
  type Role,
  type TeamMember,
  type TeamStats,
  type EmailTestResult,
  type ServiceInitialization,
  type AuditLogEntry,
  type ValidationError,
  type RouteConfig,
  type RouteGroup
} from './userManagement/index';

// Legacy export - create router with initialization
import createUserManagementRouter from './userManagement/index';
export default createUserManagementRouter;