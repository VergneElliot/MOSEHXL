/**
 * Role Controller
 * Handles business logic for role management operations
 */

import { Response, NextFunction } from 'express';
import { Logger } from '../../../utils/logger';
import { Role, RolePermissions } from '../types';
import {
  RoleRequest,
  RolesListResponse,
  SingleRoleResponse,
  RolePermissionsResponse,
  RoleOperationResponse,
  RoleResponseData
} from './types';
import { RoleValidator } from './RoleValidator';
import { RoleAuditLogger } from './RoleAuditLogger';
import {
  getSystemRoles,
  getSystemRoleById,
  isSystemRoleId,
  getRolePermissionsForRoleId,
  fetchCustomRoles,
  fetchCustomRoleById,
  insertCustomRole,
  updateCustomRole,
  deactivateCustomRole,
  countUsersWithRole
} from '../roles';

/**
 * Role management controller
 */
export class RoleController {
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
        error as Error,
        { userId: req.user?.id },
        'ROLE_CONTROLLER'
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

      let role: Role;

      // Check if it's a system role
      if (isSystemRoleId(roleId!)) {
        const systemRole = getSystemRoleById(roleId!);
        if (!systemRole) {
          res.status(404).json({
            success: false,
            message: 'Role not found'
          });
          return;
        }
        role = systemRole;
      } else {
        // Handle custom roles
        const establishmentValidation = RoleValidator.validateEstablishmentId(req);
        if (!establishmentValidation.isValid) {
          res.status(400).json({
            success: false,
            message: 'Establishment ID required for custom roles'
          });
          return;
        }

        const { establishmentId } = establishmentValidation.data!;
        const roleRow = await fetchCustomRoleById(roleId!, establishmentId);

        if (!roleRow) {
          res.status(404).json({
            success: false,
            message: 'Role not found'
          });
          return;
        }

        role = {
          id: roleRow.id,
          name: roleRow.name,
          description: roleRow.description,
          permissions: roleRow.permissions,
          isSystemRole: false,
          establishmentId
        };
      }

      // Log the action
      await RoleAuditLogger.logViewRoleDetails(context, roleId!);

      const response: SingleRoleResponse = {
        success: true,
        data: role as RoleResponseData
      };

      res.json(response);
    } catch (error) {
      this.logger.error(
        'Failed to get role details',
        error as Error,
        { roleId: req.params.roleId, userId: req.user?.id },
        'ROLE_CONTROLLER'
      );
      next(error);
    }
  }

  /**
   * Create custom role
   */
  public static async createRole(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const context = RoleValidator.createOperationContext(req);

      // Validate creation data
      const validation = await RoleValidator.validateRoleCreation(req);
      if (!validation.isValid) {
        await RoleAuditLogger.logValidationError(
          context,
          'create_role',
          validation.errors,
          req.body
        );
        res.status(400).json({
          success: false,
          message: validation.errors.join('; ')
        });
        return;
      }

      const { name, description, permissions, establishmentId } = validation.data!;

      // Validate access
      const accessValidation = RoleValidator.validateAccess(req, establishmentId);
      if (!accessValidation.isValid) {
        await RoleAuditLogger.logAccessDenied(
          context,
          'create_role',
          accessValidation.errors[0],
          establishmentId
        );
        res.status(403).json({
          success: false,
          message: accessValidation.errors[0]
        });
        return;
      }

      // Create role
      const roleId = await insertCustomRole({
        establishmentId,
        name,
        description,
        permissions,
        createdBy: context.userId
      });

      // Log the creation
      await RoleAuditLogger.logCreateRole(context, {
        roleId,
        roleName: name,
        permissions
      });

      const responseData: RoleResponseData = {
        id: roleId,
        name,
        description,
        permissions,
        isSystemRole: false,
        establishmentId
      };

      const response: RoleOperationResponse = {
        success: true,
        message: 'Custom role created successfully',
        data: responseData
      };

      res.status(201).json(response);
    } catch (error) {
      this.logger.error(
        'Failed to create custom role',
        error as Error,
        { roleData: req.body, userId: req.user?.id },
        'ROLE_CONTROLLER'
      );
      next(error);
    }
  }

  /**
   * Update custom role
   */
  public static async updateRole(
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

      // Check if it's a system role
      const systemRoleValidation = RoleValidator.validateSystemRoleModification(roleId!);
      if (!systemRoleValidation.isValid) {
        res.status(400).json({
          success: false,
          message: systemRoleValidation.errors[0]
        });
        return;
      }

      // Get current role
      const establishmentId = req.query.establishmentId as string || req.user!.establishment_id;
      const currentRole = await fetchCustomRoleById(roleId!, establishmentId);
      
      if (!currentRole) {
        res.status(404).json({
          success: false,
          message: 'Role not found'
        });
        return;
      }

      // Validate access
      const accessValidation = RoleValidator.validateAccess(req, currentRole.establishment_id);
      if (!accessValidation.isValid) {
        await RoleAuditLogger.logAccessDenied(
          context,
          'update_role',
          accessValidation.errors[0],
          roleId
        );
        res.status(403).json({
          success: false,
          message: accessValidation.errors[0]
        });
        return;
      }

      // Validate update data
      const validation = await RoleValidator.validateRoleUpdate(req, currentRole);
      if (!validation.isValid) {
        await RoleAuditLogger.logValidationError(
          context,
          'update_role',
          validation.errors,
          req.body
        );
        res.status(400).json({
          success: false,
          message: validation.errors.join('; ')
        });
        return;
      }

      const updateData = validation.data!;

      // Update role
      const updatedRole = await updateCustomRole(roleId!, updateData);

      // Log the update
      await RoleAuditLogger.logUpdateRole(context, {
        roleId: roleId!,
        updates: updateData
      });

      const responseData: RoleResponseData = {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        permissions: updatedRole.permissions,
        isSystemRole: false,
        establishmentId: updatedRole.establishment_id
      };

      const response: RoleOperationResponse = {
        success: true,
        message: 'Role updated successfully',
        data: responseData
      };

      res.json(response);
    } catch (error) {
      this.logger.error(
        'Failed to update custom role',
        error as Error,
        { roleId: req.params.roleId, updates: req.body, userId: req.user?.id },
        'ROLE_CONTROLLER'
      );
      next(error);
    }
  }

  /**
   * Delete custom role
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

      // Get role details
      const establishmentId = req.query.establishmentId as string || req.user!.establishment_id;
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
        error as Error,
        { roleId: req.params.roleId, userId: req.user?.id },
        'ROLE_CONTROLLER'
      );
      next(error);
    }
  }

  /**
   * Get role permissions
   */
  public static async getRolePermissions(
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

      let permissions: RolePermissions;
      let isSystemRole = false;

      // Check if it's a system role
      if (isSystemRoleId(roleId!)) {
        isSystemRole = true;
        permissions = getRolePermissionsForRoleId(roleId!)!;
      } else {
        // Handle custom roles
        const establishmentValidation = RoleValidator.validateEstablishmentId(req);
        if (!establishmentValidation.isValid) {
          res.status(400).json({
            success: false,
            message: 'Establishment ID required for custom roles'
          });
          return;
        }

        const { establishmentId } = establishmentValidation.data!;
        const roleRow = await fetchCustomRoleById(roleId!, establishmentId);
        
        if (!roleRow || roleRow.is_active === false) {
          res.status(404).json({
            success: false,
            message: 'Role not found'
          });
          return;
        }
        
        permissions = roleRow.permissions as RolePermissions;
      }

      // Log permission access
      await RoleAuditLogger.logPermissionAccess(context, roleId!, isSystemRole);

      const response: RolePermissionsResponse = {
        success: true,
        data: {
          roleId: roleId!,
          permissions
        }
      };

      res.json(response);
    } catch (error) {
      this.logger.error(
        'Failed to get role permissions',
        error as Error,
        { roleId: req.params.roleId, userId: req.user?.id },
        'ROLE_CONTROLLER'
      );
      next(error);
    }
  }
}
