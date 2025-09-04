/**
 * Role Routes Types
 * Type definitions for role route handlers and operations
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, Role, RolePermissions } from '../types';

/**
 * Extended authenticated request for role operations
 */
export interface RoleRequest<T = any> extends AuthenticatedRequest {
  params: {
    roleId?: string;
  };
  query: {
    establishmentId?: string;
    permission?: string;
  };
  body: T;
}

/**
 * Role operation context
 */
export interface RoleOperationContext {
  userId: number;
  establishmentId: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Create role request body
 */
export interface CreateRoleRequest {
  name: string;
  description: string;
  permissions: RolePermissions;
  establishmentId?: string;
}

/**
 * Update role request body
 */
export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: RolePermissions;
}

/**
 * Role creation data
 */
export interface RoleCreationData {
  establishmentId: string;
  name: string;
  description: string;
  permissions: RolePermissions;
  createdBy: number;
}

/**
 * Role update data
 */
export interface RoleUpdateData {
  name?: string;
  description?: string;
  permissions?: RolePermissions;
}

/**
 * Role validation result
 */
export interface RoleValidationResult {
  isValid: boolean;
  errors: string[];
  data?: any;
}

/**
 * Route handler type
 */
export type RoleRouteHandler = (
  req: RoleRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Role response data
 */
export interface RoleResponseData {
  id: string;
  name: string;
  description: string;
  permissions: RolePermissions;
  isSystemRole: boolean;
  establishmentId?: string;
}

/**
 * Roles list response
 */
export interface RolesListResponse {
  success: true;
  data: Role[];
  count: number;
}

/**
 * Single role response
 */
export interface SingleRoleResponse {
  success: true;
  data: RoleResponseData;
}

/**
 * Role permissions response
 */
export interface RolePermissionsResponse {
  success: true;
  data: {
    roleId: string;
    permissions: RolePermissions;
  };
}

/**
 * Role operation response
 */
export interface RoleOperationResponse {
  success: boolean;
  message: string;
  data?: RoleResponseData;
}

/**
 * Role audit log data
 */
export interface RoleAuditLogData {
  action: 'view_roles' | 'view_role_details' | 'create_role' | 'update_role' | 'delete_role';
  roleId?: string;
  roleName?: string;
  establishmentId: string;
  details?: Record<string, any>;
}
