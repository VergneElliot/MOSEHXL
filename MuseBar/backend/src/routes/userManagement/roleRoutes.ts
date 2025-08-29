/**
 * Role Routes - Role Management Operations
 * Handles role definitions, permissions, and role-based access control
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../auth';
import { validateBody, validateParams } from '../../middleware/validation';
import { pool } from '../../app';
import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';
import {
  AuthenticatedRequest,
  Role,
  RolePermissions,
  ServiceInitialization
} from './types';

const router = express.Router();

// Service instances
let logger: Logger;

/**
 * Initialize role routes
 */
export function initializeRoleRoutes(services: ServiceInitialization): void {
  logger = services.logger;
}

/**
 * Default role definitions
 */
const DEFAULT_ROLES: Record<string, Role> = {
  admin: {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: {
      canManageUsers: true,
      canManageEstablishment: true,
      canViewReports: true,
      canManageInventory: true,
      canProcessOrders: true,
      canManageSettings: true
    },
    isSystemRole: true
  },
  manager: {
    id: 'manager',
    name: 'Manager',
    description: 'Management access with most permissions',
    permissions: {
      canManageUsers: true,
      canManageEstablishment: false,
      canViewReports: true,
      canManageInventory: true,
      canProcessOrders: true,
      canManageSettings: false
    },
    isSystemRole: true
  },
  staff: {
    id: 'staff',
    name: 'Staff',
    description: 'Standard staff member with operational access',
    permissions: {
      canManageUsers: false,
      canManageEstablishment: false,
      canViewReports: false,
      canManageInventory: true,
      canProcessOrders: true,
      canManageSettings: false
    },
    isSystemRole: true
  },
  cashier: {
    id: 'cashier',
    name: 'Cashier',
    description: 'Point of sale operations only',
    permissions: {
      canManageUsers: false,
      canManageEstablishment: false,
      canViewReports: false,
      canManageInventory: false,
      canProcessOrders: true,
      canManageSettings: false
    },
    isSystemRole: true
  }
};

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

    // Get custom roles from database
    const customRolesResult = await pool.query(`
      SELECT 
        id,
        name,
        description,
        permissions,
        is_active,
        created_at,
        updated_at
      FROM establishment_roles 
      WHERE establishment_id = $1 AND is_active = true
      ORDER BY name
    `, [establishmentId]);

    // Combine system roles with custom roles
    const systemRoles = Object.values(DEFAULT_ROLES);
    const customRoles: Role[] = customRolesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: row.permissions,
      isSystemRole: false,
      establishmentId
    }));

    const allRoles = [...systemRoles, ...customRoles];

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_ROLES',
      action_details: {
        establishmentId,
        roleCount: allRoles.length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

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
    if (DEFAULT_ROLES[roleId]) {
      const role = DEFAULT_ROLES[roleId];
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

    const roleResult = await pool.query(`
      SELECT 
        id,
        name,
        description,
        permissions,
        is_active,
        created_at,
        updated_at
      FROM establishment_roles 
      WHERE id = $1 AND establishment_id = $2
    `, [roleId, establishmentId]);

    if (roleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const roleData = roleResult.rows[0];
    const role: Role = {
      id: roleData.id,
      name: roleData.name,
      description: roleData.description,
      permissions: roleData.permissions,
      isSystemRole: false,
      establishmentId
    };

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_ROLE_DETAILS',
      action_details: {
        roleId,
        establishmentId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

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
    const existingRole = await pool.query(
      'SELECT id FROM establishment_roles WHERE name = $1 AND establishment_id = $2',
      [name, establishmentId]
    );

    if (existingRole.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }

    // Create role
    const result = await pool.query(`
      INSERT INTO establishment_roles (
        establishment_id,
        name,
        description,
        permissions,
        is_active,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, true, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      establishmentId,
      name,
      description,
      JSON.stringify(permissions),
      user.id
    ]);

    const roleId = result.rows[0].id;

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'CREATE_CUSTOM_ROLE',
      action_details: {
        roleId,
        roleName: name,
        establishmentId,
        permissions
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

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
    if (DEFAULT_ROLES[roleId]) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify system roles'
      });
    }

    // Get current role
    const currentRoleResult = await pool.query(
      'SELECT * FROM establishment_roles WHERE id = $1',
      [roleId]
    );

    if (currentRoleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const currentRole = currentRoleResult.rows[0];

    // Validate access
    if (!user.is_admin && user.establishment_id !== currentRole.establishment_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to modify this role'
      });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (permissions !== undefined) {
      paramCount++;
      updates.push(`permissions = $${paramCount}`);
      values.push(JSON.stringify(permissions));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    // Add updated_at
    paramCount++;
    updates.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    // Add role ID for WHERE clause
    paramCount++;
    values.push(roleId);

    const updateQuery = `
      UPDATE establishment_roles 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    const updatedRole = result.rows[0];

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'UPDATE_CUSTOM_ROLE',
      action_details: {
        roleId,
        updates: { name, description, permissions },
        establishmentId: currentRole.establishment_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

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
    if (DEFAULT_ROLES[roleId]) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete system roles'
      });
    }

    // Get role details
    const roleResult = await pool.query(
      'SELECT * FROM establishment_roles WHERE id = $1',
      [roleId]
    );

    if (roleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const role = roleResult.rows[0];

    // Validate access
    if (!user.is_admin && user.establishment_id !== role.establishment_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to delete this role'
      });
    }

    // Check if role is in use
    const usersWithRole = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role = $1 AND establishment_id = $2',
      [roleId, role.establishment_id]
    );

    if (parseInt(usersWithRole.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete role that is currently assigned to users'
      });
    }

    // Soft delete (deactivate)
    await pool.query(
      'UPDATE establishment_roles SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [roleId]
    );

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'DELETE_CUSTOM_ROLE',
      action_details: {
        roleId,
        roleName: role.name,
        establishmentId: role.establishment_id
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

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
    if (DEFAULT_ROLES[roleId]) {
      permissions = DEFAULT_ROLES[roleId].permissions;
    } else {
      // Check custom roles
      const establishmentId = req.query.establishmentId as string || user.establishment_id;
      
      if (!establishmentId) {
        return res.status(400).json({
          success: false,
          message: 'Establishment ID required for custom roles'
        });
      }

      const roleResult = await pool.query(
        'SELECT permissions FROM establishment_roles WHERE id = $1 AND establishment_id = $2 AND is_active = true',
        [roleId, establishmentId]
      );

      if (roleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      permissions = roleResult.rows[0].permissions;
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

