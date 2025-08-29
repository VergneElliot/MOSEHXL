/**
 * User Management Types and Interfaces
 * Centralized type definitions for user management routes
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';
import { UserInvitationService } from '../../services/userInvitationService';
import { EnvironmentConfig } from '../../config/environment';

/**
 * Extended request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    establishment_id: string | undefined;
    is_admin: boolean;
  };
}

/**
 * Route handler type
 */
export type RouteHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Establishment invitation data
 */
export interface EstablishmentInvitationData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan?: string;
}

/**
 * User invitation data
 */
export interface UserInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  establishmentId: string;
}

/**
 * Invitation acceptance data
 */
export interface InvitationAcceptanceData {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
  businessInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

/**
 * API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * User filter parameters
 */
export interface UserFilterParams extends PaginationParams {
  role?: string;
  status?: 'active' | 'inactive';
  establishmentId?: string;
  search?: string;
}

/**
 * Invitation filter parameters
 */
export interface InvitationFilterParams extends PaginationParams {
  status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
  establishmentId?: string;
  role?: string;
}

/**
 * User update data
 */
export interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

/**
 * Role permissions
 */
export interface RolePermissions {
  canManageUsers: boolean;
  canManageEstablishment: boolean;
  canViewReports: boolean;
  canManageInventory: boolean;
  canProcessOrders: boolean;
  canManageSettings: boolean;
}

/**
 * Role definition
 */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: RolePermissions;
  isSystemRole: boolean;
  establishmentId?: string;
}

/**
 * Team member data
 */
export interface TeamMember {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin?: Date;
  createdAt: Date;
  permissions: RolePermissions;
}

/**
 * Team statistics
 */
export interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
  roleDistribution: Record<string, number>;
}

/**
 * Email test result
 */
export interface EmailTestResult {
  success: boolean;
  message: string;
  details?: {
    provider: string;
    configuration: string;
    testTimestamp: Date;
  };
}

/**
 * Service initialization interface
 */
export interface ServiceInitialization {
  userInvitationService: UserInvitationService;
  logger: Logger;
  config: EnvironmentConfig;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  user_id: string;
  action_type: string;
  action_details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Route configuration
 */
export interface RouteConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  middleware: any[];
  handler: RouteHandler;
  description: string;
}

/**
 * Route group configuration
 */
export interface RouteGroup {
  prefix: string;
  routes: RouteConfig[];
  middleware?: any[];
}

