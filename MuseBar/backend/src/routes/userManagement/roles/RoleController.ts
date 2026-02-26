/**
 * Role Controller
 * REFACTORED: Main role controller that delegates to specialized modules
 * The original 548-line controller has been modularized into:
 * - roleOperations.ts (CRUD operations)
 * - roleMutations.ts (Create/Update operations)
 * - rolePermissionOperations.ts (Permission management)
 * - RoleController.ts (Main delegator)
 */

import { Response, NextFunction, Request } from 'express';
import {
  RoleRequest,
  CreateRoleRequest,
  UpdateRoleRequest
} from './types';
import { RoleOperations } from './roleOperations';
import { RoleMutations } from './roleMutations';
import { RolePermissionOperations } from './rolePermissionOperations';

/**
 * Type guard to ensure request has required user properties
 */
function isRoleRequest(req: Request): req is RoleRequest {
  return req.user !== undefined && 
         typeof req.user.id === 'number' &&
         typeof req.user.email === 'string' &&
         typeof req.user.role === 'string' &&
         typeof req.user.is_admin === 'boolean';
}

/**
 * Main role management controller - delegates to specialized modules
 */
export class RoleController {

  /**
   * Get all roles for establishment
   */
  public static async getAllRoles(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (!isRoleRequest(req)) {
      res.status(400).json({ success: false, message: 'Invalid request type' });
      return;
    }
    return RoleOperations.getAllRoles(req, res, next);
  }

  /**
   * Get specific role details
   */
  public static async getRoleDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (!isRoleRequest(req)) {
      res.status(400).json({ success: false, message: 'Invalid request type' });
      return;
    }
    return RoleOperations.getRoleDetails(req, res, next);
  }

  /**
   * Create new custom role
   */
  public static async createRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (!isRoleRequest(req)) {
      res.status(400).json({ success: false, message: 'Invalid request type' });
      return;
    }
    return RoleMutations.createRole(req as RoleRequest<CreateRoleRequest>, res, next);
  }

  /**
   * Update existing custom role
   */
  public static async updateRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (!isRoleRequest(req)) {
      res.status(400).json({ success: false, message: 'Invalid request type' });
      return;
    }
    return RoleMutations.updateRole(req as RoleRequest<UpdateRoleRequest>, res, next);
  }

  /**
   * Delete role (soft delete)
   */
  public static async deleteRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (!isRoleRequest(req)) {
      res.status(400).json({ success: false, message: 'Invalid request type' });
      return;
    }
    return RoleOperations.deleteRole(req, res, next);
  }

  /**
   * Get role permissions
   */
  public static async getRolePermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (!isRoleRequest(req)) {
      res.status(400).json({ success: false, message: 'Invalid request type' });
      return;
    }
    return RolePermissionOperations.getRolePermissions(req, res, next);
  }

  /**
   * Check specific permission for role
   */
  public static async checkPermission(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (!isRoleRequest(req)) {
      res.status(400).json({ success: false, message: 'Invalid request type' });
      return;
    }
    return RolePermissionOperations.checkPermission(req, res, next);
  }

  /**
   * Get available permissions structure
   */
  public static async getAvailablePermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (!isRoleRequest(req)) {
      res.status(400).json({ success: false, message: 'Invalid request type' });
      return;
    }
    return RolePermissionOperations.getAvailablePermissions(req, res, next);
  }
}