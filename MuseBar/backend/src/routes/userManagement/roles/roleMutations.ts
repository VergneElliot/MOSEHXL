/**
 * Role Mutations
 * Handle role creation and update operations
 */

import { Response, NextFunction } from 'express';
import { Logger } from '../../../utils/logger';
import { RolePermissions } from '../types';
import {
  RoleRequest,
  RoleOperationResponse,
  CreateRoleRequest,
  UpdateRoleRequest
} from './types';
import { RoleValidator } from './RoleValidator';
import { RoleAuditLogger } from './RoleAuditLogger';
import {
  isSystemRoleId,
  fetchCustomRoleById,
  insertCustomRole,
  updateCustomRole
} from './roleQueries';

/**
 * Role creation and update operations
 */
export class RoleMutations {
  private static logger = Logger.getInstance();

  /**
   * Create new custom role
   */
  public static async createRole(
    req: RoleRequest<CreateRoleRequest>,
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

      // Validate role creation data
      const validationResult = await RoleValidator.validateRoleCreation(req.body);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          message: validationResult.errors[0]
        });
        return;
      }

      const { name, description, permissions } = validationResult.data!;

      // Create the role
      const newRole = await insertCustomRole({
        name,
        description,
        permissions: permissions as RolePermissions,
        establishment_id: establishmentId,
        is_active: true
      });

      // Log the creation
      await RoleAuditLogger.logCreateRole(context, newRole);

      const response: RoleOperationResponse = {
        success: true,
        message: 'Role created successfully',
        data: newRole
      };

      res.status(201).json(response);
    } catch (error) {
      this.logger.error(
        'Failed to create custom role',
        { 
          error: error as Error,
          userId: req.user?.id 
        },
        'ROLE_MUTATIONS'
      );
      next(error);
    }
  }

  /**
   * Update existing custom role
   */
  public static async updateRole(
    req: RoleRequest<UpdateRoleRequest>,
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
          message: 'Cannot update system roles'
        });
        return;
      }

      // Get existing role
      const existingRole = await fetchCustomRoleById(roleId!, establishmentId);
      if (!existingRole) {
        res.status(404).json({
          success: false,
          message: 'Role not found'
        });
        return;
      }

      // Validate access
      const accessValidation = RoleValidator.validateAccess(req, existingRole.establishment_id);
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
      const validationResult = await RoleValidator.validateRoleUpdate(req.body, existingRole);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          message: validationResult.errors[0]
        });
        return;
      }

      const updateData = validationResult.data!;

      // Update the role
      const updatedRole = await updateCustomRole(roleId!, updateData);

      if (!updatedRole) {
        res.status(404).json({
          success: false,
          message: 'Role not found'
        });
        return;
      }

      // Log the update
      await RoleAuditLogger.logUpdateRole(context, existingRole, updatedRole);

      const response: RoleOperationResponse = {
        success: true,
        message: 'Role updated successfully',
        data: updatedRole
      };

      res.json(response);
    } catch (error) {
      this.logger.error(
        'Failed to update custom role',
        { 
          error: error as Error,
          roleId: req.params.roleId, 
          userId: req.user?.id 
        },
        'ROLE_MUTATIONS'
      );
      next(error);
    }
  }
}
