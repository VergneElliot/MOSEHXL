/**
 * Role Audit Logger
 * Handles audit logging for all role-related operations
 */

import { Logger } from '../../../utils/logger';
import { RolePermissions } from '../types';
import { RoleAuditLogData, RoleOperationContext } from './types';
import {
  logViewRoles as logViewRolesOriginal,
  logViewRoleDetails as logViewRoleDetailsOriginal,
  logCreateCustomRole as logCreateCustomRoleOriginal,
  logUpdateCustomRole as logUpdateCustomRoleOriginal,
  logDeleteCustomRole as logDeleteCustomRoleOriginal
} from '../roles';

/**
 * Role audit logging service
 */
export class RoleAuditLogger {
  private static logger = Logger.getInstance();

  /**
   * Log role viewing action
   */
  public static async logViewRoles(
    context: RoleOperationContext,
    rolesCount: number
  ): Promise<void> {
    try {
      await logViewRolesOriginal(
        context.userId,
        context.establishmentId,
        rolesCount,
        context.ipAddress,
        context.userAgent
      );

      this.logger.info(
        'Role viewing logged',
        { 
          userId: context.userId, 
          establishmentId: context.establishmentId,
          rolesCount 
        },
        'ROLE_AUDIT_LOGGER'
      );
    } catch (error) {
      this.logger.error(
        'Failed to log role viewing',
        error as Error,
        { context, rolesCount },
        'ROLE_AUDIT_LOGGER'
      );
    }
  }

  /**
   * Log role details viewing action
   */
  public static async logViewRoleDetails(
    context: RoleOperationContext,
    roleId: string
  ): Promise<void> {
    try {
      await logViewRoleDetailsOriginal(
        context.userId,
        roleId,
        context.establishmentId,
        context.ipAddress,
        context.userAgent
      );

      this.logger.info(
        'Role details viewing logged',
        { 
          userId: context.userId, 
          establishmentId: context.establishmentId,
          roleId 
        },
        'ROLE_AUDIT_LOGGER'
      );
    } catch (error) {
      this.logger.error(
        'Failed to log role details viewing',
        error as Error,
        { context, roleId },
        'ROLE_AUDIT_LOGGER'
      );
    }
  }

  /**
   * Log role creation action
   */
  public static async logCreateRole(
    context: RoleOperationContext,
    roleData: {
      roleId: string;
      roleName: string;
      permissions: RolePermissions;
    }
  ): Promise<void> {
    try {
      await logCreateCustomRoleOriginal(
        context.userId,
        {
          roleId: roleData.roleId,
          roleName: roleData.roleName,
          establishmentId: context.establishmentId,
          permissions: roleData.permissions
        },
        context.ipAddress,
        context.userAgent
      );

      this.logger.info(
        'Role creation logged',
        { 
          userId: context.userId, 
          establishmentId: context.establishmentId,
          roleId: roleData.roleId,
          roleName: roleData.roleName
        },
        'ROLE_AUDIT_LOGGER'
      );
    } catch (error) {
      this.logger.error(
        'Failed to log role creation',
        error as Error,
        { context, roleData },
        'ROLE_AUDIT_LOGGER'
      );
    }
  }

  /**
   * Log role update action
   */
  public static async logUpdateRole(
    context: RoleOperationContext,
    roleData: {
      roleId: string;
      updates: {
        name?: string;
        description?: string;
        permissions?: RolePermissions;
      };
    }
  ): Promise<void> {
    try {
      await logUpdateCustomRoleOriginal(
        context.userId,
        {
          roleId: roleData.roleId,
          updates: roleData.updates,
          establishmentId: context.establishmentId
        },
        context.ipAddress,
        context.userAgent
      );

      this.logger.info(
        'Role update logged',
        { 
          userId: context.userId, 
          establishmentId: context.establishmentId,
          roleId: roleData.roleId,
          updates: Object.keys(roleData.updates)
        },
        'ROLE_AUDIT_LOGGER'
      );
    } catch (error) {
      this.logger.error(
        'Failed to log role update',
        error as Error,
        { context, roleData },
        'ROLE_AUDIT_LOGGER'
      );
    }
  }

  /**
   * Log role deletion action
   */
  public static async logDeleteRole(
    context: RoleOperationContext,
    roleData: {
      roleId: string;
      roleName: string;
    }
  ): Promise<void> {
    try {
      await logDeleteCustomRoleOriginal(
        context.userId,
        {
          roleId: roleData.roleId,
          roleName: roleData.roleName,
          establishmentId: context.establishmentId
        },
        context.ipAddress,
        context.userAgent
      );

      this.logger.info(
        'Role deletion logged',
        { 
          userId: context.userId, 
          establishmentId: context.establishmentId,
          roleId: roleData.roleId,
          roleName: roleData.roleName
        },
        'ROLE_AUDIT_LOGGER'
      );
    } catch (error) {
      this.logger.error(
        'Failed to log role deletion',
        error as Error,
        { context, roleData },
        'ROLE_AUDIT_LOGGER'
      );
    }
  }

  /**
   * Log role permission access
   */
  public static async logPermissionAccess(
    context: RoleOperationContext,
    roleId: string,
    isSystemRole: boolean
  ): Promise<void> {
    try {
      this.logger.debug(
        'Role permission access',
        { 
          userId: context.userId, 
          establishmentId: context.establishmentId,
          roleId,
          isSystemRole,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        },
        'ROLE_AUDIT_LOGGER'
      );
    } catch (error) {
      this.logger.error(
        'Failed to log permission access',
        error as Error,
        { context, roleId, isSystemRole },
        'ROLE_AUDIT_LOGGER'
      );
    }
  }

  /**
   * Log access denied events
   */
  public static async logAccessDenied(
    context: RoleOperationContext,
    action: string,
    reason: string,
    targetResource?: string
  ): Promise<void> {
    try {
      this.logger.warn(
        'Role operation access denied',
        { 
          userId: context.userId, 
          establishmentId: context.establishmentId,
          action,
          reason,
          targetResource,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        },
        'ROLE_AUDIT_LOGGER'
      );
    } catch (error) {
      this.logger.error(
        'Failed to log access denied event',
        error as Error,
        { context, action, reason, targetResource },
        'ROLE_AUDIT_LOGGER'
      );
    }
  }

  /**
   * Log validation errors
   */
  public static async logValidationError(
    context: RoleOperationContext,
    action: string,
    errors: string[],
    requestData?: any
  ): Promise<void> {
    try {
      this.logger.warn(
        'Role operation validation failed',
        { 
          userId: context.userId, 
          establishmentId: context.establishmentId,
          action,
          errors,
          requestData: requestData ? { ...requestData, password: '[REDACTED]' } : undefined,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        },
        'ROLE_AUDIT_LOGGER'
      );
    } catch (error) {
      this.logger.error(
        'Failed to log validation error',
        error as Error,
        { context, action, errors },
        'ROLE_AUDIT_LOGGER'
      );
    }
  }
}
