/**
 * Role Validator
 * Handles validation logic for role operations
 */

import { Logger } from '../../../utils/logger';
import { 
  RoleRequest, 
  RoleValidationResult, 
  RoleOperationContext,
  CreateRoleRequest,
  UpdateRoleRequest
} from './types';
import { 
  isSystemRoleId,
  checkRoleNameExists,
} from '../roles';

/**
 * Role validation service
 */
export class RoleValidator {
  private static logger = Logger.getInstance();

  /**
   * Validate role creation data
   */
  public static async validateRoleCreation(
    req: RoleRequest
  ): Promise<RoleValidationResult> {
    const errors: string[] = [];
    const { name, description, permissions, establishmentId } = req.body;

    // Required field validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Role name is required and must be a non-empty string');
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      errors.push('Role description is required and must be a non-empty string');
    }

    if (!establishmentId || typeof establishmentId !== 'string') {
      errors.push('Establishment ID is required');
    }

    if (!permissions || typeof permissions !== 'object') {
      errors.push('Permissions object is required');
    }

    // Validate permissions structure
    if (permissions) {
      const permissionErrors = this.validatePermissions(permissions);
      errors.push(...permissionErrors);
    }

    // Validate name length
    if (name && name.length > 100) {
      errors.push('Role name must be 100 characters or less');
    }

    // Validate description length
    if (description && description.length > 500) {
      errors.push('Role description must be 500 characters or less');
    }

    // Check if role name already exists
    if (name && establishmentId && errors.length === 0) {
      try {
        const exists = await checkRoleNameExists(name, establishmentId);
        if (exists) {
          errors.push('Role with this name already exists');
        }
      } catch (error) {
        this.logger.error(
          'Error checking role name existence',
          error as Error
        );
        errors.push('Error validating role name uniqueness');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? { name, description, permissions, establishmentId } : undefined
    };
  }

  /**
   * Validate role creation data from body
   */
  public static async validateRoleCreationData(
    data: CreateRoleRequest
  ): Promise<RoleValidationResult> {
    const errors: string[] = [];
    const { name, description, permissions, establishmentId } = data;

    // Required field validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Role name is required and must be a non-empty string');
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      errors.push('Role description is required and must be a non-empty string');
    }

    if (!establishmentId || typeof establishmentId !== 'string') {
      errors.push('Establishment ID is required');
    }

    if (!permissions || typeof permissions !== 'object') {
      errors.push('Permissions object is required');
    }

    // Validate permissions structure
    if (permissions) {
      const permissionErrors = this.validatePermissions(permissions);
      errors.push(...permissionErrors);
    }

    // Validate name length
    if (name && name.length > 100) {
      errors.push('Role name must be 100 characters or less');
    }

    // Validate description length
    if (description && description.length > 500) {
      errors.push('Role description must be 500 characters or less');
    }

    // Check if role name already exists
    if (name && establishmentId && errors.length === 0) {
      try {
        const exists = await checkRoleNameExists(name, establishmentId);
        if (exists) {
          errors.push('Role with this name already exists');
        }
      } catch (error) {
        this.logger.error(
          'Error checking role name existence',
          error as Error
        );
        errors.push('Error validating role name uniqueness');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? { name, description, permissions, establishmentId } : undefined
    };
  }

  /**
   * Validate role update data
   */
  public static async validateRoleUpdate(
    req: RoleRequest,
    currentRole: any
  ): Promise<RoleValidationResult> {
    const errors: string[] = [];
    const { name, description, permissions } = req.body;

    // Check if any updates are provided
    if (name === undefined && description === undefined && permissions === undefined) {
      errors.push('No updates provided');
      return { isValid: false, errors };
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Role name must be a non-empty string');
      } else if (name.length > 100) {
        errors.push('Role name must be 100 characters or less');
      } else if (name !== currentRole.name) {
        // Check if new name already exists
        try {
          const exists = await checkRoleNameExists(name, currentRole.establishment_id);
          if (exists) {
            errors.push('Role with this name already exists');
          }
        } catch (error) {
          this.logger.error(
            'Error checking role name existence during update',
            error as Error
          );
          errors.push('Error validating role name uniqueness');
        }
      }
    }

    // Validate description if provided
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        errors.push('Role description must be a non-empty string');
      } else if (description.length > 500) {
        errors.push('Role description must be 500 characters or less');
      }
    }

    // Validate permissions if provided
    if (permissions !== undefined) {
      if (typeof permissions !== 'object' || permissions === null) {
        errors.push('Permissions must be an object');
      } else {
        const permissionErrors = this.validatePermissions(permissions);
        errors.push(...permissionErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? { name, description, permissions } : undefined
    };
  }

  /**
   * Validate role update data from body
   */
  public static async validateRoleUpdateData(
    data: UpdateRoleRequest,
    currentRole: any
  ): Promise<RoleValidationResult> {
    const errors: string[] = [];
    const { name, description, permissions } = data;

    // Check if any updates are provided
    if (name === undefined && description === undefined && permissions === undefined) {
      errors.push('No updates provided');
      return { isValid: false, errors };
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Role name must be a non-empty string');
      } else if (name.length > 100) {
        errors.push('Role name must be 100 characters or less');
      } else if (name !== currentRole.name) {
        // Check if new name already exists
        try {
          const exists = await checkRoleNameExists(name, currentRole.establishment_id);
          if (exists) {
            errors.push('Role with this name already exists');
          }
        } catch (error) {
          this.logger.error(
            'Error checking role name existence during update',
            error as Error
          );
          errors.push('Error validating role name uniqueness');
        }
      }
    }

    // Validate description if provided
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        errors.push('Role description must be a non-empty string');
      } else if (description.length > 500) {
        errors.push('Role description must be 500 characters or less');
      }
    }

    // Validate permissions if provided
    if (permissions !== undefined) {
      if (typeof permissions !== 'object' || permissions === null) {
        errors.push('Permissions must be an object');
      } else {
        const permissionErrors = this.validatePermissions(permissions);
        errors.push(...permissionErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? { name, description, permissions } : undefined
    };
  }

  /**
   * Validate permissions object
   */
  private static validatePermissions(permissions: any): string[] {
    const errors: string[] = [];
    
    const requiredPermissions = [
      'canManageUsers',
      'canManageEstablishment',
      'canViewReports',
      'canManageInventory',
      'canProcessOrders',
      'canManageSettings'
    ];

    for (const permission of requiredPermissions) {
      if (!(permission in permissions)) {
        errors.push(`Missing required permission: ${permission}`);
      } else if (typeof permissions[permission] !== 'boolean') {
        errors.push(`Permission '${permission}' must be a boolean value`);
      }
    }

    // Check for unknown permissions
    const knownPermissions = new Set(requiredPermissions);
    for (const key in permissions) {
      if (!knownPermissions.has(key)) {
        errors.push(`Unknown permission: ${key}`);
      }
    }

    return errors;
  }

  /**
   * Validate access permissions
   */
  public static validateAccess(
    req: RoleRequest,
    targetEstablishmentId: string
  ): RoleValidationResult {
    const user = req.user!;
    const errors: string[] = [];

    // Admin users have access to all establishments
    if (user.is_admin) {
      return { isValid: true, errors: [] };
    }

    // Regular users can only access their own establishment
    if (user.establishment_id !== targetEstablishmentId) {
      errors.push('Access denied to this establishment');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate role ID parameter
   */
  public static validateRoleId(roleId: string): RoleValidationResult {
    const errors: string[] = [];

    if (!roleId || typeof roleId !== 'string' || roleId.trim().length === 0) {
      errors.push('Role ID is required and must be a non-empty string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate system role modification
   */
  public static validateSystemRoleModification(roleId: string): RoleValidationResult {
    const errors: string[] = [];

    if (isSystemRoleId(roleId)) {
      errors.push('Cannot modify system roles');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate role deletion
   */
  public static async validateRoleDeletion(
    roleId: string,
    roleData: any
  ): Promise<RoleValidationResult> {
    const errors: string[] = [];

    // Cannot delete system roles
    if (isSystemRoleId(roleId)) {
      errors.push('Cannot delete system roles');
      return { isValid: false, errors };
    }

    // Check if role exists
    if (!roleData) {
      errors.push('Role not found');
      return { isValid: false, errors };
    }

    // Additional validation could be added here
    // For example, checking if role has dependencies

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create operation context from request
   */
  public static createOperationContext(req: RoleRequest): RoleOperationContext {
    return {
      userId: req.user!.id,
      establishmentId: req.query.establishmentId as string || req.user!.establishment_id || '',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
      timestamp: new Date()
    };
  }

  /**
   * Validate establishment ID
   */
  public static validateEstablishmentId(
    req: RoleRequest,
    requireEstablishmentId: boolean = true
  ): RoleValidationResult {
    const errors: string[] = [];
    const establishmentId = req.query.establishmentId as string || req.user!.establishment_id;

    if (requireEstablishmentId && !establishmentId) {
      errors.push('Establishment ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: { establishmentId }
    };
  }
}
