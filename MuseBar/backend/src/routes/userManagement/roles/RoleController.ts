/**
 * Role Controller
 * REFACTORED: Main role controller that delegates to specialized modules
 * The original 548-line controller has been modularized into:
 * - roleOperations.ts (CRUD operations)
 * - roleMutations.ts (Create/Update operations)
 * - rolePermissionOperations.ts (Permission management)
 * - RoleController.ts (Main delegator)
 */

import { Response, NextFunction } from 'express';
import {
  RoleRequest,
  CreateRoleRequest,
  UpdateRoleRequest
} from './types';
import { RoleOperations } from './roleOperations';
import { RoleMutations } from './roleMutations';
import { RolePermissionOperations } from './rolePermissionOperations';

/**
 * Main role management controller - delegates to specialized modules
 */
export class RoleController {

  /**
   * Get all roles for establishment
   */
  public static async getAllRoles(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    return RoleOperations.getAllRoles(req, res, next);
  }

  /**
   * Get specific role details
   */
  public static async getRoleDetails(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    return RoleOperations.getRoleDetails(req, res, next);
  }

  /**
   * Create new custom role
   */
  public static async createRole(
    req: RoleRequest<CreateRoleRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    return RoleMutations.createRole(req, res, next);
  }

  /**
   * Update existing custom role
   */
  public static async updateRole(
    req: RoleRequest<UpdateRoleRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    return RoleMutations.updateRole(req, res, next);
  }

  /**
   * Delete role (soft delete)
   */
  public static async deleteRole(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    return RoleOperations.deleteRole(req, res, next);
  }

  /**
   * Get role permissions
   */
  public static async getRolePermissions(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    return RolePermissionOperations.getRolePermissions(req, res, next);
  }

  /**
   * Check specific permission for role
   */
  public static async checkPermission(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    return RolePermissionOperations.checkPermission(req, res, next);
  }

  /**
   * Get available permissions structure
   */
  public static async getAvailablePermissions(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    return RolePermissionOperations.getAvailablePermissions(req, res, next);
  }
}