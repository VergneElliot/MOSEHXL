/**
 * User Management Routes
 * Currently only mounts the invitation module (send-establishment-invitation,
 * password reset). User CRUD, team stats, and role management are handled by
 * the establishment-scoped routes in /api/auth/users (see auth.ts).
 */

export {
  default as createUserManagementRouter,
  initializeUserManagementRoutes,
  getUserManagementRouter,
  invitationRoutes,
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

import createUserManagementRouter from './userManagement/index';
export default createUserManagementRouter;