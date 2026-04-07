/**
 * Role Operations
 * CRUD operations for role management
 */

import { Response, NextFunction } from 'express';
import { Logger } from '../../../utils/logger';
import { Role } from '../types';
import {
  RoleRequest,
  RolesListResponse,
  SingleRoleResponse,
  RoleOperationResponse
} from './types';
import { RoleValidator } from './RoleValidator';
import { RoleAuditLogger } from './RoleAuditLogger';
import { getSystemRoles, getSystemRoleById } from './rolePermissions';
import {
  fetchCustomRoles,
  fetchCustomRoleById,
  deactivateCustomRole,
  countUsersWithRole,
  isSystemRoleId
} from './roleQueries';

/**
 * Role CRUD operations
 */
export class RoleOperations {
  private static logger = Logger.getInstance();

  /**
   * Get all roles for establishment
   */
  public static async getAllRoles(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const context = RoleValidator.createOperationContext(req);
      
      // Validate establishment ID
      const establishmentValidation = RoleValidator.validateEstablishmentId(req);
      if (!establishmentValidation.isValid) {
        res.status(400).json({
          success: false,
          message: establishmentValidation.errors[0]
        });
        return;
      }

      const { establishmentId } = establishmentValidation.data!;

      // Fetch roles
      const customRoles = await fetchCustomRoles(establishmentId);
      const systemRoles = getSystemRoles();
      const allRoles = [...systemRoles, ...customRoles];

      // Log the action
      await RoleAuditLogger.logViewRoles(context, allRoles.length);

      const response: RolesListResponse = {
        success: true,
        data: allRoles,
        count: allRoles.length
      };

      res.json(response);
    } catch (error) {
      this.logger.error(
        'Failed to get roles',
        { 
          error: error as Error,
          userId: req.user?.id 
        },
        'ROLE_OPERATIONS'
      );
      next(error);
    }
  }

  /**
   * Get specific role details
   */
  public static async getRoleDetails(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { roleId } = req.params;
      const context = RoleValidator.createOperationContext(req);

      // Validate role ID
      const roleIdValidation = RoleValidator.validateRoleId(roleId!);
      if (!roleIdValidation.isValid) {
        res.status(400).json({
          success: false,
          message: roleIdValidation.errors[0]
        });
        return;
      }

      let role: Role | null = null;

      // Check if it's a system role
      if (isSystemRoleId(roleId!)) {
        role = getSystemRoleById(roleId!);
      } else {
        // Handle custom roles - need establishment ID
        const establishmentValidation = RoleValidator.validateEstablishmentId(req);
        if (!establishmentValidation.isValid) {
          res.status(400).json({
            success: false,
            message: 'Establishment ID required for custom roles'
          });
          return;
        }

        const { establishmentId } = establishmentValidation.data!;
        
        role = await fetchCustomRoleById(roleId!, establishmentId);
        
        if (role) {
          // Validate access to this establishment's role
          const accessValidation = RoleValidator.validateAccess(req, role.establishmentId || '');
          if (!accessValidation.isValid) {
            await RoleAuditLogger.logAccessDenied(
              context,
              'get_role',
              accessValidation.errors[0],
              roleId
            );
            res.status(403).json({
              success: false,
              message: accessValidation.errors[0]
            });
            return;
          }
        }
      }

      if (!role) {
        res.status(404).json({
          success: false,
          message: 'Role not found'
        });
        return;
      }

      // Log the action
      await RoleAuditLogger.logViewRoles(context, 1);

      const response: SingleRoleResponse = {
        success: true,
        data: role
      };

      res.json(response);
    } catch (error) {
      this.logger.error(
        'Failed to get role details',
        { 
          error: error as Error,
          roleId: req.params.roleId, 
          userId: req.user?.id 
        },
        'ROLE_OPERATIONS'
      );
      next(error);
    }
  }

  /**
   * Delete role (soft delete)
   */
  public static async deleteRole(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { roleId } = req.params;
      const context = RoleValidator.createOperationContext(req);

      // Validate role ID
      const roleIdValidation = RoleValidator.validateRoleId(roleId!);
      if (!roleIdValidation.isValid) {
        res.status(400).json({
          success: false,
          message: roleIdValidation.errors[0]
        });
        return;
      }

      // Validate establishment ID
      const establishmentValidation = RoleValidator.validateEstablishmentId(req);
      if (!establishmentValidation.isValid) {
        res.status(400).json({
          success: false,
          message: establishmentValidation.errors[0]
        });
        return;
      }

      const { establishmentId } = establishmentValidation.data!;

      // Validate it's not a system role
      if (isSystemRoleId(roleId!)) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete system roles'
        });
        return;
      }

      // Get the role
      const role = await fetchCustomRoleById(roleId!, establishmentId);

      // Validate deletion
      const deletionValidation = await RoleValidator.validateRoleDeletion(roleId!, role);
      if (!deletionValidation.isValid) {
        res.status(400).json({
          success: false,
          message: deletionValidation.errors[0]
        });
        return;
      }

      if (!role) {
        res.status(404).json({
          success: false,
          message: 'Role not found'
        });
        return;
      }

      // Validate access
      const accessValidation = RoleValidator.validateAccess(req, role.establishment_id);
      if (!accessValidation.isValid) {
        await RoleAuditLogger.logAccessDenied(
          context,
          'delete_role',
          accessValidation.errors[0],
          roleId
        );
        res.status(403).json({
          success: false,
          message: accessValidation.errors[0]
        });
        return;
      }

      // Check if role is in use
      const roleUserCount = await countUsersWithRole(roleId!, role.establishment_id);
      if (roleUserCount > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete role that is currently assigned to users'
        });
        return;
      }

      // Delete role (soft delete)
      await deactivateCustomRole(roleId!);

      // Log the deletion
      await RoleAuditLogger.logDeleteRole(context, {
        roleId: roleId!,
        roleName: role.name
      });

      const response: RoleOperationResponse = {
        success: true,
        message: 'Role deleted successfully'
      };

      res.json(response);
    } catch (error) {
      this.logger.error(
        'Failed to delete custom role',
        { 
          error: error as Error,
          roleId: req.params.roleId, 
          userId: req.user?.id 
        },
        'ROLE_OPERATIONS'
      );
      next(error);
    }
  }
}
