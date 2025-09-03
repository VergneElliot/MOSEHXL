/**
 * Role Routes - Role Management Operations
 * Handles role definitions, permissions, and role-based access control
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../auth';
import { validateBody, validateParams } from '../../middleware/validation';
import { Logger } from '../../utils/logger';
import {
  AuthenticatedRequest,
  Role,
  RolePermissions,
  ServiceInitialization
} from './types';
import {
  DEFAULT_ROLES,
  getSystemRoles,
  getSystemRoleById,
  isSystemRoleId,
  getRolePermissionsForRoleId,
  fetchCustomRoles,
  fetchCustomRoleById,
  checkRoleNameExists,
  insertCustomRole,
  updateCustomRole,
  deactivateCustomRole,
  countUsersWithRole,
  logViewRoles,
  logViewRoleDetails,
  logCreateCustomRole,
  logUpdateCustomRole,
  logDeleteCustomRole
} from './roles';

const router = express.Router();

// Service instances
let logger: Logger;

/**
 * Initialize role routes
 */
export function initializeRoleRoutes(services: ServiceInitialization): void {
  logger = services.logger;
}

// Default roles now sourced from roles module

/**
 * GET /roles
 * Get all available roles for establishment
 */
router.get('/roles', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const user = req.user!;
    const establishmentId = req.query.establishmentId as string || user.establishment_id;

    if (!establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'User must be associated with an establishment'
      });
    }

    const customRoles = await fetchCustomRoles(establishmentId);
    const systemRoles = getSystemRoles();
    const allRoles = [...systemRoles, ...customRoles];

    await logViewRoles(user.id, establishmentId, allRoles.length, req.ip, req.headers['user-agent'] as string | undefined);

    res.json({
      success: true,
      data: allRoles,
      count: allRoles.length
    });
  } catch (error) {
    logger?.error(
      'Failed to get roles',
      error as Error,
      { userId: req.user?.id },
      'ROLE_ROUTES'
    );
    next(error);
  }
});

/**
 * GET /role/:roleId
 * Get specific role details
 */
router.get('/role/:roleId', requireAuth, validateParams([
  { param: 'roleId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
]), async (req: any, res: any, next: any) => {
  try {
    const { roleId } = req.params;
    const user = req.user!;
    const establishmentId = req.query.establishmentId as string || user.establishment_id;

    // Check if it's a system role
    if (isSystemRoleId(roleId)) {
      const role = getSystemRoleById(roleId)!;
      return res.json({
        success: true,
        data: role
      });
    }

    // Check custom roles
    if (!establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'Establishment ID required for custom roles'
      });
    }

    const roleRow = await fetchCustomRoleById(roleId, establishmentId);

    if (!roleRow) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    const role: Role = {
      id: roleRow.id,
      name: roleRow.name,
      description: roleRow.description,
      permissions: roleRow.permissions,
      isSystemRole: false,
      establishmentId
    };

    await logViewRoleDetails(user.id, roleId, establishmentId, req.ip, req.headers['user-agent'] as string | undefined);

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    logger?.error(
      'Failed to get role details',
      error as Error,
      { roleId: req.params.roleId, userId: req.user?.id },
      'ROLE_ROUTES'
    );
    next(error);
  }
});

/**
 * POST /role
 * Create custom role (Admin only)
 */
router.post('/role', requireAuth, requireAdmin, validateBody([
  { field: 'name', required: true },
  { field: 'description', required: true },
  { field: 'permissions', required: true },
  { field: 'establishmentId', required: true }
]), async (req: any, res: any, next: any) => {
  try {
    const {
      name,
      description,
      permissions,
      establishmentId
    }: {
      name: string;
      description: string;
      permissions: RolePermissions;
      establishmentId: string;
    } = req.body;
    const user = req.user!;

    // Validate access
    if (!user.is_admin && user.establishment_id !== establishmentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this establishment'
      });
    }

    // Validate permissions object
    const requiredPermissions = [
      'canManageUsers',
      'canManageEstablishment',
      'canViewReports',
      'canManageInventory',
      'canProcessOrders',
      'canManageSettings'
    ];

    for (const permission of requiredPermissions) {
      if (typeof permissions[permission as keyof RolePermissions] !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: `Permission '${permission}' must be a boolean value`
        });
      }
    }

    // Check if role name already exists
    const exists = await checkRoleNameExists(name, establishmentId);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }

    // Create role
    const roleId = await insertCustomRole({
      establishmentId,
      name,
      description,
      permissions,
      createdBy: user.id
    });

    await logCreateCustomRole(user.id, { roleId, roleName: name, establishmentId, permissions }, req.ip, req.headers['user-agent'] as string | undefined);

    res.status(201).json({
      success: true,
      message: 'Custom role created successfully',
      data: {
        id: roleId,
        name,
        description,
        permissions,
        isSystemRole: false,
        establishmentId
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to create custom role',
      error as Error,
      { roleData: req.body, userId: req.user?.id },
      'ROLE_ROUTES'
    );
    next(error);
  }
});

/**
 * PUT /role/:roleId
 * Update custom role (Admin only)
 */
router.put('/role/:roleId', requireAuth, requireAdmin, validateParams([
  { param: 'roleId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
]), validateBody([
  { field: 'name', required: false },
  { field: 'description', required: false },
  { field: 'permissions', required: false }
]), async (req: any, res: any, next: any) => {
  try {
    const { roleId } = req.params;
    const { name, description, permissions } = req.body;
    const user = req.user!;

    // Cannot modify system roles
    if (isSystemRoleId(roleId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify system roles'
      });
    }

    // Get current role
    const currentRole = await fetchCustomRoleById(roleId, (req.query.establishmentId as string) || req.user!.establishment_id);
    if (!currentRole) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Validate access
    if (!user.is_admin && user.establishment_id !== currentRole.establishment_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to modify this role'
      });
    }

    if (name === undefined && description === undefined && permissions === undefined) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    const updatedRole = await updateCustomRole(roleId, { name, description, permissions });

    await logUpdateCustomRole(
      user.id,
      { roleId, updates: { name, description, permissions }, establishmentId: currentRole.establishment_id },
      req.ip,
      req.headers['user-agent'] as string | undefined
    );

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        permissions: updatedRole.permissions,
        isSystemRole: false,
        establishmentId: updatedRole.establishment_id
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to update custom role',
      error as Error,
      { roleId: req.params.roleId, updates: req.body, userId: req.user?.id },
      'ROLE_ROUTES'
    );
    next(error);
  }
});

/**
 * DELETE /role/:roleId
 * Delete custom role (Admin only)
 */
router.delete('/role/:roleId', requireAuth, requireAdmin, validateParams([
  { param: 'roleId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
]), async (req: any, res: any, next: any) => {
  try {
    const { roleId } = req.params;
    const user = req.user!;

    // Cannot delete system roles
    if (isSystemRoleId(roleId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete system roles'
      });
    }

    // Get role details
    const role = await fetchCustomRoleById(roleId, (req.query.establishmentId as string) || req.user!.establishment_id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Validate access
    if (!user.is_admin && user.establishment_id !== role.establishment_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to delete this role'
      });
    }

    // Check if role is in use
    const roleUserCount = await countUsersWithRole(roleId, role.establishment_id);
    if (roleUserCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete role that is currently assigned to users'
      });
    }

    // Soft delete (deactivate)
    await deactivateCustomRole(roleId);

    await logDeleteCustomRole(
      user.id,
      { roleId, roleName: role.name, establishmentId: role.establishment_id },
      req.ip,
      req.headers['user-agent'] as string | undefined
    );

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    logger?.error(
      'Failed to delete custom role',
      error as Error,
      { roleId: req.params.roleId, userId: req.user?.id },
      'ROLE_ROUTES'
    );
    next(error);
  }
});

/**
 * GET /role-permissions/:roleId
 * Get permissions for a specific role
 */
router.get('/role-permissions/:roleId', requireAuth, validateParams([
  { param: 'roleId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
]), async (req: any, res: any, next: any) => {
  try {
    const { roleId } = req.params;
    const user = req.user!;

    let permissions: RolePermissions;

    // Check if it's a system role
    if (isSystemRoleId(roleId)) {
      permissions = getRolePermissionsForRoleId(roleId)!;
    } else {
      // Check custom roles
      const establishmentId = req.query.establishmentId as string || user.establishment_id;
      
      if (!establishmentId) {
        return res.status(400).json({
          success: false,
          message: 'Establishment ID required for custom roles'
        });
      }

      const roleRow = await fetchCustomRoleById(roleId, establishmentId);
      if (!roleRow || roleRow.is_active === false) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      permissions = roleRow.permissions as RolePermissions;
    }

    res.json({
      success: true,
      data: {
        roleId,
        permissions
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to get role permissions',
      error as Error,
      { roleId: req.params.roleId, userId: req.user?.id },
      'ROLE_ROUTES'
    );
    next(error);
  }
});

export { router as roleRoutes };

