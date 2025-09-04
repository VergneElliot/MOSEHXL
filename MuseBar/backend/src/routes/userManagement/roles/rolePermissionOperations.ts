/**
 * Role Permission Operations
 * Handle role permission retrieval and management
 */

import { Response, NextFunction } from 'express';
import { Logger } from '../../../utils/logger';
import { RolePermissions } from '../types';
import {
  RoleRequest,
  RolePermissionsResponse
} from './types';
import { RoleValidator } from './RoleValidator';
import { RoleAuditLogger } from './RoleAuditLogger';
import { getRolePermissionsForRoleId } from './rolePermissions';
import {
  isSystemRoleId,
  fetchCustomRoleById
} from './roleQueries';

/**
 * Role permission operations
 */
export class RolePermissionOperations {
  private static logger = Logger.getInstance();

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
        'ROLE_PERMISSION_OPERATIONS'
      );
      next(error);
    }
  }

  /**
   * Check if user has specific permission
   */
  public static async checkPermission(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { roleId } = req.params;
      const { permission } = req.query;
      const context = RoleValidator.createOperationContext(req);

      // Validate inputs
      const roleIdValidation = RoleValidator.validateRoleId(roleId!);
      if (!roleIdValidation.isValid) {
        res.status(400).json({
          success: false,
          message: roleIdValidation.errors[0]
        });
        return;
      }

      if (!permission || typeof permission !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Permission parameter is required'
        });
        return;
      }

      let permissions: RolePermissions;
      let isSystemRole = false;

      // Get role permissions
      if (isSystemRoleId(roleId!)) {
        isSystemRole = true;
        permissions = getRolePermissionsForRoleId(roleId!)!;
      } else {
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

      // Check if the permission exists and is granted
      const hasPermission = this.checkPermissionExists(permissions, permission);

      // Log permission check
      await RoleAuditLogger.logPermissionAccess(context, roleId!, false);

      res.json({
        success: true,
        data: {
          roleId: roleId!,
          permission,
          hasPermission
        }
      });
    } catch (error) {
      this.logger.error(
        'Failed to check permission',
        error as Error,
        { roleId: req.params.roleId, userId: req.user?.id },
        'ROLE_PERMISSION_OPERATIONS'
      );
      next(error);
    }
  }

  /**
   * Helper method to check if a permission exists in the permissions object
   */
  private static checkPermissionExists(permissions: RolePermissions, permissionPath: string): boolean {
    const parts = permissionPath.split('.');
    let current: any = permissions;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return false;
      }
    }

    return current === true;
  }

  /**
   * Get all available permissions structure
   */
  public static async getAvailablePermissions(
    req: RoleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const context = RoleValidator.createOperationContext(req);

      // Define the complete permissions structure
      const availablePermissions = {
        pos: {
          access: 'Access POS system',
          view_products: 'View products',
          manage_orders: 'Manage orders',
          process_payments: 'Process payments',
          print_receipts: 'Print receipts',
          apply_discounts: 'Apply discounts'
        },
        inventory: {
          view: 'View inventory',
          add_products: 'Add new products',
          edit_products: 'Edit existing products',
          delete_products: 'Delete products',
          manage_categories: 'Manage categories',
          view_stock: 'View stock levels'
        },
        reports: {
          view: 'View reports',
          sales_reports: 'Access sales reports',
          inventory_reports: 'Access inventory reports',
          user_reports: 'Access user reports',
          export_data: 'Export report data'
        },
        users: {
          view: 'View users',
          create: 'Create new users',
          edit: 'Edit existing users',
          delete: 'Delete users',
          manage_roles: 'Manage user roles',
          view_activities: 'View user activities'
        },
        settings: {
          view: 'View settings',
          edit_business: 'Edit business settings',
          edit_payment: 'Edit payment settings',
          edit_printer: 'Edit printer settings',
          manage_happy_hour: 'Manage happy hour settings'
        },
        legal: {
          view: 'View legal compliance',
          generate_reports: 'Generate legal reports',
          manage_closures: 'Manage daily closures',
          export_legal_data: 'Export legal compliance data'
        }
      };

      // Log permissions structure access
      await RoleAuditLogger.logPermissionAccess(context, 'system', true);

      res.json({
        success: true,
        data: availablePermissions
      });
    } catch (error) {
      this.logger.error(
        'Failed to get available permissions',
        error as Error,
        { userId: req.user?.id },
        'ROLE_PERMISSION_OPERATIONS'
      );
      next(error);
    }
  }
}
